create table if not exists public.saved_birds (
  user_id uuid not null references auth.users (id) on delete cascade,
  bird_id text not null check (length(btrim(bird_id)) > 0),
  saved_at timestamptz not null default now(),
  primary key (user_id, bird_id)
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  common_name text,
  scientific_name text,
  description text,
  confidence real not null default 0 check (confidence between 0 and 1),
  regions text[] not null default array['Unknown']::text[]
    check (
      cardinality(regions) between 1 and 8
      and regions <@ array[
        'Africa',
        'Asia',
        'Europe',
        'North America',
        'South America',
        'Oceania',
        'Antarctica',
        'Unknown'
      ]::text[]
    ),
  identified_at timestamptz not null default now(),
  photo_path text,
  created_at timestamptz not null default now(),
  check (
    (common_name is null and scientific_name is null)
    or (common_name is not null and scientific_name is not null)
  )
);

create index if not exists observations_user_identified_at_idx
  on public.observations (user_id, identified_at desc);

alter table public.saved_birds enable row level security;
alter table public.observations enable row level security;

revoke all on public.saved_birds, public.observations from anon, authenticated;
grant select, insert, delete on public.saved_birds to authenticated;
grant select, insert, update, delete on public.observations to authenticated;

drop policy if exists "Users manage their saved birds" on public.saved_birds;
create policy "Users manage their saved birds"
  on public.saved_birds
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their observations" on public.observations;
create policy "Users manage their observations"
  on public.observations
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'observation-photos',
  'observation-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their observation photos" on storage.objects;
create policy "Users read their observation photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users upload their observation photos" on storage.objects;
create policy "Users upload their observation photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update their observation photos" on storage.objects;
create policy "Users update their observation photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their observation photos" on storage.objects;
create policy "Users delete their observation photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
