-- ============================================================
-- MotoCarnet — Données de référence (communes à tous les utilisateurs)
-- À exécuter après les migrations.
-- ============================================================

-- ------------------------------------------------------------
-- Marques
-- ------------------------------------------------------------
insert into public.motorcycle_brands (name) values
  ('KTM'), ('Husqvarna'), ('GasGas'), ('Yamaha'), ('Honda'),
  ('Kawasaki'), ('Suzuki'), ('Beta'), ('Sherco'), ('TM Racing'), ('Fantic')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Modèles (year_from / year_to : plage de disponibilité)
-- ------------------------------------------------------------
with b as (select id, name from public.motorcycle_brands)
insert into public.motorcycle_models (brand_id, name, version, displacement_label, displacement_cc, stroke, year_from, year_to)
select b.id, m.model, m.version, m.label, m.cc, m.stroke, m.yf, m.yt
from (values
  -- KTM
  ('KTM', '50 SX',        null,               '50',     50,  2, 2018, 2026),
  ('KTM', '65 SX',        null,               '65',     65,  2, 2018, 2026),
  ('KTM', '85 SX',        null,               '85',     85,  2, 2018, 2026),
  ('KTM', '125 SX',       null,               '125',    125, 2, 2018, 2026),
  ('KTM', '150 SX',       null,               '150',    150, 2, 2018, 2022),
  ('KTM', '250 SX',       null,               '250 2T', 250, 2, 2018, 2026),
  ('KTM', '250 SX-F',     null,               '250 4T', 250, 4, 2018, 2026),
  ('KTM', '250 SX-F',     'Factory Edition',  '250 4T', 250, 4, 2023, 2026),
  ('KTM', '300 SX',       null,               '300 2T', 293, 2, 2023, 2026),
  ('KTM', '300 EXC',      null,               '300 2T', 293, 2, 2018, 2026),
  ('KTM', '350 SX-F',     null,               '350 4T', 350, 4, 2018, 2026),
  ('KTM', '450 SX-F',     null,               '450 4T', 450, 4, 2018, 2026),
  ('KTM', '450 SX-F',     'Factory Edition',  '450 4T', 450, 4, 2018, 2026),
  -- Husqvarna
  ('Husqvarna', 'TC 50',  null, '50',     50,  2, 2018, 2026),
  ('Husqvarna', 'TC 65',  null, '65',     65,  2, 2018, 2026),
  ('Husqvarna', 'TC 85',  null, '85',     85,  2, 2018, 2026),
  ('Husqvarna', 'TC 125', null, '125',    125, 2, 2018, 2026),
  ('Husqvarna', 'TC 250', null, '250 2T', 250, 2, 2018, 2026),
  ('Husqvarna', 'TE 300', null, '300 2T', 293, 2, 2018, 2026),
  ('Husqvarna', 'FC 250', null, '250 4T', 250, 4, 2018, 2026),
  ('Husqvarna', 'FC 350', null, '350 4T', 350, 4, 2018, 2026),
  ('Husqvarna', 'FC 450', null, '450 4T', 450, 4, 2018, 2026),
  -- GasGas
  ('GasGas', 'MC 50',   null, '50',     50,  2, 2021, 2026),
  ('GasGas', 'MC 65',   null, '65',     65,  2, 2021, 2026),
  ('GasGas', 'MC 85',   null, '85',     85,  2, 2021, 2026),
  ('GasGas', 'MC 125',  null, '125',    125, 2, 2021, 2026),
  ('GasGas', 'MC 250',  null, '250 2T', 250, 2, 2022, 2026),
  ('GasGas', 'EC 300',  null, '300 2T', 293, 2, 2021, 2026),
  ('GasGas', 'MC 250F', null, '250 4T', 250, 4, 2021, 2026),
  ('GasGas', 'MC 350F', null, '350 4T', 350, 4, 2022, 2026),
  ('GasGas', 'MC 450F', null, '450 4T', 450, 4, 2021, 2026),
  -- Yamaha
  ('Yamaha', 'YZ65',   null, '65',     65,  2, 2018, 2026),
  ('Yamaha', 'YZ85',   null, '85',     85,  2, 2018, 2026),
  ('Yamaha', 'YZ125',  null, '125',    125, 2, 2018, 2026),
  ('Yamaha', 'YZ250',  null, '250 2T', 250, 2, 2018, 2026),
  ('Yamaha', 'YZ250F', null, '250 4T', 250, 4, 2018, 2026),
  ('Yamaha', 'YZ450F', null, '450 4T', 450, 4, 2018, 2026),
  -- Honda
  ('Honda', 'CRF150R', null, '150',    150, 4, 2018, 2026),
  ('Honda', 'CRF250R', null, '250 4T', 250, 4, 2018, 2026),
  ('Honda', 'CRF450R', null, '450 4T', 450, 4, 2018, 2026),
  -- Kawasaki
  ('Kawasaki', 'KX65',  null, '65',     65,  2, 2018, 2026),
  ('Kawasaki', 'KX85',  null, '85',     85,  2, 2018, 2026),
  ('Kawasaki', 'KX250', null, '250 4T', 250, 4, 2018, 2026),
  ('Kawasaki', 'KX450', null, '450 4T', 450, 4, 2018, 2026),
  -- Suzuki
  ('Suzuki', 'RM85',    null, '85',     85,  2, 2018, 2026),
  ('Suzuki', 'RM-Z250', null, '250 4T', 250, 4, 2018, 2026),
  ('Suzuki', 'RM-Z450', null, '450 4T', 450, 4, 2018, 2026),
  -- Beta
  ('Beta', 'RX 300', null, '300 2T', 293, 2, 2022, 2026),
  ('Beta', 'RX 450', null, '450 4T', 450, 4, 2023, 2026),
  -- Sherco
  ('Sherco', 'SE 125',  null, '125',    125, 2, 2018, 2026),
  ('Sherco', 'SE 300',  null, '300 2T', 293, 2, 2018, 2026),
  ('Sherco', 'SEF 250', null, '250 4T', 250, 4, 2018, 2026),
  ('Sherco', 'SEF 450', null, '450 4T', 450, 4, 2018, 2026),
  -- TM Racing
  ('TM Racing', 'MX 85',     null, '85',     85,  2, 2018, 2026),
  ('TM Racing', 'MX 125',    null, '125',    125, 2, 2018, 2026),
  ('TM Racing', 'MX 250',    null, '250 2T', 250, 2, 2018, 2026),
  ('TM Racing', 'MX 250 Fi', null, '250 4T', 250, 4, 2018, 2026),
  ('TM Racing', 'MX 300',    null, '300 2T', 300, 2, 2018, 2026),
  ('TM Racing', 'MX 450 Fi', null, '450 4T', 450, 4, 2018, 2026),
  -- Fantic
  ('Fantic', 'XX 125',  null, '125',    125, 2, 2021, 2026),
  ('Fantic', 'XX 250',  null, '250 2T', 250, 2, 2021, 2026),
  ('Fantic', 'XXF 250', null, '250 4T', 250, 4, 2021, 2026),
  ('Fantic', 'XXF 450', null, '450 4T', 450, 4, 2021, 2026)
) as m(brand, model, version, label, cc, stroke, yf, yt)
join b on b.name = m.brand
on conflict do nothing;

-- ------------------------------------------------------------
-- Types de terrain
-- ------------------------------------------------------------
insert into public.terrain_types (name, sort) values
  ('Sable', 1),
  ('Terre meuble', 2),
  ('Terre dure', 3),
  ('Terrain sec', 4),
  ('Terrain humide', 5),
  ('Boue', 6),
  ('Cailloux', 7),
  ('Terrain rapide', 8),
  ('Terrain technique', 9),
  ('Terrain défoncé', 10),
  ('Supercross', 11),
  ('Prairie', 12)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Types d'entretien (fréquences par défaut indicatives)
-- applies_to_stroke : 2 = 2 temps uniquement, 4 = 4 temps uniquement, null = les deux
-- ------------------------------------------------------------
insert into public.maintenance_types (category, name, default_interval_hours, default_interval_months, applies_to_stroke, sort) values
  -- Moteur
  ('moteur', 'Vidange moteur',              5,    6,    null, 1),
  ('moteur', 'Filtre à huile',              10,   6,    4,    2),
  ('moteur', 'Piston',                      40,   null, null, 3),
  ('moteur', 'Segments',                    20,   null, 2,    4),
  ('moteur', 'Bielle',                      100,  null, null, 5),
  ('moteur', 'Vilebrequin',                 100,  null, null, 6),
  ('moteur', 'Soupapes',                    80,   null, 4,    7),
  ('moteur', 'Contrôle du jeu aux soupapes', 15,  null, 4,    8),
  ('moteur', 'Chaîne de distribution',      60,   null, 4,    9),
  ('moteur', 'Embrayage',                   40,   null, null, 10),
  ('moteur', 'Bougie',                      15,   null, null, 11),
  ('moteur', 'Liquide de refroidissement',  null, 12,   null, 12),
  ('moteur', 'Nettoyage du carburateur',    20,   null, 2,    13),
  ('moteur', 'Contrôle de l''injection',    30,   null, 4,    14),
  -- Partie-cycle
  ('partie_cycle', 'Filtre à air',                 2,    null, null, 1),
  ('partie_cycle', 'Chaîne',                       50,   null, null, 2),
  ('partie_cycle', 'Pignon',                       50,   null, null, 3),
  ('partie_cycle', 'Couronne',                     50,   null, null, 4),
  ('partie_cycle', 'Plaquettes avant',             30,   null, null, 5),
  ('partie_cycle', 'Plaquettes arrière',           25,   null, null, 6),
  ('partie_cycle', 'Liquide de frein',             null, 12,   null, 7),
  ('partie_cycle', 'Roulements de roues',          80,   null, null, 8),
  ('partie_cycle', 'Roulements de direction',      null, 12,   null, 9),
  ('partie_cycle', 'Roulements de bras oscillant', null, 12,   null, 10),
  ('partie_cycle', 'Roulements de biellettes',     null, 12,   null, 11),
  ('partie_cycle', 'Pneus',                        30,   null, null, 12),
  ('partie_cycle', 'Rayons',                       10,   null, null, 13),
  ('partie_cycle', 'Nettoyage général',            2,    null, null, 14),
  ('partie_cycle', 'Graissage général',            5,    null, null, 15),
  -- Suspensions
  ('suspensions', 'Vidange de fourche',        25,   null, null, 1),
  ('suspensions', 'Joints spi',                50,   null, null, 2),
  ('suspensions', 'Bagues de fourche',         100,  null, null, 3),
  ('suspensions', 'Entretien de l''amortisseur', 30, null, null, 4),
  ('suspensions', 'Contrôle de la pression',   2,    null, null, 5),
  ('suspensions', 'Contrôle du ressort',       null, 12,   null, 6),
  ('suspensions', 'Contrôle du SAG',           10,   null, null, 7)
on conflict (category, name) do nothing;

-- ------------------------------------------------------------
-- Recommandations de réglage (les clés correspondent aux symptômes de l'app)
-- ------------------------------------------------------------
insert into public.setup_recommendations (symptom_key, title, advice) values
  ('fork_too_hard',      'Train avant trop dur',
   'Ouvrez légèrement la compression de fourche (1 à 2 clics). Si le problème persiste sur les petits chocs, ouvrez aussi la détente d''un clic. Vérifiez que la dureté du ressort correspond à votre poids.'),
  ('fork_too_soft',      'Train avant trop souple',
   'Fermez légèrement la compression de fourche (1 à 2 clics). Vérifiez le niveau d''huile et la dureté du ressort par rapport à votre poids équipé.'),
  ('rear_too_hard',      'Arrière trop dur',
   'Contrôlez d''abord le SAG avec pilote (~100–105 mm en général). Si le SAG est correct, ouvrez la compression basse vitesse de 1 à 2 clics.'),
  ('rear_too_soft',      'Arrière trop souple / s''enfonce trop',
   'Vérifiez le SAG et augmentez la précharge du ressort si nécessaire. Si le SAG est correct mais que l''arrière s''écrase encore, fermez la compression basse vitesse de 1 à 2 clics ou vérifiez la dureté du ressort.'),
  ('headshake',          'La moto guidonne',
   'Vérifiez la hauteur des tubes de fourche dans les tés (les descendre stabilise), le SAG arrière (trop de SAG allège l''avant) et ralentissez légèrement la détente arrière.'),
  ('dives_braking',      'La moto plonge au freinage',
   'Fermez légèrement la compression de fourche (1 à 2 clics). Une détente arrière trop rapide peut aussi accentuer le transfert : vérifiez-la.'),
  ('lack_traction',      'Manque de motricité',
   'Ouvrez légèrement la compression basse vitesse de l''amortisseur pour laisser la roue suivre le sol. Vérifiez aussi le SAG et la pression du pneu arrière.'),
  ('rebounds',           'La roue rebondit sur les petits chocs',
   'Ouvrez légèrement la détente (1 clic), ou la compression si la suspension semble sèche sur les petits chocs. Une détente trop fermée empêche la roue de revenir au sol.'),
  ('bottoms_out',        'La suspension talonne',
   'Fermez légèrement la compression (1 à 2 clics, haute vitesse pour l''amortisseur). Si le talonnage persiste, la dureté du ressort est probablement insuffisante pour votre poids : faites-la contrôler.'),
  ('hard_to_turn',       'La moto tourne difficilement',
   'Remontez légèrement les tubes de fourche dans les tés (2–3 mm) pour donner plus de poids à l''avant, et vérifiez que le SAG arrière n''est pas trop faible.'),
  ('unstable_high_speed','Moto instable à haute vitesse',
   'Descendez légèrement les tubes de fourche dans les tés, vérifiez le SAG et ralentissez un peu la détente. Sur terrain rapide, privilégiez la stabilité au caractère vif.'),
  ('terrain_sand',       'Base sable',
   'Pour le sable : fermez la compression (fourche et amortisseur) de 2 à 4 clics par rapport à votre base, ralentissez la détente arrière et descendez les tubes de fourche pour plus de stabilité.'),
  ('terrain_hard',       'Base terrain dur / cassant',
   'Pour un terrain dur et cassant : ouvrez la compression de 1 à 3 clics pour plus de confort sur les petits chocs, et accélérez légèrement la détente pour garder le contact avec le sol.')
on conflict (symptom_key) do nothing;
