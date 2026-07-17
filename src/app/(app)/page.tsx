"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Spinner, StatusPill } from "@/components/ui";
import Doodles, { HandUnderline } from "@/components/Doodles";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatHours, formatMinutes, todayISO } from "@/lib/format";
import { buildMaintenanceOverview, urgentItems } from "@/lib/overview";
import { computeReminderStatus, DUE_STATUS_LABELS, type DueStatus } from "@/lib/maintenance";
import type {
  CustomReminder, MaintenanceRecord, MaintenanceSchedule, MaintenanceType,
  MotorcycleWithModel, RidingSession, SuspensionSetup, TerrainType,
} from "@/lib/types";

interface DashboardData {
  displayName: string;
  motos: MotorcycleWithModel[];
  sessions: RidingSession[];
  types: MaintenanceType[];
  schedules: MaintenanceSchedule[];
  records: MaintenanceRecord[];
  reminders: CustomReminder[];
  lastSetup: SuspensionSetup | null;
  terrains: TerrainType[];
}

/** Entrée unifiée de la liste « à prévoir » : entretien surveillé ou rappel libre */
interface UrgentEntry {
  key: string;
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  status: DueStatus;
  detail: string | null;
  sortValue: number;
}

export default function AccueilPage() {
  const { data, loading } = useSupabaseQuery<DashboardData>(async (sb) => {
    const [profile, motos, sessions, types, schedules, records, reminders, setups, terrains] = await Promise.all([
      sb.from("profiles").select("display_name").single(),
      sb.from("motorcycles").select(MOTO_SELECT).order("is_primary", { ascending: false }).order("created_at"),
      sb.from("riding_sessions").select("*").order("session_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
      sb.from("maintenance_types").select("*"),
      sb.from("maintenance_schedules").select("*"),
      sb.from("maintenance_records").select("*"),
      sb.from("custom_reminders").select("*").eq("done", false),
      sb.from("suspension_setups").select("*").order("updated_at", { ascending: false }).limit(1),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      displayName: (profile.data as { display_name: string | null } | null)?.display_name ?? "",
      motos: must(motos), sessions: must(sessions), types: must(types),
      schedules: must(schedules), records: must(records), reminders: must(reminders),
      lastSetup: must(setups)[0] ?? null, terrains: must(terrains),
    };
  });

  if (loading || !data) return <Spinner />;

  const firstName = data.displayName.split(/[\s#]/)[0] || "pilote";
  const activeMotos = data.motos.filter((m) => m.status === "active");
  const primary = activeMotos.find((m) => m.is_primary) ?? activeMotos[0] ?? data.motos[0] ?? null;

  if (!primary) {
    return (
      <div className="relative">
        <Doodles />
        <Greeting name={firstName} />
        <EmptyState
          icon="🏍️"
          title="Bienvenue dans le paddock !"
          text="Commencez par ajouter votre première moto dans le garage."
          action={<ButtonLink href="/garage/nouvelle">Ajouter ma moto</ButtonLink>}
        />
      </div>
    );
  }

  const today = todayISO();
  const rank: Record<DueStatus, number> = { overdue: 0, soon: 1, ok: 2, none: 3 };
  const urgent: UrgentEntry[] = [];

  // Entretiens surveillés (alertes actives uniquement)
  for (const moto of activeMotos) {
    const items = buildMaintenanceOverview(moto, moto.motorcycle_models.stroke, data.types, data.schedules, data.records, today);
    for (const item of urgentItems(items)) {
      urgent.push({
        key: `m-${moto.id}-${item.type.id}`,
        href: `/garage/${moto.id}`,
        icon: item.type.category === "moteur" ? "⚙️" : item.type.category === "suspensions" ? "🎚️" : "🔧",
        title: item.type.name,
        subtitle: motoLabel(moto),
        status: item.due.status,
        detail:
          item.due.hoursRemaining !== null
            ? item.due.hoursRemaining >= 0
              ? `${formatHours(item.due.hoursRemaining)} restantes`
              : `dépassé de ${formatHours(-item.due.hoursRemaining)}`
            : null,
        sortValue: item.due.hoursRemaining ?? 0,
      });
    }
  }

  // Rappels libres échus ou proches
  for (const r of data.reminders) {
    const moto = data.motos.find((m) => m.id === r.motorcycle_id);
    if (!moto || moto.status === "sold") continue;
    const status = computeReminderStatus(r, moto.current_hours, today);
    if (status !== "overdue" && status !== "soon") continue;
    urgent.push({
      key: `r-${r.id}`,
      href: "/entretiens",
      icon: "🔔",
      title: r.title,
      subtitle: motoLabel(moto),
      status,
      detail: r.due_date ? formatDate(r.due_date) : r.due_hours !== null ? `à ${formatHours(r.due_hours)}` : null,
      sortValue: 0,
    });
  }

  urgent.sort((a, b) => rank[a.status] - rank[b.status] || a.sortValue - b.sortValue);

  const lastSession = data.sessions.find((s) => s.motorcycle_id === primary.id) ?? data.sessions[0] ?? null;
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name ?? null;

  // Prochaine échéance (la plus proche en heures restantes, hors dépassées)
  const primaryItems = buildMaintenanceOverview(primary, primary.motorcycle_models.stroke, data.types, data.schedules, data.records, today);
  const nextDue = primaryItems
    .filter((i) => i.alertEnabled && (i.due.status === "ok" || i.due.status === "soon"))
    .sort((a, b) => (a.due.hoursRemaining ?? Infinity) - (b.due.hoursRemaining ?? Infinity))[0];

  return (
    <div className="relative">
      <Doodles />
      <Greeting name={firstName} />

      {/* Moto principale — carte héro violette */}
      <Link href={`/garage/${primary.id}`} className="block">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet to-violet-strong p-5 text-white shadow-[var(--shadow-float)]">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/5" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Moto principale</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight">{motoLabel(primary)}</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border-[3px] border-white/30 bg-white/10">
                <span className="text-lg font-black leading-none">{formatHours(primary.current_hours)}</span>
                <span className="text-[9px] text-white/60">compteur</span>
              </div>
              {lastSession && (
                <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border-[3px] border-accent/70 bg-white/10">
                  <span className="text-lg font-black leading-none">{formatMinutes(lastSession.duration_minutes)}</span>
                  <span className="text-[9px] text-white/60">dernière</span>
                </div>
              )}
            </div>
            <div className="pb-1 text-right">
              {lastSession && <p className="text-xs text-white/60">{formatDate(lastSession.session_date)}</p>}
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold">
                Voir la fiche
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </p>
            </div>
          </div>
        </div>
      </Link>

      {/* Actions rapides — chips à pastille d'icône */}
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <ActionChip href="/sessions/nouvelle" icon="🏁" label="Session" tint="bg-accent-soft" />
        <ActionChip href="/entretiens/nouveau" icon="🔧" label="Entretien" tint="bg-violet/15" />
        <ActionChip href="/suspensions/nouveau" icon="🎚️" label="Réglage" tint="bg-ok/10" />
        <ActionChip href="/finances" icon="💶" label="Finances" tint="bg-violet/10" />
        <ActionChip href="/stats" icon="📊" label="Stats" tint="bg-warn/10" />
      </div>

      {/* Entretiens urgents */}
      <section className="mt-6">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold">À prévoir</h2>
          <Link href="/entretiens" className="text-sm font-bold text-accent-strong">Tout voir</Link>
        </div>
        {urgent.length === 0 ? (
          <Card className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ok/10 text-xl" aria-hidden>✅</span>
            <p className="text-sm font-semibold text-ink-dim">Tout est à jour. Roulez tranquille !</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {urgent.slice(0, 4).map((entry) => (
              <Link key={entry.key} href={entry.href}>
                <Card className="flex items-center gap-3 py-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-xl" aria-hidden>
                    {entry.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{entry.title}</p>
                    <p className="truncate text-xs text-ink-dim">{entry.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusPill status={entry.status} label={DUE_STATUS_LABELS[entry.status]} />
                    {entry.detail && <p className="mt-1 text-xs text-ink-dim">{entry.detail}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Prochaine échéance + dernier réglage */}
      <section className="mt-6 grid grid-cols-1 gap-2.5">
        {nextDue && (
          <Card className="flex items-center gap-3 py-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet/15 text-xl" aria-hidden>📅</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Prochaine échéance</p>
              <p className="truncate font-bold">{nextDue.type.name}</p>
            </div>
            <Badge>
              {nextDue.due.hoursRemaining !== null
                ? `dans ${formatHours(Math.max(0, nextDue.due.hoursRemaining))}`
                : nextDue.due.monthsRemaining !== null
                  ? `dans ${Math.max(0, Math.round(nextDue.due.monthsRemaining))} mois`
                  : ""}
            </Badge>
          </Card>
        )}
        {data.lastSetup && (
          <Link href={`/suspensions/${data.lastSetup.id}`}>
            <Card className="flex items-center gap-3 py-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-warn/10 text-xl" aria-hidden>🎚️</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-dim">Dernier réglage</p>
                <p className="truncate font-bold">
                  {data.lastSetup.is_favorite && "⭐ "}
                  {data.lastSetup.name}
                </p>
              </div>
              <Badge>{terrainName(data.lastSetup.terrain_type_id) ?? "Terrain libre"}</Badge>
            </Card>
          </Link>
        )}
      </section>
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  const initial = (name[0] ?? "P").toUpperCase();
  return (
    <header className="pb-5 pt-3">
      <div className="mb-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-banner.png" alt="PitLog" className="h-10 w-auto rounded-xl" />
        <Link
          href="/profil"
          aria-label="Mon profil"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-violet/20 text-lg font-black text-violet-strong"
        >
          {initial}
        </Link>
      </div>
      <h1 className="text-[2rem] font-extrabold leading-[1.15] tracking-tight">
        Salut {name},<br />prêt à rouler ?
      </h1>
      <HandUnderline className="mt-2" />
    </header>
  );
}

function ActionChip({ href, icon, label, tint }: { href: string; icon: string; label: string; tint: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-surface py-1.5 pl-2 pr-4 font-bold shadow-[var(--shadow-card)]"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${tint}`} aria-hidden>{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
