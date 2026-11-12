begin;

select plan(7);

insert into public.badges (id, title, description, rule_type, threshold, is_active)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'RLS test active badge', 'Visible fixture', 'unique_species', 1, true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'RLS test inactive badge', 'Hidden fixture', 'unique_species', 2, false);

insert into public.ranks (id, title, threshold, is_published)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'RLS test published rank', 11, true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'RLS test draft rank', 12, false);

insert into public.announcements (id, title, body, status, audience)
values
  ('cccccccc-0000-4000-8000-000000000001', 'RLS test live announcement', 'Visible fixture', 'published', 'all'),
  ('cccccccc-0000-4000-8000-000000000002', 'RLS test draft announcement', 'Hidden fixture', 'draft', 'all'),
  ('cccccccc-0000-4000-8000-000000000003', 'RLS test archived announcement', 'Hidden fixture', 'archived', 'all');

set local role anon;

select is(
  (select count(*) from public.badges where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  1::bigint,
  'anonymous app clients can read active badges'
);
select is(
  (select count(*) from public.badges where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0::bigint,
  'anonymous app clients cannot read inactive badges'
);
select is(
  (select count(*) from public.ranks where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  1::bigint,
  'anonymous app clients can read published ranks'
);
select is(
  (select count(*) from public.ranks where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0::bigint,
  'anonymous app clients cannot read draft ranks'
);
select is(
  (select count(*) from public.announcements where id = 'cccccccc-0000-4000-8000-000000000001'),
  1::bigint,
  'anonymous app clients can read published announcements'
);
select is(
  (select count(*) from public.announcements where id in (
    'cccccccc-0000-4000-8000-000000000002',
    'cccccccc-0000-4000-8000-000000000003'
  )),
  0::bigint,
  'anonymous app clients cannot read draft or archived announcements'
);
select throws_ok(
  $$insert into public.badges (title, description, rule_type, threshold, is_active)
    values ('RLS test unauthorized insert', 'Must be blocked', 'unique_species', 1, true)$$,
  '42501',
  null,
  'anonymous app clients cannot mutate admin content'
);

reset role;
select * from finish();
rollback;
