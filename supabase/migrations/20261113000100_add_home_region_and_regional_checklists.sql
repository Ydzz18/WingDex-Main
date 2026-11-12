alter table public.profiles
  add column if not exists home_region_code text,
  add column if not exists home_region_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_home_region_code_check'
  ) then
    alter table public.profiles
      add constraint profiles_home_region_code_check check (
        home_region_code is null or home_region_code in (
          'NCR', 'CAR', 'REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV_A',
          'REGION_IV_B', 'REGION_V', 'REGION_VI', 'REGION_VII', 'REGION_VIII',
          'REGION_IX', 'REGION_X', 'REGION_XI', 'REGION_XII', 'REGION_XIII', 'BARMM', 'NIR'
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_home_region_name_check'
  ) then
    alter table public.profiles
      add constraint profiles_home_region_name_check
      check (home_region_name is null or length(btrim(home_region_name)) between 1 and 80);
  end if;
end;
$$;

revoke update (home_region_code, home_region_name) on public.profiles from authenticated;
grant update (home_region_code, home_region_name) on public.profiles to authenticated;

create table if not exists public.regional_rank_definitions (
  rank_code text primary key,
  title text not null,
  description text not null,
  rank_order integer not null unique check (rank_order between 1 and 6),
  threshold_type text not null check (threshold_type in ('first_species', 'percentage')),
  threshold_value integer not null,
  constraint regional_rank_definition_is_universal check (
    (rank_code = 'hatchling' and rank_order = 1 and threshold_type = 'first_species' and threshold_value = 1)
    or (rank_code = 'feather-scout' and rank_order = 2 and threshold_type = 'percentage' and threshold_value = 10)
    or (rank_code = 'canopy-tracker' and rank_order = 3 and threshold_type = 'percentage' and threshold_value = 25)
    or (rank_code = 'sky-ranger' and rank_order = 4 and threshold_type = 'percentage' and threshold_value = 50)
    or (rank_code = 'avian-guardian' and rank_order = 5 and threshold_type = 'percentage' and threshold_value = 75)
    or (rank_code = 'wing-master' and rank_order = 6 and threshold_type = 'percentage' and threshold_value = 100)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.regional_rank_definitions
  (rank_code, title, description, rank_order, threshold_type, threshold_value)
values
  ('hatchling', 'HATCHLING', 'The beginning of every discovery.', 1, 'first_species', 1),
  ('feather-scout', 'FEATHER SCOUT', 'The journey beyond the nest.', 2, 'percentage', 10),
  ('canopy-tracker', 'CANOPY TRACKER', 'A growing knowledge of the wild.', 3, 'percentage', 25),
  ('sky-ranger', 'SKY RANGER', 'A master of the skies begins to emerge.', 4, 'percentage', 50),
  ('avian-guardian', 'AVIAN GUARDIAN', 'A protector and dedicated student of birds.', 5, 'percentage', 75),
  ('wing-master', 'WING MASTER', 'The ultimate regional bird expert.', 6, 'percentage', 100)
on conflict (rank_code) do update set
  title = excluded.title,
  description = excluded.description,
  rank_order = excluded.rank_order,
  threshold_type = excluded.threshold_type,
  threshold_value = excluded.threshold_value;

create table if not exists public.regional_rank_checklists (
  id uuid primary key default gen_random_uuid(),
  region_code text not null check (region_code in (
    'NCR', 'CAR', 'REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV_A',
    'REGION_IV_B', 'REGION_V', 'REGION_VI', 'REGION_VII', 'REGION_VIII',
    'REGION_IX', 'REGION_X', 'REGION_XI', 'REGION_XII', 'REGION_XIII', 'BARMM', 'NIR'
  )),
  region_name text not null check (length(btrim(region_name)) between 1 and 80),
  eligible_species_count integer not null check (eligible_species_count between 0 and 1000000),
  checklist_version text not null check (length(btrim(checklist_version)) between 1 and 80),
  checklist_snapshot_date date not null,
  checklist_hash text not null check (checklist_hash ~ '^[0-9a-f]{64}$'),
  species_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(species_codes) = 'array'),
  source_region_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(source_region_codes) = 'array'),
  snapshot_as_of timestamptz not null default now(),
  source text not null default 'ebird-product-spplist' check (source = 'ebird-product-spplist'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.regional_rank_checklists
  add column if not exists species_codes jsonb not null default '[]'::jsonb,
  add column if not exists source_region_codes jsonb not null default '[]'::jsonb,
  add column if not exists snapshot_as_of timestamptz not null default now();

alter table public.regional_rank_checklists
  alter column is_published set default false;

alter table public.regional_rank_checklists
  drop constraint if exists regional_rank_checklists_region_code_key;

create unique index if not exists regional_rank_checklists_region_version_uidx
  on public.regional_rank_checklists (region_code, checklist_version);
create unique index if not exists regional_rank_checklists_one_published_per_region_uidx
  on public.regional_rank_checklists (region_code)
  where is_published;
create index if not exists regional_rank_checklists_history_idx
  on public.regional_rank_checklists (region_code, snapshot_as_of desc);

-- Older admin-entered rows contain counts but no species-code contents and cannot safely count.
update public.regional_rank_checklists
set is_published = false
where species_codes = '[]'::jsonb;

create or replace function public.set_regional_rank_checklist_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_regional_rank_checklist_updated_at on public.regional_rank_checklists;
create trigger set_regional_rank_checklist_updated_at
  before update on public.regional_rank_checklists
  for each row execute function public.set_regional_rank_checklist_updated_at();

alter table public.regional_rank_definitions enable row level security;
revoke all on public.regional_rank_definitions from public, anon, authenticated;
grant select on public.regional_rank_definitions to anon, authenticated;
grant all on public.regional_rank_definitions to service_role;
drop policy if exists "Public can read universal regional rank definitions" on public.regional_rank_definitions;
create policy "Public can read universal regional rank definitions"
  on public.regional_rank_definitions for select
  to anon, authenticated
  using (true);

alter table public.regional_rank_checklists enable row level security;
revoke all on public.regional_rank_checklists from public, anon, authenticated;
grant select on public.regional_rank_checklists to anon, authenticated;
grant all on public.regional_rank_checklists to service_role;
drop policy if exists "Public can read published checklist snapshots" on public.regional_rank_checklists;
create policy "Public can read published checklist snapshots"
  on public.regional_rank_checklists for select
  to anon, authenticated
  using (is_published);

create table if not exists public.regional_rank_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  region_code text not null,
  rank_code text not null references public.regional_rank_definitions (rank_code),
  checklist_version text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, region_code, rank_code),
  check (region_code in (
    'NCR', 'CAR', 'REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV_A',
    'REGION_IV_B', 'REGION_V', 'REGION_VI', 'REGION_VII', 'REGION_VIII',
    'REGION_IX', 'REGION_X', 'REGION_XI', 'REGION_XII', 'REGION_XIII', 'BARMM', 'NIR'
  ))
);

alter table public.regional_rank_achievements enable row level security;
revoke all on public.regional_rank_achievements from public, anon, authenticated;
grant select on public.regional_rank_achievements to authenticated;
grant all on public.regional_rank_achievements to service_role;
drop policy if exists "Users read their own regional rank achievements" on public.regional_rank_achievements;
create policy "Users read their own regional rank achievements"
  on public.regional_rank_achievements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.admin_publish_regional_rank_checklist(p_checklist_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_region text;
begin
  select region_code into target_region
  from public.regional_rank_checklists
  where id = p_checklist_id
  for update;
  if target_region is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext(target_region));
  update public.regional_rank_checklists
  set is_published = false
  where region_code = target_region and is_published;
  update public.regional_rank_checklists
  set is_published = true
  where id = p_checklist_id;
  return true;
end;
$$;

revoke all on function public.admin_publish_regional_rank_checklist(uuid) from public, anon, authenticated;
grant execute on function public.admin_publish_regional_rank_checklist(uuid) to service_role;
