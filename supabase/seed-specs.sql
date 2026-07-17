-- ============================================================
-- PitLog — Fiches techniques indicatives (modèles populaires)
-- À exécuter après 0005_fiches_techniques.sql et seed.sql.
--
-- ⚠️ Toutes ces valeurs sont des repères issus de sources publiques,
-- marquées verified = false : elles doivent être confirmées sur le
-- manuel du constructeur du millésime exact avant toute intervention.
-- L'application affiche systématiquement cet avertissement.
-- ============================================================

-- Petit utilitaire de lisibilité : identifiant d'un modèle du référentiel
create or replace function pg_temp.model_of(p_brand text, p_model text)
returns integer language sql as $$
  select m.id from public.motorcycle_models m
  join public.motorcycle_brands b on b.id = m.brand_id
  where b.name = p_brand and m.name = p_model and m.version is null
  limit 1;
$$;

-- ------------------------------------------------------------
-- Famille KTM / Husqvarna / GasGas 250 4T (moteurs communs)
-- ------------------------------------------------------------
insert into public.model_specs (model_id, year_from, year_to, oil_qty, oil_type, coolant_qty,
  valve_intake, valve_exhaust, spark_plug, fork_info, fork_clicks, shock_clicks, sag_recommended,
  torques, suggested_intervals, notes)
select ids.id, 2023, 2026,
  '≈ 1,20 L (avec filtre)', '10W-50', '≈ 1,1 L',
  '0,10 – 0,15 mm', '0,12 – 0,17 mm', 'NGK LKAR8AI-9',
  'Fourche WP XACT à air — ≈ 10,5 bar en standard (à froid)',
  'Compression 12 · Détente 12 (base usine)',
  'Basse vitesse 12 · Haute vitesse 1,5 tour · Détente 12 (base usine)',
  '≈ 105 mm (SAG pilote)',
  '[{"name":"Axe de roue avant","value":"35 Nm"},
    {"name":"Vis de bridage de fourche","value":"15 Nm"},
    {"name":"Écrou d''axe arrière","value":"110 Nm"},
    {"name":"Vis de couronne","value":"35 Nm"},
    {"name":"Rayons","value":"5 – 6 Nm"}]'::jsonb,
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Filtre à huile","hours":10,"months":null},
    {"type_name":"Contrôle du jeu aux soupapes","hours":30,"months":null},
    {"type_name":"Piston","hours":50,"months":null},
    {"type_name":"Embrayage","hours":50,"months":null},
    {"type_name":"Vidange de fourche","hours":30,"months":null},
    {"type_name":"Entretien de l''amortisseur","hours":50,"months":null},
    {"type_name":"Liquide de refroidissement","hours":null,"months":12}]'::jsonb,
  'Valeurs indicatives communes à la plate-forme KTM/Husqvarna/GasGas 250 4T récente — à confirmer sur le manuel du millésime.'
from (values
  (pg_temp.model_of('KTM', '250 SX-F')),
  (pg_temp.model_of('Husqvarna', 'FC 250')),
  (pg_temp.model_of('GasGas', 'MC 250F'))
) as ids(id)
where ids.id is not null
on conflict (model_id, year_from) do nothing;

-- KTM 450 SX-F (et cousines 450)
insert into public.model_specs (model_id, year_from, year_to, oil_qty, oil_type, coolant_qty,
  valve_intake, valve_exhaust, spark_plug, fork_info, fork_clicks, shock_clicks, sag_recommended,
  torques, suggested_intervals, notes)
select ids.id, 2023, 2026,
  '≈ 1,25 L (avec filtre)', '10W-50', '≈ 1,2 L',
  '0,10 – 0,15 mm', '0,12 – 0,17 mm', 'NGK LKAR8AI-9',
  'Fourche WP XACT à air — ≈ 10,6 bar en standard (à froid)',
  'Compression 12 · Détente 12 (base usine)',
  'Basse vitesse 12 · Haute vitesse 1,5 tour · Détente 12 (base usine)',
  '≈ 105 mm (SAG pilote)',
  '[{"name":"Axe de roue avant","value":"35 Nm"},
    {"name":"Vis de bridage de fourche","value":"15 Nm"},
    {"name":"Écrou d''axe arrière","value":"110 Nm"},
    {"name":"Vis de couronne","value":"35 Nm"},
    {"name":"Rayons","value":"5 – 6 Nm"}]'::jsonb,
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Filtre à huile","hours":10,"months":null},
    {"type_name":"Contrôle du jeu aux soupapes","hours":30,"months":null},
    {"type_name":"Piston","hours":60,"months":null},
    {"type_name":"Embrayage","hours":50,"months":null},
    {"type_name":"Vidange de fourche","hours":30,"months":null},
    {"type_name":"Entretien de l''amortisseur","hours":50,"months":null},
    {"type_name":"Liquide de refroidissement","hours":null,"months":12}]'::jsonb,
  'Valeurs indicatives plate-forme KTM/Husqvarna/GasGas 450 4T récente — à confirmer sur le manuel du millésime.'
from (values
  (pg_temp.model_of('KTM', '450 SX-F')),
  (pg_temp.model_of('Husqvarna', 'FC 450')),
  (pg_temp.model_of('GasGas', 'MC 450F'))
) as ids(id)
where ids.id is not null
on conflict (model_id, year_from) do nothing;

-- KTM 125 SX (2 temps) et cousines
insert into public.model_specs (model_id, year_from, year_to, oil_qty, oil_type, premix_ratio,
  fork_info, fork_clicks, shock_clicks, sag_recommended, torques, suggested_intervals, notes)
select ids.id, 2019, 2026,
  'Huile de boîte : ≈ 0,70 L', '15W-50 (boîte)', '1:60',
  'Fourche WP XACT à air — ≈ 9,7 bar en standard (à froid)',
  'Compression 12 · Détente 12 (base usine)',
  'Basse vitesse 12 · Haute vitesse 1,5 tour · Détente 12 (base usine)',
  '≈ 105 mm (SAG pilote)',
  '[{"name":"Axe de roue avant","value":"35 Nm"},
    {"name":"Écrou d''axe arrière","value":"110 Nm"},
    {"name":"Vis de couronne","value":"35 Nm"}]'::jsonb,
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Segments","hours":20,"months":null},
    {"type_name":"Piston","hours":40,"months":null},
    {"type_name":"Vidange de fourche","hours":30,"months":null},
    {"type_name":"Entretien de l''amortisseur","hours":50,"months":null}]'::jsonb,
  'Valeurs indicatives 125 2T plate-forme KTM/Husqvarna/GasGas — à confirmer sur le manuel du millésime.'
from (values
  (pg_temp.model_of('KTM', '125 SX')),
  (pg_temp.model_of('Husqvarna', 'TC 125')),
  (pg_temp.model_of('GasGas', 'MC 125'))
) as ids(id)
where ids.id is not null
on conflict (model_id, year_from) do nothing;

-- Yamaha YZ250F
insert into public.model_specs (model_id, year_from, year_to, oil_qty, oil_type, coolant_qty,
  valve_intake, valve_exhaust, fork_info, sag_recommended, suggested_intervals, notes)
select pg_temp.model_of('Yamaha', 'YZ250F'), 2019, 2026,
  '≈ 0,95 L (vidange) / 1,05 L (avec filtre)', '10W-40', '≈ 0,9 L',
  '0,13 – 0,20 mm', '0,17 – 0,24 mm',
  'Fourche KYB SSS à ressorts',
  '≈ 100 – 105 mm (SAG pilote)',
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Filtre à huile","hours":10,"months":null},
    {"type_name":"Contrôle du jeu aux soupapes","hours":30,"months":null},
    {"type_name":"Piston","hours":60,"months":null},
    {"type_name":"Vidange de fourche","hours":30,"months":null}]'::jsonb,
  'Valeurs indicatives — à confirmer sur le manuel du millésime.'
where pg_temp.model_of('Yamaha', 'YZ250F') is not null
on conflict (model_id, year_from) do nothing;

-- Yamaha YZ125
insert into public.model_specs (model_id, year_from, year_to, oil_qty, premix_ratio,
  fork_info, sag_recommended, suggested_intervals, notes)
select pg_temp.model_of('Yamaha', 'YZ125'), 2019, 2026,
  'Huile de boîte : ≈ 0,70 L', '1:30 (préconisation Yamaha)',
  'Fourche KYB SSS à ressorts',
  '≈ 100 – 105 mm (SAG pilote)',
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Segments","hours":20,"months":null},
    {"type_name":"Piston","hours":40,"months":null},
    {"type_name":"Vidange de fourche","hours":30,"months":null}]'::jsonb,
  'Valeurs indicatives — à confirmer sur le manuel du millésime.'
where pg_temp.model_of('Yamaha', 'YZ125') is not null
on conflict (model_id, year_from) do nothing;

-- Honda CRF450R
insert into public.model_specs (model_id, year_from, year_to, oil_qty, oil_type,
  valve_intake, valve_exhaust, sag_recommended, suggested_intervals, notes)
select pg_temp.model_of('Honda', 'CRF450R'), 2021, 2026,
  '≈ 1,15 L (avec filtre)', '10W-30 (préconisation Honda)',
  '0,10 ± 0,03 mm', '0,28 ± 0,03 mm',
  '≈ 105 mm (SAG pilote)',
  '[{"type_name":"Vidange moteur","hours":10,"months":null},
    {"type_name":"Filtre à huile","hours":10,"months":null},
    {"type_name":"Contrôle du jeu aux soupapes","hours":30,"months":null},
    {"type_name":"Piston","hours":60,"months":null}]'::jsonb,
  'Valeurs indicatives — à confirmer sur le manuel du millésime.'
where pg_temp.model_of('Honda', 'CRF450R') is not null
on conflict (model_id, year_from) do nothing;
