# 기존 profiles 테이블을 위한 Supabase 설정

## 1. 기존 테이블에 필드 추가 (필요한 경우)

```sql
-- full_name 컬럼이 없다면 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- bio 컬럼이 없다면 추가  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- updated_at 컬럼이 없다면 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## 2. Row Level Security 정책 설정

```sql
-- RLS 활성화 (이미 활성화되어 있다면 에러가 나지만 무시해도 됨)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성 (정책이 이미 있는 경우)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 새 정책 생성
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);
```

## 3. 회원가입 시 자동 프로필 생성 트리거

```sql
-- 기존 함수와 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 새 사용자 생성 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 4. updated_at 자동 업데이트 트리거

```sql
-- 기존 트리거와 함수 삭제 후 재생성
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 테이블에 updated_at 트리거 추가
CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

## 5. 기존 사용자를 위한 프로필 생성 (한 번만 실행)

```sql
-- 기존 auth.users에 있지만 profiles에 없는 사용자들을 위한 프로필 생성
INSERT INTO public.profiles (id, username, full_name, avatar_url)
SELECT 
  auth.users.id,
  auth.users.raw_user_meta_data->>'username',
  auth.users.raw_user_meta_data->>'full_name',
  auth.users.raw_user_meta_data->>'avatar_url'
FROM auth.users
LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
WHERE public.profiles.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

## 08.01 커뮤니티 테이블과 커뮤니티 멤버 테이블

```sql
-- 커뮤니티 테이블
create table communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  slug text not null unique,
  category text not null,
  image_url text,
  owner_id uuid not null references auth.users(id),
  member_count int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 커뮤니티 멤버 테이블
create table community_members (
  id uuid default gen_random_uuid() primary key,
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(community_id, user_id)
);

-- 커뮤니티 생성 시 자동으로 owner를 멤버로 추가
create or replace function public.handle_new_community()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_community_created
  after insert on public.communities
  for each row execute procedure public.handle_new_community();

-- RLS 정책 설정
alter table communities enable row level security;
alter table community_members enable row level security;

-- 커뮤니티 조회 정책
create policy "커뮤니티는 누구나 조회 가능"
  on communities for select
  to authenticated, anon
  using (true);

-- 커뮤니티 생성 정책
create policy "인증된 사용자만 커뮤니티 생성 가능"
  on communities for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- 커뮤니티 수정 정책
create policy "소유자만 커뮤니티 수정 가능"
  on communities for update
  to authenticated
  using (auth.uid() = owner_id);

-- 커뮤니티 삭제 정책
create policy "소유자만 커뮤니티 삭제 가능"
  on communities for delete
  to authenticated
  using (auth.uid() = owner_id);

-- 커뮤니티 멤버 조회 정책
create policy "커뮤니티 멤버는 누구나 조회 가능"
  on community_members for select
  to authenticated, anon
  using (true);

-- 커뮤니티 멤버 추가 정책
create policy "인증된 사용자만 멤버 가입 가능"
  on community_members for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 커뮤니티 멤버 수정 정책
create policy "관리자와 본인만 멤버 정보 수정 가능"
  on community_members for update
  to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from community_members
      where community_id = community_members.community_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- 커뮤니티 멤버 삭제 정책
create policy "관리자와 본인만 멤버 삭제 가능"
  on community_members for delete
  to authenticated
  using (
    auth.uid() = user_id or
    exists (
      select 1 from community_members
      where community_id = community_members.community_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- 멤버 수 자동 업데이트 함수
create or replace function public.update_community_member_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update communities
    set member_count = member_count + 1
    where id = new.community_id;
  elsif (TG_OP = 'DELETE') then
    update communities
    set member_count = member_count - 1
    where id = old.community_id;
  end if;
  return null;
end;
$$;

create trigger on_community_member_changed
  after insert or delete on public.community_members
  for each row execute procedure public.update_community_member_count();
```

 ## 08월11일 게시판(posts), 댓글(comments), 공지(notices), 커뮤니티 설정(community_settings)

```sql
-- 확장 설치 (uuid 등)
create extension if not exists pgcrypto;

-- 게시글 테이블
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid references public.community_pages(id) on delete set null, -- 페이지 스코프 게시글(피드형)
  title text not null,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 댓글 테이블
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 공지사항 테이블
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- 커뮤니티 소개/설정 테이블
create table if not exists public.community_settings (
  community_id uuid primary key references public.communities(id) on delete cascade,
  mission text,
  about text,
  banner_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

-- 게시판 카테고리(트리)
create table if not exists public.board_categories (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  parent_id uuid references public.board_categories(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 포스트에 카테고리 연결 컬럼 추가
alter table public.posts add column if not exists category_id uuid references public.board_categories(id) on delete set null;

-- updated_at 자동 갱신 함수
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute procedure public.set_updated_at();

create trigger community_settings_set_updated_at
  before update on public.community_settings
  for each row execute procedure public.set_updated_at();

-- RLS 활성화
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.notices enable row level security;
alter table public.community_settings enable row level security;
alter table public.board_categories enable row level security;

-- 정책: 조회는 모두 허용
create policy if not exists "posts are viewable by everyone" on public.posts for select using (true);
create policy if not exists "comments are viewable by everyone" on public.comments for select using (true);
create policy if not exists "notices are viewable by everyone" on public.notices for select using (true);
create policy if not exists "settings are viewable by everyone" on public.community_settings for select using (true);
create policy if not exists "board categories are viewable by everyone" on public.board_categories for select using (true);

-- 정책: 생성은 인증 사용자만, 자신 소유로 제한
create policy if not exists "users can insert own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "users can insert own comments" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "users can insert own notices" on public.notices for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "owners can insert settings" on public.community_settings for insert to authenticated with check (
  exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
);
create policy if not exists "owners or admins can insert categories" on public.board_categories for insert to authenticated with check (
  exists (
    select 1 from public.community_members m where m.community_id = board_categories.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
create policy if not exists "owners or admins can update categories" on public.board_categories for update to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = board_categories.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
create policy if not exists "owners or admins can delete categories" on public.board_categories for delete to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = board_categories.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- 좋아요 테이블
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy if not exists "likes are viewable by everyone" on public.post_likes for select using (true);
create policy if not exists "users can like/unlike" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "users can remove their like" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

-- 게시글 작성자 Join 없이 author 프로필을 합치고 싶다면 View를 만들어도 됨(옵션)

-- 제공 서비스 테이블
create table if not exists public.community_services (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);
alter table public.community_services enable row level security;
create policy if not exists "services are viewable by everyone" on public.community_services for select using (true);
create policy if not exists "owners or admins manage services" on public.community_services for all to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = community_services.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- 정책: 수정/삭제는 작성자 또는 커뮤니티 관리자만
create policy if not exists "authors or admins can update posts" on public.posts for update to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.community_members m where m.community_id = posts.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
create policy if not exists "authors or admins can delete posts" on public.posts for delete to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.community_members m where m.community_id = posts.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy if not exists "authors or admins can update comments" on public.comments for update to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.community_members m join public.posts p on p.id = comments.post_id where m.community_id = p.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
create policy if not exists "authors or admins can delete comments" on public.comments for delete to authenticated using (
  auth.uid() = user_id or exists (
    select 1 from public.community_members m join public.posts p on p.id = comments.post_id where m.community_id = p.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy if not exists "owners or admins can manage notices" on public.notices for all to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = notices.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy if not exists "owners can manage settings" on public.community_settings for all to authenticated using (
  exists (
    select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid()
  )
);
create policy if not exists "owners or admins can manage categories" on public.board_categories for all to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = board_categories.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
```

## 커뮤니티 커스텀 페이지/그룹 스키마 추가 (사이드바 관리)

```sql
-- 커스텀 페이지 그룹
create table if not exists public.community_page_groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 커스텀 페이지 (피드와 유사한 포스팅 영역을 연결할 수 있는 페이지)
create table if not exists public.community_pages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  slug text,
  group_id uuid references public.community_page_groups(id) on delete set null,
  type text not null default 'feed', -- feed | notes | gallery 등
  banner_url text,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_page_groups enable row level security;
alter table public.community_pages enable row level security;

-- 조회 모두 허용
create policy if not exists "page groups are viewable by everyone" on public.community_page_groups for select using (true);
create policy if not exists "pages are viewable by everyone" on public.community_pages for select using (true);

-- 페이지 타입별 전용 콘텐츠 테이블
-- 1) 노트 페이지: 단일 본문 저장
create table if not exists public.community_page_notes (
  page_id uuid primary key references public.community_pages(id) on delete cascade,
  content text not null default ''::text,
  updated_at timestamptz not null default now()
);
alter table public.community_page_notes enable row level security;
create policy if not exists "page notes viewable" on public.community_page_notes for select using (true);
create policy if not exists "page notes editable by admins" on public.community_page_notes for all to authenticated using (
  exists (
    select 1 from public.community_pages p
    join public.communities c on c.id = p.community_id
    join public.community_members m on m.community_id = c.id and m.user_id = auth.uid() and m.role in ('owner','admin')
    where p.id = community_page_notes.page_id
  )
);

-- 2) 갤러리 페이지: 이미지 아이템 목록
create table if not exists public.community_page_gallery_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.community_pages(id) on delete cascade,
  image_url text not null,
  caption text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.community_page_gallery_items enable row level security;
create policy if not exists "gallery viewable" on public.community_page_gallery_items for select using (true);
create policy if not exists "gallery editable by admins" on public.community_page_gallery_items for all to authenticated using (
  exists (
    select 1 from public.community_pages p
    join public.communities c on c.id = p.community_id
    join public.community_members m on m.community_id = c.id and m.user_id = auth.uid() and m.role in ('owner','admin')
    where p.id = community_page_gallery_items.page_id
  )
);

-- 3) 노트 페이지: 카드형 노트 + 카테고리
--    UI 요구사항: 상단 카테고리 필터, 우측 상단 "새 노트" 버튼, 카드형 CRUD
create table if not exists public.community_page_note_categories (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.community_pages(id) on delete cascade,
  name text not null,
  color text, -- 예: '#F59E0B' 또는 'amber'
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique(page_id, name)
);

create table if not exists public.community_page_note_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.community_pages(id) on delete cascade,
  category_id uuid references public.community_page_note_categories(id) on delete set null,
  title text not null,
  body text not null default ''::text,
  cover_url text,
  color text, -- 카드 배경색(hex)
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_page_note_categories enable row level security;
alter table public.community_page_note_items enable row level security;

-- 모두 조회 가능
create policy if not exists "note categories viewable" on public.community_page_note_categories for select using (true);
create policy if not exists "note items viewable" on public.community_page_note_items for select using (true);

-- 소유자/관리자만 쓰기 가능
create policy if not exists "note categories editable by admins" on public.community_page_note_categories for all to authenticated using (
  exists (
    select 1 from public.community_pages p
    join public.communities c on c.id = p.community_id
    join public.community_members m on m.community_id = c.id and m.user_id = auth.uid() and m.role in ('owner','admin')
    where p.id = community_page_note_categories.page_id
  )
);
create policy if not exists "note items editable by admins" on public.community_page_note_items for all to authenticated using (
  exists (
    select 1 from public.community_pages p
    join public.communities c on c.id = p.community_id
    join public.community_members m on m.community_id = c.id and m.user_id = auth.uid() and m.role in ('owner','admin')
    where p.id = community_page_note_items.page_id
  )
);

-- 소유자/관리자만 관리
create policy if not exists "owners or admins manage page groups" on public.community_page_groups for all to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = community_page_groups.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);
create policy if not exists "owners or admins manage pages" on public.community_pages for all to authenticated using (
  exists (
    select 1 from public.community_members m where m.community_id = community_pages.community_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- 초기 데이터 가이드(선택): 커뮤니티 생성 시 기본 페이지 비우기 (홈/피드는 앱 UI 전용)
-- 필요한 경우 애플리케이션에서 community_pages는 비워둔 상태로 시작하세요.
```

## 사용 방법

1. Supabase Dashboard → SQL Editor로 이동
2. 위의 SQL 스크립트들을 순서대로 실행
3. 실행 완료 후 애플리케이션에서 테스트

**주의사항**: 기존 데이터나 정책이 있는 경우 일부 명령어에서 에러가 발생할 수 있지만, 대부분 무시해도 됩니다. 