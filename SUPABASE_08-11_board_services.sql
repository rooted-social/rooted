-- Supabase schema for Board, Notices, Settings, Likes, Services (RLS 미적용)
-- 실행 순서: 본 파일 전체를 한 번에 실행하면 됩니다.

-- 확장
create extension if not exists pgcrypto;

-- 게시판 카테고리 (트리)
create table if not exists public.board_categories (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  parent_id uuid references public.board_categories(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 게시글
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.board_categories(id) on delete set null,
  title text not null,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 댓글
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 공지사항
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- 커뮤니티 설정/소개
create table if not exists public.community_settings (
  community_id uuid primary key references public.communities(id) on delete cascade,
  mission text,
  about text,
  banner_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- 좋아요
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- 제공 서비스
create table if not exists public.community_services (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

-- updated_at 트리거 함수
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
  before update on public.comments
  for each row execute procedure public.set_updated_at();

drop trigger if exists community_settings_set_updated_at on public.community_settings;
create trigger community_settings_set_updated_at
  before update on public.community_settings
  for each row execute procedure public.set_updated_at();

-- 샘플 데이터 (선택): 특정 커뮤니티(slug = '12312')에 mission/서비스/카테고리 생성
-- 필요시 주석 해제 후 실행
-- do $$
-- declare cid uuid;
-- begin
--   select id into cid from public.communities where slug = '12312' limit 1;
--   if cid is not null then
--     insert into public.community_settings (community_id, mission, about)
--     values (cid, '함께 성장하는 커뮤니티를 만들어요', '지식 공유와 네트워킹을 지원합니다.')
--     on conflict (community_id) do update set mission = excluded.mission, about = excluded.about;
--
--     insert into public.board_categories (community_id, name, position) values (cid, '공지/뉴스', 0) on conflict do nothing;
--     insert into public.board_categories (community_id, name, position) values (cid, '일반', 1) on conflict do nothing;
--     insert into public.board_categories (community_id, name, position) values (cid, 'Q&A', 2) on conflict do nothing;
--
--     insert into public.community_services (community_id, label) values (cid, '전문가와의 직접 소통') on conflict do nothing;
--     insert into public.community_services (community_id, label) values (cid, '실무 경험 공유') on conflict do nothing;
--   end if;
-- end $$;


-- =============================
-- 알림(Notifications) 스키마 추가
-- 요구사항:
--  - 사용자가 원하는 활동만 알림을 받도록 설정
--  - 커뮤니티 가입 시 환영 알림
--  - 커뮤니티 생성 시 축하 알림
--  - 내가 작성한 글에 댓글이 달릴 시 댓글 알림
--  - RLS 포함
-- =============================

-- 알림 타입(고정 값 테이블은 선택사항이지만, enum 텍스트로 단순화)

-- 사용자별 알림 환경설정
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- 알림 채널 (확장 여지)
  web_enabled boolean not null default true,
  -- 활동별 설정
  enable_welcome_on_join boolean not null default true,
  enable_congrats_on_create boolean not null default true,
  enable_comment_on_my_post boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 알림 엔티티
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  -- 알림 분류
  type text not null check (type in (
    'community_join_welcome',
    'community_create_congrats',
    'comment_on_my_post'
  )),
  -- 관련 리소스 참조 (nullable)
  community_id uuid references public.communities(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null, -- 행위 주체
  -- 표시용 텍스트/메타
  title text,
  message text,
  -- 읽음/상태
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- preferences.updated_at 트리거
create or replace function public.set_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_preferences_updated_at();

-- 환경설정 조회 함수 (존재하지 않으면 기본값 리턴)
create or replace function public.get_notification_pref(u_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(to_jsonb(p), jsonb_build_object(
    'user_id', u_id,
    'web_enabled', true,
    'enable_welcome_on_join', true,
    'enable_congrats_on_create', true,
    'enable_comment_on_my_post', true
  ))
  from public.notification_preferences p
  where p.user_id = u_id;
$$;

-- 환경설정 체크 헬퍼 (boolean)
create or replace function public.is_pref_enabled(u_id uuid, key text)
returns boolean
language plpgsql
stable
as $$
declare
  prefs jsonb;
begin
  prefs := public.get_notification_pref(u_id);
  if not (prefs->>'web_enabled')::boolean then
    return false;
  end if;
  return coalesce((prefs->>key)::boolean, true);
end;
$$;

-- 알림 삽입 유틸
create or replace function public.enqueue_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_community_id uuid default null,
  p_post_id uuid default null,
  p_comment_id uuid default null,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.notifications (
    recipient_id, type, title, message,
    community_id, post_id, comment_id, actor_id
  ) values (
    p_recipient_id, p_type, p_title, p_message,
    p_community_id, p_post_id, p_comment_id, p_actor_id
  ) returning id into new_id;
  return new_id;
end;
$$;

-- 트리거: 커뮤니티 생성 → 축하 알림 (소유자에게)
drop trigger if exists trg_communities_notify_congrats on public.communities;
drop function if exists public.fn_notify_congrats_on_create cascade;
create or replace function public.fn_notify_congrats_on_create()
returns trigger as $$
declare
  owner uuid;
  title_txt text;
  msg_txt text;
begin
  owner := new.owner_id;
  if owner is null then return new; end if;
  if not public.is_pref_enabled(owner, 'enable_congrats_on_create') then
    return new;
  end if;
  title_txt := '새 커뮤니티가 생성되었습니다';
  msg_txt := coalesce(new.name, '커뮤니티') || ' 생성을 축하합니다!';
  perform public.enqueue_notification(owner, 'community_create_congrats', title_txt, msg_txt, new.id, null, null, owner);
  return new;
end;
$$ language plpgsql;

create trigger trg_communities_notify_congrats
after insert on public.communities
for each row execute procedure public.fn_notify_congrats_on_create();

-- 트리거: 커뮤니티 가입 → 환영 알림 (가입자에게)
drop trigger if exists trg_members_notify_welcome on public.community_members;
drop function if exists public.fn_notify_welcome_on_join cascade;
create or replace function public.fn_notify_welcome_on_join()
returns trigger as $$
declare
  title_txt text;
  msg_txt text;
  cname text;
begin
  -- 승인 대기(pending)인 경우에는 알림 보류 (원하면 제거 가능)
  if new.role is not null and new.role = 'pending' then
    return new;
  end if;
  if not public.is_pref_enabled(new.user_id, 'enable_welcome_on_join') then
    return new;
  end if;
  select name into cname from public.communities where id = new.community_id;
  title_txt := '커뮤니티에 가입했습니다';
  msg_txt := coalesce(cname, '커뮤니티') || '에 오신 것을 환영합니다!';
  perform public.enqueue_notification(new.user_id, 'community_join_welcome', title_txt, msg_txt, new.community_id, null, null, new.user_id);
  return new;
end;
$$ language plpgsql;

create trigger trg_members_notify_welcome
after insert on public.community_members
for each row execute procedure public.fn_notify_welcome_on_join();

-- 트리거: 댓글 작성 → 글 작성자에게 댓글 알림
drop trigger if exists trg_comments_notify_author on public.comments;
drop function if exists public.fn_notify_comment_on_post cascade;
create or replace function public.fn_notify_comment_on_post()
returns trigger as $$
declare
  post_author uuid;
  post_title text;
  actor uuid;
  title_txt text;
  msg_txt text;
begin
  select user_id, title into post_author, post_title from public.posts where id = new.post_id;
  actor := new.user_id;
  if post_author is null then return new; end if;
  -- 자기 댓글은 알림 생략
  if post_author = actor then return new; end if;
  if not public.is_pref_enabled(post_author, 'enable_comment_on_my_post') then
    return new;
  end if;
  title_txt := '내 글에 새 댓글이 달렸습니다';
  msg_txt := coalesce(post_title, '게시글') || '에 댓글이 달렸습니다.';
  perform public.enqueue_notification(post_author, 'comment_on_my_post', title_txt, msg_txt, null, new.post_id, new.id, actor);
  return new;
end;
$$ language plpgsql;

create trigger trg_comments_notify_author
after insert on public.comments
for each row execute procedure public.fn_notify_comment_on_post();

-- RLS 정책
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- notifications: 본인 것만 조회/수정, 시스템 삽입 허용
drop policy if exists "select_own_notifications" on public.notifications;
create policy "select_own_notifications" on public.notifications
for select using (auth.uid() = recipient_id);

drop policy if exists "update_own_notifications" on public.notifications;
create policy "update_own_notifications" on public.notifications
for update using (auth.uid() = recipient_id);

-- 시스템 함수(enqueue_notification)는 security definer로 삽입
-- 일반 사용자의 직접 insert는 차단 (원하면 허용 가능)
drop policy if exists "insert_none_notifications" on public.notifications;
create policy "insert_none_notifications" on public.notifications
for insert with check (false);

-- preferences: 본인 행만 조회/업서트
drop policy if exists "select_own_prefs" on public.notification_preferences;
create policy "select_own_prefs" on public.notification_preferences
for select using (auth.uid() = user_id);

drop policy if exists "upsert_own_prefs" on public.notification_preferences;
create policy "upsert_own_prefs" on public.notification_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- =============================
-- 커뮤니티 캘린더 (Events)
-- =============================
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  color text not null default '#a5b4fc',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.community_events enable row level security;

drop policy if exists "select_events_in_community" on public.community_events;
create policy "select_events_in_community" on public.community_events
for select using (true);

drop policy if exists "insert_events_by_members" on public.community_events;
create policy "insert_events_by_members" on public.community_events
for insert with check (
  auth.uid() = created_by
);

drop policy if exists "update_events_by_creator" on public.community_events;
create policy "update_events_by_creator" on public.community_events
for update using (
  auth.uid() = created_by
);
-- =============================
-- 커뮤니티 클래스 (Categories, Classes)
-- =============================
create table if not exists public.class_categories (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  category_id uuid references public.class_categories(id) on delete set null,
  title text not null,
  description text,
  thumbnail_url text,
  youtube_url text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.class_categories enable row level security;
alter table public.classes enable row level security;

-- 누구나 조회 가능(필요시 정책 강화)
drop policy if exists "select_class_categories" on public.class_categories;
create policy "select_class_categories" on public.class_categories for select using (true);

drop policy if exists "select_classes" on public.classes;
create policy "select_classes" on public.classes for select using (true);

-- 생성/수정/삭제는 로그인 사용자(간단 기준)
drop policy if exists "manage_class_categories" on public.class_categories;
create policy "manage_class_categories" on public.class_categories for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "manage_classes" on public.classes;
create policy "manage_classes" on public.classes for all using (auth.uid() is not null) with check (auth.uid() is not null);


drop policy if exists "delete_events_by_creator" on public.community_events;
create policy "delete_events_by_creator" on public.community_events
for delete using (
  auth.uid() = created_by
);











