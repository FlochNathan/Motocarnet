-- ============================================================
-- MotoCarnet — Sécurité (Row Level Security)
-- Chaque utilisateur n'accède qu'à ses propres données.
-- Les référentiels sont en lecture seule (écriture réservée aux admins).
-- ============================================================

-- ------------------------------------------------------------
-- Profils
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profil : lecture de son propre profil"
  on public.profiles for select using (id = auth.uid());

create policy "profil : mise à jour de son propre profil"
  on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

-- ------------------------------------------------------------
-- Référentiels communs : lecture pour tous les connectés,
-- écriture réservée aux administrateurs
-- ------------------------------------------------------------
alter table public.motorcycle_brands enable row level security;
alter table public.motorcycle_models enable row level security;
alter table public.terrain_types enable row level security;
alter table public.maintenance_types enable row level security;
alter table public.setup_recommendations enable row level security;

create policy "marques : lecture" on public.motorcycle_brands for select to authenticated using (true);
create policy "marques : gestion admin" on public.motorcycle_brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "modèles : lecture" on public.motorcycle_models for select to authenticated using (true);
create policy "modèles : gestion admin" on public.motorcycle_models for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "terrains : lecture" on public.terrain_types for select to authenticated using (true);
create policy "terrains : gestion admin" on public.terrain_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "types entretien : lecture" on public.maintenance_types for select to authenticated using (true);
create policy "types entretien : gestion admin" on public.maintenance_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "recommandations : lecture" on public.setup_recommendations for select to authenticated using (true);
create policy "recommandations : gestion admin" on public.setup_recommendations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Données personnelles : accès complet limité au propriétaire
-- ------------------------------------------------------------
alter table public.motorcycles enable row level security;
alter table public.riding_sessions enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.suspension_setups enable row level security;
alter table public.suspension_setup_revisions enable row level security;
alter table public.suspension_feedback enable row level security;
alter table public.parts enable row level security;
alter table public.expenses enable row level security;
alter table public.attachments enable row level security;

create policy "motos : propriétaire" on public.motorcycles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sessions : propriétaire" on public.riding_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "entretiens : propriétaire" on public.maintenance_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "échéances : propriétaire" on public.maintenance_schedules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "réglages : propriétaire" on public.suspension_setups for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "révisions réglages : propriétaire" on public.suspension_setup_revisions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ressentis : propriétaire" on public.suspension_feedback for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "pièces : propriétaire" on public.parts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "dépenses : propriétaire" on public.expenses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "pièces jointes : propriétaire" on public.attachments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- Stockage : bucket « photos », chaque utilisateur dans son dossier
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos : lecture propriétaire" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos : ajout propriétaire" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos : suppression propriétaire" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
