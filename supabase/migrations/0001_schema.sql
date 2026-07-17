-- ============================================================
-- MotoCarnet — Schéma de base de données
-- À exécuter dans l'éditeur SQL de Supabase (ou via supabase db push)
-- ============================================================

-- ------------------------------------------------------------
-- Profils utilisateurs (lié à auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  rider_weight_kg numeric(5, 1) check (rider_weight_kg is null or (rider_weight_kg > 20 and rider_weight_kg < 200)),
  rider_level text check (rider_level in ('debutant', 'loisir', 'confirme', 'competition')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonction utilitaire : l'utilisateur courant est-il administrateur ?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ------------------------------------------------------------
-- Référentiel motos (données communes, gérées par les admins)
-- ------------------------------------------------------------
create table public.motorcycle_brands (
  id serial primary key,
  name text not null unique,
  active boolean not null default true
);

create table public.motorcycle_models (
  id serial primary key,
  brand_id integer not null references public.motorcycle_brands (id) on delete cascade,
  name text not null,
  version text, -- ex : « Factory Edition »
  displacement_label text not null check (displacement_label in (
    '50', '65', '85', '125', '150', '250 2T', '250 4T', '300 2T', '350 4T', '450 4T'
  )),
  displacement_cc integer not null check (displacement_cc between 50 and 800),
  stroke smallint not null check (stroke in (2, 4)),
  year_from integer not null check (year_from between 1970 and 2100),
  year_to integer not null check (year_to between 1970 and 2100),
  active boolean not null default true,
  constraint year_range_valid check (year_to >= year_from)
);

-- Unicité d'un modèle (version null traitée comme chaîne vide)
create unique index model_unique
  on public.motorcycle_models (brand_id, name, coalesce(version, ''), year_from);

create index idx_models_brand on public.motorcycle_models (brand_id);

-- ------------------------------------------------------------
-- Types de terrain (référentiel commun)
-- ------------------------------------------------------------
create table public.terrain_types (
  id serial primary key,
  name text not null unique,
  sort integer not null default 0,
  active boolean not null default true
);

-- ------------------------------------------------------------
-- Types d'entretien (référentiel commun)
-- ------------------------------------------------------------
create table public.maintenance_types (
  id serial primary key,
  category text not null check (category in ('moteur', 'partie_cycle', 'suspensions')),
  name text not null,
  -- Fréquences par défaut proposées à la création du planning d'une moto
  default_interval_hours numeric(6, 1) check (default_interval_hours is null or default_interval_hours > 0),
  default_interval_months integer check (default_interval_months is null or default_interval_months > 0),
  applies_to_stroke smallint check (applies_to_stroke in (2, 4)), -- null = les deux
  sort integer not null default 0,
  active boolean not null default true,
  unique (category, name)
);

-- ------------------------------------------------------------
-- Motos de l'utilisateur
-- ------------------------------------------------------------
create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  model_id integer not null references public.motorcycle_models (id) on delete restrict,
  year integer not null check (year between 1970 and 2100),
  photo_url text,
  serial_number text,
  purchase_date date,
  purchase_hours numeric(7, 2) not null default 0 check (purchase_hours >= 0),
  current_hours numeric(7, 2) not null default 0 check (current_hours >= 0),
  notes text,
  status text not null default 'active' check (status in ('active', 'sold', 'repair')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_motorcycles_user on public.motorcycles (user_id);

-- ------------------------------------------------------------
-- Sessions de roulage (compteur d'heures)
-- ------------------------------------------------------------
create table public.riding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  session_date date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 24 * 60),
  terrain_type_id integer references public.terrain_types (id) on delete set null,
  track_name text,
  conditions text check (conditions is null or conditions in (
    'sec', 'humide', 'boueux', 'poussiereux', 'gele', 'variable'
  )),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_sessions_moto on public.riding_sessions (motorcycle_id, session_date desc);
create index idx_sessions_user on public.riding_sessions (user_id);

-- Le compteur total de la moto suit automatiquement les sessions
create or replace function public.sync_motorcycle_hours()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.motorcycles
      set current_hours = current_hours + new.duration_minutes / 60.0
      where id = new.motorcycle_id;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    update public.motorcycles
      set current_hours = greatest(0, current_hours - old.duration_minutes / 60.0)
      where id = old.motorcycle_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_session_change
  after insert or update of duration_minutes, motorcycle_id or delete on public.riding_sessions
  for each row execute function public.sync_motorcycle_hours();

-- ------------------------------------------------------------
-- Carnet d'entretien
-- ------------------------------------------------------------
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_type_id integer not null references public.maintenance_types (id) on delete restrict,
  record_date date not null default current_date,
  hours_at numeric(7, 2) not null check (hours_at >= 0),
  parts_replaced text,
  cost numeric(8, 2) check (cost is null or cost >= 0),
  workshop text,
  comment text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index idx_maintenance_moto on public.maintenance_records (motorcycle_id, record_date desc);
create index idx_maintenance_user on public.maintenance_records (user_id);
create index idx_maintenance_type on public.maintenance_records (maintenance_type_id);

-- Échéances d'entretien définies par l'utilisateur, par moto et par opération
create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_type_id integer not null references public.maintenance_types (id) on delete cascade,
  interval_hours numeric(6, 1) check (interval_hours is null or interval_hours > 0),
  interval_months integer check (interval_months is null or interval_months > 0),
  constraint schedule_has_interval check (interval_hours is not null or interval_months is not null),
  unique (motorcycle_id, maintenance_type_id)
);

create index idx_schedules_moto on public.maintenance_schedules (motorcycle_id);

-- ------------------------------------------------------------
-- Réglages de suspensions
-- ------------------------------------------------------------
create table public.suspension_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  name text not null,
  rider_weight_kg numeric(5, 1),
  rider_level text check (rider_level in ('debutant', 'loisir', 'confirme', 'competition')),
  terrain_type_id integer references public.terrain_types (id) on delete set null,
  terrain_conditions text check (terrain_conditions is null or terrain_conditions in (
    'sec', 'humide', 'boueux', 'poussiereux', 'gele', 'variable'
  )),
  temperature_c numeric(4, 1),
  tire_type text,
  tire_pressure_front_bar numeric(3, 2) check (tire_pressure_front_bar is null or tire_pressure_front_bar between 0.3 and 3),
  tire_pressure_rear_bar numeric(3, 2) check (tire_pressure_rear_bar is null or tire_pressure_rear_bar between 0.3 and 3),
  -- Fourche
  fork_compression_clicks integer,
  fork_rebound_clicks integer,
  fork_preload_turns numeric(4, 1),
  fork_height_mm numeric(4, 1),        -- hauteur des tubes dans les tés
  fork_air_pressure_bar numeric(5, 2), -- fourche pneumatique
  fork_spring_rate text,               -- ex : « 4.4 N/mm »
  -- Amortisseur
  shock_lsc_clicks integer,            -- compression basse vitesse
  shock_hsc_turns numeric(4, 2),       -- compression haute vitesse
  shock_rebound_clicks integer,
  shock_preload_mm numeric(4, 1),
  shock_sag_static_mm numeric(4, 1),
  shock_sag_rider_mm numeric(4, 1),
  shock_spring_rate text,              -- ex : « 45 N/mm »
  is_favorite boolean not null default false,
  rating smallint check (rating is null or rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_setups_moto on public.suspension_setups (motorcycle_id);
create index idx_setups_user on public.suspension_setups (user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_setup_update
  before update on public.suspension_setups
  for each row execute function public.touch_updated_at();

-- Historique des versions d'un réglage (pour revenir en arrière)
create table public.suspension_setup_revisions (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.suspension_setups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_revisions_setup on public.suspension_setup_revisions (setup_id, created_at desc);

-- Ressenti pilote après roulage
create table public.suspension_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  setup_id uuid not null references public.suspension_setups (id) on delete cascade,
  session_id uuid references public.riding_sessions (id) on delete set null,
  feedback_date date not null default current_date,
  symptoms text[] not null default '{}',
  comfort smallint check (comfort is null or comfort between 1 and 5),
  confidence smallint check (confidence is null or confidence between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_feedback_setup on public.suspension_feedback (setup_id);

-- Recommandations de réglage (référentiel commun, administrable)
create table public.setup_recommendations (
  id serial primary key,
  symptom_key text not null unique,
  title text not null,
  advice text not null,
  active boolean not null default true
);

-- ------------------------------------------------------------
-- Pièces, dépenses, pièces jointes
-- ------------------------------------------------------------
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  name text not null,
  reference text,
  installed_date date,
  installed_at_hours numeric(7, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_parts_moto on public.parts (motorcycle_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  expense_date date not null default current_date,
  category text not null default 'autre' check (category in ('entretien', 'piece', 'essence', 'equipement', 'inscription', 'autre')),
  label text not null,
  amount numeric(8, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index idx_expenses_moto on public.expenses (motorcycle_id, expense_date desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid references public.motorcycles (id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records (id) on delete cascade,
  url text not null,
  label text,
  created_at timestamptz not null default now()
);

create index idx_attachments_moto on public.attachments (motorcycle_id);
