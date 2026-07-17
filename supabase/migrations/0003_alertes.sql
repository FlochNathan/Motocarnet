-- ============================================================
-- MotoCarnet — Alertes personnalisables et rappels libres
-- À exécuter après 0002_rls.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Échéances : l'utilisateur choisit quoi surveiller et à quel seuil
-- ------------------------------------------------------------
alter table public.maintenance_schedules
  add column alert_enabled boolean not null default true,
  add column alert_before_hours numeric(6, 1)
    check (alert_before_hours is null or alert_before_hours >= 0),
  add column alert_before_months numeric(4, 1)
    check (alert_before_months is null or alert_before_months >= 0);

comment on column public.maintenance_schedules.alert_enabled is
  'false : l''opération garde son statut sur la fiche moto mais ne remonte plus dans les urgences';
comment on column public.maintenance_schedules.alert_before_hours is
  'Passage à l''orange quand il reste moins de X heures (null = 20 % de l''intervalle)';
comment on column public.maintenance_schedules.alert_before_months is
  'Passage à l''orange quand il reste moins de X mois (null = 20 % de l''intervalle)';

-- ------------------------------------------------------------
-- Rappels libres liés à une moto (contrôle technique, licence…)
-- ------------------------------------------------------------
create table public.custom_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles (id) on delete cascade,
  title text not null,
  due_date date,
  due_hours numeric(7, 2) check (due_hours is null or due_hours >= 0),
  note text,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reminder_has_target check (due_date is not null or due_hours is not null)
);

create index idx_reminders_moto on public.custom_reminders (motorcycle_id, done);
create index idx_reminders_user on public.custom_reminders (user_id);

alter table public.custom_reminders enable row level security;

create policy "rappels : propriétaire" on public.custom_reminders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
