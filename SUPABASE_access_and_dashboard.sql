-- =============================================
-- Access helper (get_access) + view (optional)
-- =============================================

-- 함수: 사용자의 커뮤니티 접근 권한을 단일 호출로 계산
-- 주의: SECURITY DEFINER로 생성하여 RLS의 복잡한 교차 조회를 우회
--       함수 내부에서 꼭 필요한 최소 컬럼만 조회
create or replace function public.get_access(
  p_user_id uuid,
  p_community_id uuid
)
returns table (
  user_id uuid,
  community_id uuid,
  is_owner boolean,
  member_role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id as user_id,
    p_community_id as community_id,
    (c.owner_id = p_user_id) as is_owner,
    m.role as member_role
  from communities c
  left join community_members m
    on m.community_id = c.id and m.user_id = p_user_id
  where c.id = p_community_id
$$;

-- (선택) 접근 뷰: 조인 결과를 캐시/재사용할 때 유용
create or replace view public.community_user_access as
select
  m.user_id,
  m.community_id,
  (c.owner_id = m.user_id) as is_owner,
  m.role as member_role
from community_members m
join communities c on c.id = m.community_id;

-- 최소 RLS 안전망 예시(이미 활성화되어 있다면 중복 실행 안전):
-- alter table communities enable row level security;
-- alter table community_members enable row level security;
-- 정책은 함수 기반으로 단순화: is_member_or_owner(uid, community_id)


-- =============================================
-- Dashboard Overview RPC (단일 호출로 홈 대시보드 데이터 묶음)
-- =============================================

-- 필요한 경우 확장: 최근 활동 종류 추가, limit 조절
create or replace function public.dashboard_overview(
  p_community_id uuid,
  p_limit int default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_notices jsonb;
  v_events jsonb;
  v_pages jsonb;
  v_recent jsonb;
begin
  -- settings (단건)
  select to_jsonb(s)
  into v_settings
  from community_settings s
  where s.community_id = p_community_id
  limit 1;

  -- notices (pin 우선, 최신순)
  select coalesce(jsonb_agg(n order by n.pinned desc, n.created_at desc), '[]'::jsonb)
  into v_notices
  from (
    select id, community_id, title, pinned, created_at
    from notices
    where community_id = p_community_id
    order by pinned desc, created_at desc
    limit p_limit
  ) n;

  -- upcoming events (5개)
  select coalesce(jsonb_agg(e order by e.start_at asc), '[]'::jsonb)
  into v_events
  from (
    select id, title, start_at
    from community_events
    where community_id = p_community_id
      and start_at > now()
    order by start_at asc
    limit 5
  ) e;

  -- pages (사이드바 등 용도)
  select coalesce(jsonb_agg(p order by p.group_id nulls first, p.position asc), '[]'::jsonb)
  into v_pages
  from (
    select id, title, group_id, position, type
    from community_pages
    where community_id = p_community_id
    order by group_id nulls first, position asc
  ) p;

  -- recent activity (피드/블로그/노트/이벤트/클래스에서 최신 5개 합성)
  -- 주: 여기서는 간단 합성만 수행하고, 무거운 카운트는 배제하여 compute 비용 최소화
  with feed as (
    select id, 'feed' as kind, title, created_at, page_id as meta_id
    from posts
    where community_id = p_community_id
    order by created_at desc
    limit p_limit
  ), blog_pages as (
    select id, title from community_pages where community_id = p_community_id and type = 'blog'
  ), blog as (
    select b.id, 'blog' as kind, b.title, b.created_at, b.page_id as meta_id
    from community_page_blog_posts b
    join blog_pages bp on bp.id = b.page_id
    order by b.created_at desc
    limit p_limit
  ), notes_pages as (
    select id, title from community_pages where community_id = p_community_id and type = 'notes'
  ), notes as (
    select n.id, 'note' as kind, n.title, n.created_at, n.page_id as meta_id
    from community_page_note_items n
    join notes_pages np on np.id = n.page_id
    order by n.created_at desc
    limit p_limit
  ), evt as (
    select id, 'event' as kind, title, created_at, null::uuid as meta_id
    from community_events
    where community_id = p_community_id
    order by created_at desc
    limit p_limit
  ), cls as (
    select id, 'class' as kind, title, created_at, null::uuid as meta_id
    from classes
    where community_id = p_community_id
    order by created_at desc
    limit p_limit
  ), merged as (
    select * from feed
    union all select * from blog
    union all select * from notes
    union all select * from evt
    union all select * from cls
  )
  select coalesce(jsonb_agg(m order by m.created_at desc) -> 0 -> 'id', '[]'::jsonb) -- dummy to force order, ignore
  into v_recent
  from (
    select id, kind, title, created_at, meta_id
    from merged
    order by created_at desc
    limit 5
  ) m;

  return jsonb_build_object(
    'settings', coalesce(v_settings, '{}'::jsonb),
    'notices', coalesce(v_notices, '[]'::jsonb),
    'upcomingEvents', coalesce(v_events, '[]'::jsonb),
    'pages', coalesce(v_pages, '[]'::jsonb),
    'recentActivity', coalesce(v_recent, '[]'::jsonb)
  );
end;
$$;


-- =============================================
-- Counters (posts/comments/members) + triggers
-- =============================================

create table if not exists public.community_counters (
  community_id uuid primary key references communities(id) on delete cascade,
  posts_count int not null default 0,
  comments_count int not null default 0,
  members_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- 보조 함수: upsert helper
create or replace function public.bump_counter(
  p_community_id uuid,
  p_posts_delta int,
  p_comments_delta int,
  p_members_delta int
)
returns void
language plpgsql
security definer
as $$
begin
  insert into community_counters (community_id, posts_count, comments_count, members_count)
  values (p_community_id, greatest(0, p_posts_delta), greatest(0, p_comments_delta), greatest(0, p_members_delta))
  on conflict (community_id)
  do update set
    posts_count = greatest(0, community_counters.posts_count + excluded.posts_count),
    comments_count = greatest(0, community_counters.comments_count + excluded.comments_count),
    members_count = greatest(0, community_counters.members_count + excluded.members_count),
    updated_at = now();
end;
$$;

-- 트리거: posts
create or replace function public.trg_posts_counter()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform bump_counter(new.community_id, 1, 0, 0);
  elsif tg_op = 'DELETE' then
    perform bump_counter(old.community_id, -1, 0, 0);
  end if;
  return null;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'posts_counter'
  ) then
    create trigger posts_counter after insert or delete on public.posts
    for each row execute function public.trg_posts_counter();
  end if;
end $$;

-- 트리거: comments
create or replace function public.trg_comments_counter()
returns trigger
language plpgsql
as $$
declare v_comm_id uuid;
begin
  if tg_op = 'INSERT' then
    select p.community_id into v_comm_id from posts p where p.id = new.post_id;
    if v_comm_id is not null then perform bump_counter(v_comm_id, 0, 1, 0); end if;
  elsif tg_op = 'DELETE' then
    select p.community_id into v_comm_id from posts p where p.id = old.post_id;
    if v_comm_id is not null then perform bump_counter(v_comm_id, 0, -1, 0); end if;
  end if;
  return null;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'comments_counter'
  ) then
    create trigger comments_counter after insert or delete on public.comments
    for each row execute function public.trg_comments_counter();
  end if;
end $$;

-- 트리거: community_members (pending은 카운트 제외)
create or replace function public.trg_members_counter()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'pending' then
      perform bump_counter(new.community_id, 0, 0, 1);
    end if;
  elsif tg_op = 'UPDATE' then
    if coalesce(old.role, 'pending') = 'pending' and coalesce(new.role, 'pending') <> 'pending' then
      perform bump_counter(new.community_id, 0, 0, 1);
    elsif coalesce(old.role, 'pending') <> 'pending' and coalesce(new.role, 'pending') = 'pending' then
      perform bump_counter(new.community_id, 0, 0, -1);
    end if;
  elsif tg_op = 'DELETE' then
    if old.role is distinct from 'pending' then
      perform bump_counter(old.community_id, 0, 0, -1);
    end if;
  end if;
  return null;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'community_members_counter'
  ) then
    create trigger community_members_counter after insert or update or delete on public.community_members
    for each row execute function public.trg_members_counter();
  end if;
end $$;


-- =============================================
-- Performance Indexes (신중: 필요한 것만 추가)
-- =============================================

-- 멤버십 확인에 핵심
create index if not exists idx_community_members_comm_user on public.community_members(community_id, user_id);
create index if not exists idx_community_members_comm_role on public.community_members(community_id, role);

-- 게시물/알림 정렬
create index if not exists idx_posts_comm_pinned_created on public.posts(community_id, pinned desc, created_at desc);
create index if not exists idx_notices_comm_pinned_created on public.notices(community_id, pinned desc, created_at desc);

-- 이벤트: 부분 인덱스 WHERE 절에 now()는 IMMUTABLE이 아니므로 사용 불가
-- 범용 복합 인덱스로 대체하여 `where community_id = ? and start_at > now()`에 사용되도록 함
create index if not exists idx_events_comm_start_at on public.community_events(community_id, start_at);

-- 페이지 그룹/정렬
create index if not exists idx_pages_comm_group_pos on public.community_pages(community_id, group_id, position);

-- 클래스/카테고리
create index if not exists idx_classes_comm_created on public.classes(community_id, created_at desc);
create index if not exists idx_class_categories_comm_created on public.class_categories(community_id, created_at);

-- 블로그 포스트
create index if not exists idx_blog_posts_page_created on public.community_page_blog_posts(page_id, created_at desc);

-- 프로필 조회 in(id) 빈번
create index if not exists idx_profiles_id on public.profiles(id);

-- 주의사항:
-- - 인덱스는 쓰기 성능에 영향을 주므로, 실제 쿼리 플랜과 사용 빈도 기준으로 엄선하여 적용
-- - 필요 없거나 중복되는 인덱스는 생성하지 말 것
-- - ANALYZE 주기적으로 수행, autovacuum 설정 확인


-- =============================================
-- Minimal RLS policies for feed tables
-- =============================================

-- Posts
alter table public.posts enable row level security;

-- 멤버/오너는 읽기 가능
drop policy if exists posts_members_can_select on public.posts;
create policy posts_members_can_select
on public.posts for select
using (
  exists (
    select 1 from public.community_members m
    where m.community_id = posts.community_id
      and m.user_id = auth.uid()
      and coalesce(m.role, 'member') <> 'pending'
  )
  or exists (
    select 1 from public.communities c
    where c.id = posts.community_id and c.owner_id = auth.uid()
  )
);

-- 멤버/오너는 자신의 글을 작성 가능
drop policy if exists posts_members_can_insert on public.posts;
create policy posts_members_can_insert
on public.posts for insert
with check (
  auth.uid() = user_id and (
    exists (
      select 1 from public.community_members m
      where m.community_id = posts.community_id
        and m.user_id = auth.uid()
        and coalesce(m.role, 'member') <> 'pending'
    )
    or exists (
      select 1 from public.communities c
      where c.id = posts.community_id and c.owner_id = auth.uid()
    )
  )
);

-- 작성자 또는 오너는 수정/삭제 가능 (오너는 공지 고정 등 운영 목적)
drop policy if exists posts_author_or_owner_update on public.posts;
create policy posts_author_or_owner_update
on public.posts for update
using (
  auth.uid() = user_id or exists (select 1 from public.communities c where c.id = posts.community_id and c.owner_id = auth.uid())
);

drop policy if exists posts_author_or_owner_delete on public.posts;
create policy posts_author_or_owner_delete
on public.posts for delete
using (
  auth.uid() = user_id or exists (select 1 from public.communities c where c.id = posts.community_id and c.owner_id = auth.uid())
);


-- Comments
alter table public.comments enable row level security;

drop policy if exists comments_members_can_select on public.comments;
create policy comments_members_can_select
on public.comments for select
using (
  exists (
    select 1 from public.posts p
    join public.community_members m on m.community_id = p.community_id and m.user_id = auth.uid()
    where p.id = comments.post_id and coalesce(m.role, 'member') <> 'pending'
  )
  or exists (
    select 1 from public.posts p
    join public.communities c on c.id = p.community_id
    where p.id = comments.post_id and c.owner_id = auth.uid()
  )
);

drop policy if exists comments_members_can_insert on public.comments;
create policy comments_members_can_insert
on public.comments for insert
with check (
  auth.uid() = user_id and (
    exists (
      select 1 from public.posts p
      join public.community_members m on m.community_id = p.community_id and m.user_id = auth.uid()
      where p.id = comments.post_id and coalesce(m.role, 'member') <> 'pending'
    )
    or exists (
      select 1 from public.posts p
      join public.communities c on c.id = p.community_id
      where p.id = comments.post_id and c.owner_id = auth.uid()
    )
  )
);

drop policy if exists comments_author_or_owner_update on public.comments;
create policy comments_author_or_owner_update
on public.comments for update
using (
  auth.uid() = user_id or exists (
    select 1 from public.posts p join public.communities c on c.id = p.community_id
    where p.id = comments.post_id and c.owner_id = auth.uid()
  )
);

drop policy if exists comments_author_or_owner_delete on public.comments;
create policy comments_author_or_owner_delete
on public.comments for delete
using (
  auth.uid() = user_id or exists (
    select 1 from public.posts p join public.communities c on c.id = p.community_id
    where p.id = comments.post_id and c.owner_id = auth.uid()
  )
);


-- Post Likes (집계용 조회 + 내 좋아요 삽입/삭제)
alter table if exists public.post_likes enable row level security;

drop policy if exists likes_members_can_select on public.post_likes;
create policy likes_members_can_select
on public.post_likes for select
using (
  exists (
    select 1 from public.posts p
    join public.community_members m on m.community_id = p.community_id and m.user_id = auth.uid()
    where p.id = post_likes.post_id and coalesce(m.role, 'member') <> 'pending'
  )
  or exists (
    select 1 from public.posts p
    join public.communities c on c.id = p.community_id
    where p.id = post_likes.post_id and c.owner_id = auth.uid()
  )
);

drop policy if exists likes_user_can_insert on public.post_likes;
create policy likes_user_can_insert
on public.post_likes for insert
with check (
  auth.uid() = user_id and exists (
    select 1 from public.posts p
    join public.community_members m on m.community_id = p.community_id and m.user_id = auth.uid()
    where p.id = post_likes.post_id and coalesce(m.role, 'member') <> 'pending'
  )
);

drop policy if exists likes_user_can_delete on public.post_likes;
create policy likes_user_can_delete
on public.post_likes for delete
using (
  auth.uid() = user_id
);


-- =============================================
-- Feed Overview RPC
-- =============================================

-- posts + profiles + like/comment counts를 단일 호출로 반환
-- page_id 필터, limit/offset 지원, content는 제한 길이로 반환하여 페이로드 축소
create or replace function public.feed_overview(
  p_community_id uuid,
  p_page_id uuid default null,
  p_limit int default 10,
  p_offset int default 0,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_posts jsonb;
  v_total int := 0;
begin
  -- 대상 포스트 서브셋 (정렬/필드 최소화)
  with posts_sub as (
    select p.id, p.title,
           case when length(coalesce(p.content,'')) > 500 then left(p.content, 500) else coalesce(p.content,'') end as content,
           p.created_at, p.user_id, p.page_id, p.category_id, p.pinned, p.views
    from posts p
    where p.community_id = p_community_id
      and (p_page_id is null or p.page_id is not distinct from p_page_id)
      and (
        p_cursor_created_at is null or
        (p.created_at < p_cursor_created_at) or
        (p.created_at = p_cursor_created_at and (p_cursor_id is null or p.id < p_cursor_id))
      )
    order by p.pinned desc, p.created_at desc
    limit greatest(1, p_limit) offset greatest(0, p_offset)
  ),
  cnt as (
    select count(*)::int as total
    from posts p
    where p.community_id = p_community_id
      and (p_page_id is null or p.page_id is not distinct from p_page_id)
  ),
  like_counts as (
    select l.post_id, count(*)::int as c
    from post_likes l
    join posts_sub s on s.id = l.post_id
    group by l.post_id
  ),
  comment_counts as (
    select c.post_id, count(*)::int as c
    from comments c
    join posts_sub s on s.id = c.post_id
    group by c.post_id
  ),
  authors as (
    select pr.id, pr.full_name, pr.username, pr.avatar_url, pr.updated_at
    from profiles pr
    where pr.id in (select distinct user_id from posts_sub)
  )
  select jsonb_build_object(
    'posts', coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'content', s.content,
      'created_at', s.created_at,
      'user_id', s.user_id,
      'page_id', s.page_id,
      'category_id', s.category_id,
      'pinned', s.pinned,
      'views', s.views,
      'author', (select to_jsonb(a) from authors a where a.id = s.user_id),
      'counts', jsonb_build_object(
        'likes', coalesce((select lc.c from like_counts lc where lc.post_id = s.id), 0),
        'comments', coalesce((select cc.c from comment_counts cc where cc.post_id = s.id), 0)
      )
    ) order by s.pinned desc, s.created_at desc), '[]'::jsonb),
    'totalCount', (select total from cnt)
  )
  into v_posts
  from posts_sub s;

  -- next cursor 계산: 마지막 created_at,id
  return coalesce(
    (
      select v_posts || jsonb_build_object(
        'nextCursor', (
          select jsonb_build_object('created_at', s.created_at, 'id', s.id)
          from posts_sub s order by s.created_at desc, s.id desc limit 1 offset greatest(0, (select jsonb_array_length((v_posts->'posts')::jsonb)) - 1)
        )
      )
    ),
    jsonb_build_object('posts','[]'::jsonb,'totalCount',0,'nextCursor', null)
  );
end;
$$;


-- =============================================
-- Blog Overview RPC (단일 페이지 기준)
-- =============================================

create or replace function public.blog_overview(
  p_page_id uuid,
  p_limit int default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_comm_id uuid;
  v_slug text;
  v_brand text;
  v_payload jsonb;
begin
  select cp.community_id into v_comm_id from community_pages cp where cp.id = p_page_id;
  if v_comm_id is null then
    return jsonb_build_object('posts','[]'::jsonb,'slug',null,'brandColor',null);
  end if;

  select c.slug into v_slug from communities c where c.id = v_comm_id;
  select s.brand_color into v_brand from community_settings s where s.community_id = v_comm_id;

  with posts_sub as (
    select b.id, b.title,
           case when length(coalesce(b.content,'')) > 500 then left(b.content, 500) else coalesce(b.content,'') end as content,
           b.thumbnail_url, b.created_at, b.user_id, b.pinned, b.views
    from community_page_blog_posts b
    where b.page_id = p_page_id
      and (
        p_cursor_created_at is null or
        (b.created_at < p_cursor_created_at) or
        (b.created_at = p_cursor_created_at and (p_cursor_id is null or b.id < p_cursor_id))
      )
    order by b.pinned desc, b.created_at desc
    limit greatest(1, p_limit)
  ),
  authors as (
    select pr.id, pr.full_name, pr.username, pr.avatar_url, pr.updated_at
    from profiles pr where pr.id in (select distinct user_id from posts_sub)
  ),
  like_counts as (
    select l.post_id, count(*)::int as c from community_page_blog_likes l join posts_sub s on s.id = l.post_id group by l.post_id
  ),
  comment_counts as (
    select c.post_id, count(*)::int as c from community_page_blog_comments c join posts_sub s on s.id = c.post_id group by c.post_id
  )
  select jsonb_build_object(
    'posts', coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'content', s.content,
      'thumbnail_url', s.thumbnail_url,
      'created_at', s.created_at,
      'user_id', s.user_id,
      'pinned', s.pinned,
      'views', s.views,
      'author', (select to_jsonb(a) from authors a where a.id = s.user_id),
      'counts', jsonb_build_object(
        'likes', coalesce((select lc.c from like_counts lc where lc.post_id = s.id), 0),
        'comments', coalesce((select cc.c from comment_counts cc where cc.post_id = s.id), 0)
      )
    ) order by s.pinned desc, s.created_at desc), '[]'::jsonb),
    'slug', v_slug,
    'brandColor', v_brand
  )
  into v_payload
  from posts_sub s;

  return coalesce(
    (
      select v_payload || jsonb_build_object(
        'nextCursor', (
          select jsonb_build_object('created_at', s.created_at, 'id', s.id)
          from posts_sub s order by s.created_at desc, s.id desc limit 1 offset greatest(0, (select jsonb_array_length((v_payload->'posts')::jsonb)) - 1)
        )
      )
    ),
    jsonb_build_object('posts','[]'::jsonb,'slug',v_slug,'brandColor',v_brand,'nextCursor', null)
  );
end;
$$;

-- =============================================
-- Classes Overview RPC (카테고리 + 클래스 + 작성자 + 내 수강여부)
-- =============================================

create or replace function public.classes_overview(
  p_community_id uuid,
  p_category_id uuid default null,
  p_user_id uuid default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_categories jsonb;
  v_classes jsonb;
begin
  -- 카테고리
  select coalesce(jsonb_agg(c order by c.created_at asc), '[]'::jsonb)
  into v_categories
  from (
    select id, community_id, name, created_at
    from class_categories
    where community_id = p_community_id
    order by created_at asc
  ) c;

  -- 클래스 목록 (필요 필드 최소 선택)
  with cls as (
    select id, community_id, category_id, title, description, thumbnail_url, youtube_url, user_id, views, created_at
    from classes
    where community_id = p_community_id
      and (p_category_id is null or category_id is not distinct from p_category_id)
      and (
        p_cursor_created_at is null or
        (created_at < p_cursor_created_at) or
        (created_at = p_cursor_created_at and (p_cursor_id is null or id < p_cursor_id))
      )
    order by created_at desc
    limit greatest(1, p_limit)
  ), authors as (
    select pr.id, pr.full_name, pr.username, pr.avatar_url, pr.updated_at
    from profiles pr where pr.id in (select distinct user_id from cls)
  ), enroll as (
    select e.class_id, bool_or(coalesce(e.completed,false)) as completed
    from class_enrollments e
    where p_user_id is not null and e.user_id = p_user_id and e.class_id in (select id from cls)
    group by e.class_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'community_id', c.community_id,
    'category_id', c.category_id,
    'title', c.title,
    'description', c.description,
    'thumbnail_url', c.thumbnail_url,
    'youtube_url', c.youtube_url,
    'user_id', c.user_id,
    'views', c.views,
    'created_at', c.created_at,
    'author', (select to_jsonb(a) from authors a where a.id = c.user_id),
    'completed', coalesce((select e.completed from enroll e where e.class_id = c.id), false)
  ) order by c.created_at desc), '[]'::jsonb)
  into v_classes
  from cls c;

  return (
    select jsonb_build_object(
      'categories', coalesce(v_categories,'[]'::jsonb),
      'classes', coalesce(v_classes,'[]'::jsonb),
      'nextCursor', (
        select jsonb_build_object('created_at', c.created_at, 'id', c.id)
        from cls c order by c.created_at desc, c.id desc limit 1 offset greatest(0, (select jsonb_array_length(v_classes)) - 1)
      )
    )
  );
end;
$$;


