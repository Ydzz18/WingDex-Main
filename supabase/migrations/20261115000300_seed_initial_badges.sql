insert into public.badges (title, description, rule_type, threshold, is_active)
select seed.title, seed.description, seed.rule_type, seed.threshold, true
from (
  values
    ('First Feather', 'Identify your first bird species.', 'unique_species', 1),
    ('Field Observer', 'Record 10 bird observations.', 'observations', 10),
    ('Growing Life List', 'Identify 25 different bird species.', 'unique_species', 25),
    ('Curated Collection', 'Save 25 bird species to your collection.', 'saved_species', 25),
    ('Century Birder', 'Identify 100 different bird species.', 'unique_species', 100)
) as seed(title, description, rule_type, threshold)
where not exists (
  select 1
  from public.badges existing
  where lower(existing.title) = lower(seed.title)
);
