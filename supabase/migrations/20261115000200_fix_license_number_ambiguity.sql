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
  p_sharing_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  normalized_username text := lower(btrim(coalesce(p_username, '')));
  v_license_number text;
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
      sharing_enabled = true,
      profile_completed_at = coalesce(profile_completed_at, now())
  where profiles.id = v_user_id;

  loop
    begin
      update public.profiles
      set license_number = 'WD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)),
          license_issued_at = coalesce(profiles.license_issued_at, now())
      where profiles.id = v_user_id
        and profiles.license_number is null;
      exit;
    exception when unique_violation then
      continue;
    end;
    exit when exists (
      select 1
      from public.profiles as profile
      where profile.id = v_user_id
        and profile.license_number is not null
    );
  end loop;

  select profile.license_number into v_license_number
  from public.profiles as profile
  where profile.id = v_user_id;
  return jsonb_build_object('license_number', v_license_number);
end;
$$;

revoke all on function public.complete_birding_license_profile(text, text, text, text, text, text, text, text, text[], text[], text, boolean) from public, anon;
grant execute on function public.complete_birding_license_profile(text, text, text, text, text, text, text, text, text[], text[], text, boolean) to authenticated;
