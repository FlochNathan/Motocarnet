-- ============================================================
-- PitLog — Catalogue de terrains par région (commun à tous)
-- L'utilisateur choisit une région et voit tous ses terrains.
-- Remplace le modèle « chaque pilote colle ses liens ».
-- À exécuter après 0008_post_image.sql.
-- ============================================================

drop table if exists public.track_posts cascade;
drop table if exists public.tracks cascade;

-- Catalogue commun : géré par les administrateurs, lu par tous
create table public.track_catalog (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  name text not null,
  city text,
  facebook_url text,
  terrain_type_id integer references public.terrain_types (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_catalog_region on public.track_catalog (region) where active;

-- État de récupération partagé (un seul scraping profite à tout le monde)
create table public.track_scrape (
  catalog_id uuid primary key references public.track_catalog (id) on delete cascade,
  last_fetched_at timestamptz,
  scrape_run_id text,
  scrape_started_at timestamptz
);

-- Annonces récupérées (contenu Facebook public, partagé entre utilisateurs)
create table public.track_posts (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.track_catalog (id) on delete cascade,
  title text,
  content text,
  link text not null,
  image_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (catalog_id, link)
);

create index idx_posts_catalog on public.track_posts (catalog_id, published_at desc);

-- ------------------------------------------------------------
-- Sécurité
-- ------------------------------------------------------------
alter table public.track_catalog enable row level security;
alter table public.track_scrape enable row level security;
alter table public.track_posts enable row level security;

-- Catalogue : lecture pour tous les connectés, gestion réservée aux admins
create policy "catalogue : lecture" on public.track_catalog for select to authenticated using (true);
create policy "catalogue : gestion admin" on public.track_catalog for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- État de scraping et annonces : opérationnels et partagés (contenu public)
create policy "scrape : lecture" on public.track_scrape for select to authenticated using (true);
create policy "scrape : écriture" on public.track_scrape for all to authenticated using (true) with check (true);

create policy "annonces : lecture" on public.track_posts for select to authenticated using (true);
create policy "annonces : écriture" on public.track_posts for all to authenticated using (true) with check (true);
