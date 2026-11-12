alter table public.profiles
  add column if not exists username text,
  add column if not exists country text not null default 'Philippines',
  add column if not exists city text,
  add column if not exists bio text,
  add column if not exists favorite_bird text,
  add column if not exists preferred_categories text[] not null default '{}',
  add column if not exists interests text[] not null default '{}',
  add column if not exists preferred_discovery_region text,
  add column if not exists avatar_path text,
  add column if not exists license_number text,
  add column if not exists license_issued_at timestamptz,
  add column if not exists sharing_enabled boolean not null default false,
  add column if not exists profile_completed_at timestamptz;

update public.profiles
set username = 'birder_' || substr(replace(id::text, '-', ''), 1, 16)
where username is null or btrim(username) = '';

create unique index if not exists profiles_username_ci_uidx
  on public.profiles (lower(username));
create unique index if not exists profiles_license_number_uidx
  on public.profiles (license_number)
  where license_number is not null;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  fallback_username text := 'birder_' || substr(replace(new.id::text, '-', ''), 1, 16);
begin
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := fallback_username;
  end if;
  begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (
      new.id,
      requested_username,
      nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), 80), ''),
      nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    )
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, display_name, avatar_url)
    values (
      new.id,
      fallback_username,
      nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), 80), ''),
      nullif(new.raw_user_meta_data ->> 'avatar_url', '')
    )
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create table if not exists public.private_user_age_assurance (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  age_status text not null check (age_status in ('under_13', 'minor_provider_required', 'adult')),
  created_at timestamptz not null default now(),
  check (
    (age_status = 'under_13' and birth_date is null)
    or (age_status in ('minor_provider_required', 'adult') and birth_date is not null)
  )
);

alter table public.private_user_age_assurance enable row level security;
revoke all on public.private_user_age_assurance from public, anon, authenticated;

create or replace function public.current_user_is_adult()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.private_user_age_assurance as age_record
    where age_record.user_id = (select auth.uid())
      and age_record.birth_date is not null
      and age_record.birth_date <= (current_date - interval '18 years')::date
      and age_record.age_status in ('adult', 'minor_provider_required')
  );
$$;

revoke all on function public.current_user_is_adult() from public, anon;
grant execute on function public.current_user_is_adult() to authenticated;

create or replace function public.submit_private_birth_date(p_birth_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  existing_record public.private_user_age_assurance%rowtype;
  computed_age integer;
  result_status text;
begin
  if v_user_id is null then
    raise exception 'Sign in before completing age assurance.';
  end if;
  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'Enter a valid date of birth.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  select * into existing_record
  from public.private_user_age_assurance
  where private_user_age_assurance.user_id = v_user_id;
  if found then
    if existing_record.age_status = 'under_13' then
      return 'under_13';
    end if;
    if existing_record.birth_date <= (current_date - interval '18 years')::date then
      return 'adult';
    end if;
    return 'minor_provider_required';
  end if;

  computed_age := extract(year from age(current_date, p_birth_date))::integer;
  if computed_age < 13 then
    result_status := 'under_13';
    insert into public.private_user_age_assurance (user_id, birth_date, age_status)
    values (v_user_id, null, result_status);
  elsif computed_age < 18 then
    result_status := 'minor_provider_required';
    insert into public.private_user_age_assurance (user_id, birth_date, age_status)
    values (v_user_id, p_birth_date, result_status);
  else
    result_status := 'adult';
    insert into public.private_user_age_assurance (user_id, birth_date, age_status)
    values (v_user_id, p_birth_date, result_status);
  end if;

  return result_status;
end;
$$;

revoke all on function public.submit_private_birth_date(date) from public, anon;
grant execute on function public.submit_private_birth_date(date) to authenticated;

create or replace function public.my_license_access_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  age_record public.private_user_age_assurance%rowtype;
  license_profile public.profiles%rowtype;
  age_status text := 'missing';
begin
  if v_user_id is null then
    return jsonb_build_object('age_status', 'missing', 'is_adult', false, 'profile_complete', false);
  end if;
  select * into age_record
  from public.private_user_age_assurance
  where private_user_age_assurance.user_id = v_user_id;
  if found then
    if age_record.age_status = 'under_13' then
      age_status := 'under_13';
    elsif age_record.birth_date <= (current_date - interval '18 years')::date then
      age_status := 'adult';
    else
      age_status := 'minor_provider_required';
    end if;
  end if;
  select * into license_profile
  from public.profiles
  where profiles.id = v_user_id;
  return jsonb_build_object(
    'age_status', age_status,
    'is_adult', age_status = 'adult',
    'profile_complete', license_profile.profile_completed_at is not null,
    'license_number', license_profile.license_number
  );
end;
$$;

revoke all on function public.my_license_access_state() from public, anon;
grant execute on function public.my_license_access_state() to authenticated;

create or replace function public.complete_birding_license_profile(
  p_username text,
  p_display_name text,
  p_country text,
  p_city text,
  p_bio text,
  p_home_region_code text,
  p_home_region_name text,
  p_favorite_bird text,
  p_preferred_categories text[],
  p_interests text[],
  p_preferred_discovery_region text,
  p_sharing_enabled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  normalized_username text := lower(btrim(coalesce(p_username, '')));
  license_number text;
begin
  if v_user_id is null or not public.current_user_is_adult() then
    raise exception 'An age-eligible adult account is required to complete a Birding License.';
  end if;
  if normalized_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3–24 letters, numbers, or underscores.';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) not between 1 and 80 then
    raise exception 'Display name must be between 1 and 80 characters.';
  end if;
  if length(btrim(coalesce(p_country, ''))) not between 2 and 80 then
    raise exception 'Enter a valid country.';
  end if;
  if p_home_region_code is null or p_home_region_name is null or p_home_region_code not in (
    'NCR', 'CAR', 'REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV_A',
    'REGION_IV_B', 'REGION_V', 'REGION_VI', 'REGION_VII', 'REGION_VIII',
    'REGION_IX', 'REGION_X', 'REGION_XI', 'REGION_XII', 'REGION_XIII', 'BARMM', 'NIR'
  ) then
    raise exception 'Choose a Philippine home region.';
  end if;
  if length(coalesce(p_city, '')) > 80
    or length(coalesce(p_bio, '')) > 240
    or length(coalesce(p_favorite_bird, '')) > 120
    or length(coalesce(p_preferred_discovery_region, '')) > 80
    or coalesce(cardinality(p_preferred_categories), 0) > 12
    or coalesce(cardinality(p_interests), 0) > 20 then
    raise exception 'One or more profile fields are too long.';
  end if;

  update public.profiles
  set username = normalized_username,
      display_name = btrim(p_display_name),
      country = btrim(p_country),
      city = nullif(btrim(coalesce(p_city, '')), ''),
      bio = nullif(btrim(coalesce(p_bio, '')), ''),
      home_region_code = p_home_region_code,
      home_region_name = btrim(p_home_region_name),
      favorite_bird = nullif(btrim(coalesce(p_favorite_bird, '')), ''),
      preferred_categories = coalesce(p_preferred_categories, '{}'),
      interests = coalesce(p_interests, '{}'),
      preferred_discovery_region = nullif(btrim(coalesce(p_preferred_discovery_region, '')), ''),
      sharing_enabled = coalesce(p_sharing_enabled, false),
      profile_completed_at = coalesce(profile_completed_at, now())
  where id = v_user_id;

  loop
    begin
      update public.profiles
      set license_number = 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)),
          license_issued_at = coalesce(license_issued_at, now())
      where id = v_user_id and license_number is null;
      exit;
    exception when unique_violation then
      continue;
    end;
    exit when exists (select 1 from public.profiles where id = v_user_id and license_number is not null);
  end loop;

  select profiles.license_number into license_number
  from public.profiles
  where profiles.id = v_user_id;
  return jsonb_build_object('license_number', license_number);
end;
$$;

revoke all on function public.complete_birding_license_profile(text, text, text, text, text, text, text, text, text[], text[], text, boolean) from public, anon;
grant execute on function public.complete_birding_license_profile(text, text, text, text, text, text, text, text, text[], text[], text, boolean) to authenticated;

create or replace function public.set_birding_license_sharing(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or not public.current_user_is_adult() then
    return false;
  end if;
  update public.profiles
  set sharing_enabled = coalesce(p_enabled, false)
  where id = v_user_id and profile_completed_at is not null;
  return found;
end;
$$;

revoke all on function public.set_birding_license_sharing(boolean) from public, anon;
grant execute on function public.set_birding_license_sharing(boolean) to authenticated;

create or replace function public.public_birding_license(p_license_number text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'license_number', profile.license_number,
    'username', profile.username,
    'display_name', profile.display_name,
    'bio', profile.bio,
    'country', profile.country,
    'city', profile.city,
    'home_region_code', profile.home_region_code,
    'home_region_name', profile.home_region_name,
    'favorite_bird', profile.favorite_bird,
    'preferred_categories', profile.preferred_categories,
    'interests', profile.interests,
    'license_issued_at', profile.license_issued_at,
    'species_count', (
      select count(distinct lower(observations.ebird_species ->> 'speciesCode'))
      from public.observations as observations
      where observations.user_id = profile.id
        and observations.confidence >= 0.68
        and observations.ebird_species ->> 'category' = 'species'
        and nullif(observations.ebird_species ->> 'speciesCode', '') is not null
    ),
    'earned_badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank_code', achievements.rank_code,
        'rank_title', definitions.title,
        'unlocked_at', achievements.unlocked_at
      ) order by definitions.rank_order)
      from public.regional_rank_achievements as achievements
      join public.regional_rank_definitions as definitions
        on definitions.rank_code = achievements.rank_code
      where achievements.user_id = profile.id
        and achievements.region_code = profile.home_region_code
    ), '[]'::jsonb)
  )
  from public.profiles as profile
  where profile.license_number = p_license_number
    and profile.profile_completed_at is not null
    and profile.sharing_enabled
    and exists (
      select 1 from public.private_user_age_assurance as age_record
      where age_record.user_id = profile.id
        and age_record.birth_date <= (current_date - interval '18 years')::date
        and age_record.age_status in ('adult', 'minor_provider_required')
    );
$$;

revoke all on function public.public_birding_license(text) from public, authenticated;
grant execute on function public.public_birding_license(text) to anon, authenticated;

grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Adults read their own profile" on public.profiles;
drop policy if exists "Adults update their own profile" on public.profiles;
drop policy if exists "Users read their own profile" on public.profiles;
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Adults read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id and (select public.current_user_is_adult()));
create policy "Adults update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id and (select public.current_user_is_adult()))
  with check ((select auth.uid()) = id and (select public.current_user_is_adult()));

drop policy if exists "Users manage their saved birds" on public.saved_birds;
create policy "Adults manage their saved birds"
  on public.saved_birds for all to authenticated
  using ((select auth.uid()) = user_id and (select public.current_user_is_adult()))
  with check ((select auth.uid()) = user_id and (select public.current_user_is_adult()));

drop policy if exists "Users manage their observations" on public.observations;
create policy "Adults manage their observations"
  on public.observations for all to authenticated
  using ((select auth.uid()) = user_id and (select public.current_user_is_adult()))
  with check ((select auth.uid()) = user_id and (select public.current_user_is_adult()));

drop policy if exists "Users read their own regional rank achievements" on public.regional_rank_achievements;
create policy "Adults read their own regional rank achievements"
  on public.regional_rank_achievements for select to authenticated
  using ((select auth.uid()) = user_id and (select public.current_user_is_adult()));

drop policy if exists "Users read their observation photos" on storage.objects;
create policy "Adults read their observation photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Users upload their observation photos" on storage.objects;
create policy "Adults upload their observation photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Users update their observation photos" on storage.objects;
create policy "Adults update their observation photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  )
  with check (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Users delete their observation photos" on storage.objects;
create policy "Adults delete their observation photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'observation-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Adults read their profile photos" on storage.objects;
create policy "Adults read their profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Adults upload their profile photos" on storage.objects;
create policy "Adults upload their profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Adults update their profile photos" on storage.objects;
create policy "Adults update their profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );

drop policy if exists "Adults delete their profile photos" on storage.objects;
create policy "Adults delete their profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_is_adult())
  );
