alter table public.observations
  add column if not exists client_id text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

update public.observations
set client_id = id::text
where client_id is null;

alter table public.observations
  alter column client_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_client_id_length_check'
  ) then
    alter table public.observations add constraint observations_client_id_length_check
      check (length(client_id) between 1 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_latitude_check'
  ) then
    alter table public.observations add constraint observations_latitude_check
      check (latitude is null or latitude between -90 and 90);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_longitude_check'
  ) then
    alter table public.observations add constraint observations_longitude_check
      check (longitude is null or longitude between -180 and 180);
  end if;
end;
$$;

create unique index if not exists observations_user_client_id_uidx
  on public.observations (user_id, client_id);

create index if not exists saved_birds_user_saved_at_idx
  on public.saved_birds (user_id, saved_at desc);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 80),
  description text not null check (length(btrim(description)) between 1 and 240),
  rule_type text not null check (rule_type in ('unique_species', 'observations', 'saved_species')),
  threshold integer not null check (threshold between 1 and 1000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ranks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 80),
  threshold integer not null unique check (threshold between 1 and 1000000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 4000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  audience text not null default 'all' check (audience = 'all'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists badges_active_threshold_idx
  on public.badges (is_active, threshold);
create index if not exists badges_updated_at_idx
  on public.badges (updated_at desc);
create index if not exists ranks_published_threshold_idx
  on public.ranks (is_published, threshold);
create index if not exists ranks_updated_at_idx
  on public.ranks (updated_at desc);
create index if not exists announcements_status_updated_at_idx
  on public.announcements (status, updated_at desc);
create index if not exists announcements_published_at_idx
  on public.announcements (published_at desc)
  where status = 'published';

create or replace function public.set_admin_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_badges_updated_at on public.badges;
create trigger set_badges_updated_at
  before update on public.badges
  for each row execute function public.set_admin_content_updated_at();

drop trigger if exists set_ranks_updated_at on public.ranks;
create trigger set_ranks_updated_at
  before update on public.ranks
  for each row execute function public.set_admin_content_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_admin_content_updated_at();

create or replace function public.set_announcement_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at = now();
    end if;
  elsif new.status = 'published' and old.status <> 'published' then
    new.published_at = now();
  elsif new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_announcement_published_at on public.announcements;
create trigger set_announcement_published_at
  before insert or update on public.announcements
  for each row execute function public.set_announcement_published_at();

alter table public.badges enable row level security;
alter table public.ranks enable row level security;
alter table public.announcements enable row level security;

revoke all on public.badges, public.ranks, public.announcements from anon, authenticated;
grant select on public.badges, public.ranks, public.announcements to anon, authenticated;
grant all on public.badges, public.ranks, public.announcements to service_role;

drop policy if exists "Public can read active badges" on public.badges;
create policy "Public can read active badges"
  on public.badges for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Public can read published ranks" on public.ranks;
create policy "Public can read published ranks"
  on public.ranks for select
  to anon, authenticated
  using (is_published);

drop policy if exists "Public can read published announcements" on public.announcements;
create policy "Public can read published announcements"
  on public.announcements for select
  to anon, authenticated
  using (status = 'published');

create or replace function public.admin_dashboard_overview()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'totalObservations', (select count(*) from public.observations),
    'savedSpecies', (select count(*) from public.saved_birds),
    'activeBadges', (select count(*) from public.badges where is_active),
    'publishedRanks', (select count(*) from public.ranks where is_published),
    'publishedAnnouncements', (select count(*) from public.announcements where status = 'published'),
    'recentUsers', coalesce((
      select jsonb_agg(to_jsonb(recent_users))
      from (
        select users.id, users.email, profiles.display_name, users.created_at
        from auth.users as users
        left join public.profiles as profiles on profiles.id = users.id
        order by users.created_at desc
        limit 6
      ) as recent_users
    ), '[]'::jsonb),
    'recentActivity', coalesce((
      select jsonb_agg(to_jsonb(recent_activity))
      from (
        select observations.common_name, observations.identified_at, users.email
        from public.observations as observations
        left join auth.users as users on users.id = observations.user_id
        order by observations.identified_at desc
        limit 6
      ) as recent_activity
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_search_users(search_text text, page_size integer, page_offset integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with matched as (
    select users.id, users.email, profiles.display_name, users.created_at
    from auth.users as users
    left join public.profiles as profiles on profiles.id = users.id
    where coalesce(search_text, '') = ''
      or users.email ilike '%' || search_text || '%'
      or profiles.display_name ilike '%' || search_text || '%'
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(result))
      from (
        select
          matched.id,
          matched.email,
          matched.display_name,
          matched.created_at,
          (select count(*) from public.observations where observations.user_id = matched.id) as observation_count,
          (select count(*) from public.saved_birds where saved_birds.user_id = matched.id) as saved_species_count
        from matched
        order by matched.created_at desc
        limit greatest(1, least(page_size, 50))
        offset greatest(page_offset, 0)
      ) as result
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_search_collections(search_text text, page_size integer, page_offset integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with collection_rows as (
    select
      'observation'::text as kind,
      observations.id::text as id,
      observations.user_id,
      users.email,
      observations.common_name as species,
      observations.scientific_name,
      observations.identified_at as happened_at,
      observations.latitude,
      observations.longitude
    from public.observations as observations
    left join auth.users as users on users.id = observations.user_id
    where coalesce(search_text, '') = ''
      or observations.common_name ilike '%' || search_text || '%'
      or observations.scientific_name ilike '%' || search_text || '%'
      or users.email ilike '%' || search_text || '%'
    union all
    select
      'saved_species'::text as kind,
      saved_birds.user_id::text || ':' || saved_birds.bird_id as id,
      saved_birds.user_id,
      users.email,
      saved_birds.bird_id as species,
      null::text as scientific_name,
      saved_birds.saved_at as happened_at,
      null::double precision as latitude,
      null::double precision as longitude
    from public.saved_birds as saved_birds
    left join auth.users as users on users.id = saved_birds.user_id
    where coalesce(search_text, '') = ''
      or saved_birds.bird_id ilike '%' || search_text || '%'
      or users.email ilike '%' || search_text || '%'
  )
  select jsonb_build_object(
    'total', (select count(*) from collection_rows),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(result))
      from (
        select *
        from collection_rows
        order by happened_at desc
        limit greatest(1, least(page_size, 50))
        offset greatest(page_offset, 0)
      ) as result
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_dashboard_overview() from public, anon, authenticated;
revoke all on function public.admin_search_users(text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_search_collections(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard_overview() to service_role;
grant execute on function public.admin_search_users(text, integer, integer) to service_role;
grant execute on function public.admin_search_collections(text, integer, integer) to service_role;
