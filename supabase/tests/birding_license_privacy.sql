begin;

select plan(6);

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
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anonymous clients cannot query private profile rows'
);
select ok(
  has_function_privilege('anon', 'public.public_birding_license(text)', 'execute'),
  'anonymous clients can request only the safe public-license projection'
);
select is(
  public.public_birding_license('WD-NONEXISTENT00000000'),
  null,
  'an unavailable or private license returns no public profile'
);

select * from finish();
rollback;
