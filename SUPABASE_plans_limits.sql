-- Plan & Limits for communities (Beta)
-- Safe to run multiple times.

-- 1) Columns: plan, member_limit, page_limit
alter table if exists public.communities
  add column if not exists plan text not null default 'starter',
  add column if not exists member_limit int,
  add column if not exists page_limit int;

-- Initialize null limits for existing rows based on plan
update public.communities
set member_limit = case when plan = 'pro' then 3000 when plan = 'pro_plus' then null else 300 end,
    page_limit   = case when plan = 'pro' then 100  when plan = 'pro_plus' then null else 10 end
where member_limit is null and page_limit is null;

-- 2) Trigger: enforce member_limit on community_members insert (excludes pending)
create or replace function public.enforce_member_limit()
returns trigger
language plpgsql as $$
declare v_limit int; v_count int;
begin
  select member_limit into v_limit from public.communities where id = new.community_id;
  -- null means unlimited
  if v_limit is not null then
    select count(*) into v_count
    from public.community_members
    where community_id = new.community_id
      and coalesce(role, 'pending') <> 'pending';
    if v_count >= v_limit then
      raise exception 'member_limit_reached';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_member_limit on public.community_members;
create trigger trg_member_limit
before insert on public.community_members
for each row execute function public.enforce_member_limit();

-- 3) Trigger: enforce page_limit on community_pages insert
create or replace function public.enforce_page_limit()
returns trigger
language plpgsql as $$
declare v_limit int; v_count int;
begin
  select page_limit into v_limit from public.communities where id = new.community_id;
  if v_limit is not null then
    select count(*) into v_count from public.community_pages where community_id = new.community_id;
    if v_count >= v_limit then
      raise exception 'page_limit_reached';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_page_limit on public.community_pages;
create trigger trg_page_limit
before insert on public.community_pages
for each row execute function public.enforce_page_limit();

-- 4) RLS note: keep updates to plan/limits admin-only via API using service role.


