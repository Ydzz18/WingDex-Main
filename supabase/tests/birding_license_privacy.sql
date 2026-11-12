begin;

select plan(11);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  'dddddddd-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'public-license-test@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb
), (
  'dddddddd-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'public-license-minor-test@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb
), (
  'dddddddd-0000-4000-8000-000000000003',
  'authenticated',
  'authenticated',
  'public-license-incomplete-test@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb
);

insert into public.private_user_age_assurance (user_id, birth_date, age_status)
values
  ('dddddddd-0000-4000-8000-000000000001', date '1980-01-01', 'adult'),
  ('dddddddd-0000-4000-8000-000000000002', date '2012-01-01', 'minor_provider_required'),
  ('dddddddd-0000-4000-8000-000000000003', date '1980-01-01', 'adult');

update public.profiles
set username = 'public_test_birder',
    display_name = 'Public Test Birder',
    country = 'Philippines',
    city = 'Test City',
    bio = 'Rollback-only public license fixture.',
    home_region_code = 'NCR',
    home_region_name = 'National Capital Region',
    favorite_bird = 'Test bird',
    preferred_categories = array['Forest'],
    interests = array['Conservation'],
    preferred_discovery_region = 'National Capital Region',
    avatar_path = 'private-test/avatar.jpg',
    license_number = 'WD-PUBLIC-TEST-0000000001',
    license_issued_at = now(),
    profile_completed_at = now(),
    sharing_enabled = false
where id = 'dddddddd-0000-4000-8000-000000000001';

update public.profiles
set username = 'public_minor_birder',
    license_number = 'WD-PUBLIC-MINOR-0000000001',
    license_issued_at = now(),
    profile_completed_at = now(),
    sharing_enabled = false
where id = 'dddddddd-0000-4000-8000-000000000002';

update public.profiles
set username = 'public_incomplete_birder',
    license_number = 'WD-PUBLIC-INCOMPLETE-0000001',
    license_issued_at = now(),
    profile_completed_at = null,
    sharing_enabled = false
where id = 'dddddddd-0000-4000-8000-000000000003';

select ok(
  not has_table_privilege('anon', 'public.private_user_age_assurance', 'select')
  and not has_table_privilege('authenticated', 'public.private_user_age_assurance', 'select'),
  'date-of-birth storage is inaccessible to app client table queries'
);
select ok(
  not has_function_privilege('anon', 'public.submit_private_birth_date(date)', 'execute'),
  'anonymous users cannot write an age-gate result'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_private_birth_date(date)', 'execute'),
  'signed-in users can submit their own age-gate date through the constrained RPC'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'auth.users', 'select'),
  'anonymous clients cannot query private profile rows or auth email records'
);
select ok(
  has_function_privilege('anon', 'public.public_birding_license(text)', 'execute'),
  'anonymous clients can request only the safe public-license projection'
);
select is(
  public.public_birding_license('WD-NONEXISTENT00000000'),
  null,
  'a nonexistent license returns no public profile'
);

set local role anon;

select is(
  public.public_birding_license('WD-PUBLIC-TEST-0000000001')->>'username',
  'public_test_birder',
  'an eligible completed license is public even when its legacy sharing flag is false'
);
select is(
  public.public_birding_license('WD-PUBLIC-TEST-0000000001')->>'preferred_discovery_region',
  'National Capital Region',
  'the public license includes the selected discovery preference'
);
select is(
  public.public_birding_license('WD-PUBLIC-MINOR-0000000001'),
  null,
  'a completed license without adult age assurance remains unavailable'
);
select is(
  public.public_birding_license('WD-PUBLIC-INCOMPLETE-0000001'),
  null,
  'a license without a completed profile remains unavailable'
);
select ok(
  not (
    public.public_birding_license('WD-PUBLIC-TEST-0000000001')
    ?| array['email', 'birth_date', 'date_of_birth', 'age_status', 'avatar_path', 'avatar_url', 'user_id']
  ),
  'the public projection excludes email, birth date, age, avatar paths, and private user identifiers'
);

reset role;
select * from finish();
rollback;
