-- ============================================================
-- PitLog — Fiches techniques par modèle
-- Quantités d'huile, jeux aux soupapes, couples de serrage,
-- réglages d'origine des suspensions, intervalles suggérés.
-- À exécuter après 0004_finances.sql.
-- ============================================================

create table public.model_specs (
  id serial primary key,
  model_id integer not null references public.motorcycle_models (id) on delete cascade,
  -- Une fiche vaut pour une génération : plage d'années couverte
  year_from integer not null check (year_from between 1970 and 2100),
  year_to integer not null check (year_to between 1970 and 2100),

  -- Moteur
  oil_qty text,            -- ex : « 0,95 L (vidange) / 1,25 L (moteur ouvert) »
  oil_type text,           -- ex : « 10W-40 »
  coolant_qty text,        -- ex : « 1,1 L »
  premix_ratio text,       -- 2 temps : « 1:60 »
  valve_intake text,       -- ex : « 0,10 – 0,15 mm »
  valve_exhaust text,      -- ex : « 0,12 – 0,17 mm »
  spark_plug text,         -- ex : « NGK LKAR8AI-9 »

  -- Suspensions (réglages d'origine)
  fork_info text,          -- ex : « WP XACT air — 10,5 bar standard »
  fork_clicks text,        -- ex : « Compression 12 · Détente 12 »
  shock_clicks text,       -- ex : « BV 12 · HV 1,5 tr · Détente 12 »
  sag_recommended text,    -- ex : « 105 mm »

  -- Couples de serrage : [{ "name": "Axe de roue avant", "value": "35 Nm" }]
  torques jsonb not null default '[]',

  -- Intervalles suggérés : [{ "type_name": "Vidange moteur", "hours": 10, "months": null }]
  -- type_name doit correspondre à maintenance_types.name pour l'application automatique
  suggested_intervals jsonb not null default '[]',

  notes text,
  -- false : valeurs indicatives non vérifiées sur le manuel officiel
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint spec_year_range_valid check (year_to >= year_from),
  unique (model_id, year_from)
);

create index idx_specs_model on public.model_specs (model_id);

create trigger on_spec_update
  before update on public.model_specs
  for each row execute function public.touch_updated_at();

-- Référentiel commun : lecture pour tous les connectés, gestion admin
alter table public.model_specs enable row level security;

create policy "fiches : lecture" on public.model_specs for select to authenticated using (true);
create policy "fiches : gestion admin" on public.model_specs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
