alter table public.observations
  add column if not exists ebird_species jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.observations'::regclass
      and conname = 'observations_ebird_species_object_check'
  ) then
    alter table public.observations add constraint observations_ebird_species_object_check
      check (ebird_species is null or jsonb_typeof(ebird_species) = 'object');
  end if;
end;
$$;
