-- ============================================================
-- PitLog — Terrains suivis et posts Facebook (via flux RSS)
-- À exécuter après 0005_fiches_techniques.sql.
-- ============================================================

-- Terrains suivis par l'utilisateur
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  city text,
  facebook_url text,
  -- Flux RSS de la page Facebook (généré via une passerelle type rss.app)
  feed_url text,
  terrain_type_id integer references public.terrain_types (id) on delete set null,
  notes text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_tracks_user on public.tracks (user_id);

-- Posts récupérés depuis les flux (30 derniers conservés par terrain)
create table public.track_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  title text,
  content text,
  link text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (track_id, link)
);

create index idx_track_posts on public.track_posts (track_id, published_at desc);

alter table public.tracks enable row level security;
alter table public.track_posts enable row level security;

create policy "terrains suivis : propriétaire" on public.tracks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "posts terrains : propriétaire" on public.track_posts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
