-- ============================================================
-- PitLog — Image des annonces de terrain
-- À exécuter après 0007_apify.sql.
-- ============================================================

alter table public.track_posts add column image_url text;
