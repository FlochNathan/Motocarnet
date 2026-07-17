-- ============================================================
-- MotoCarnet — Finances : catégories de dépenses étendues
-- À exécuter après 0003_alertes.sql.
-- ============================================================

alter table public.expenses drop constraint expenses_category_check;

alter table public.expenses add constraint expenses_category_check
  check (category in (
    'entretien',    -- opérations d'entretien (alimenté automatiquement)
    'piece',        -- pièces détachées
    'essence',      -- carburant moto (et mélange 2T)
    'transport',    -- déplacements vers les terrains (péage, gasoil véhicule…)
    'equipement',   -- casque, bottes, tenues…
    'inscription',  -- entrées de terrain, engagements course, licence
    'autre'
  ));
