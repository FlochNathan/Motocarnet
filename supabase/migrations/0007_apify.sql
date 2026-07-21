-- ============================================================
-- PitLog — Récupération automatique des annonces Facebook via Apify
-- À exécuter après 0006_terrains.sql.
-- ============================================================

-- Jeton API Apify de l'utilisateur (protégé par la RLS existante sur profiles :
-- seul le propriétaire lit/écrit sa ligne).
alter table public.profiles add column apify_token text;

-- Suivi d'un run de scraping en cours pour chaque terrain
alter table public.tracks
  add column scrape_run_id text,
  add column scrape_started_at timestamptz;
