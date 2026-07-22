"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, ButtonLink, Card, EmptyState, ErrorText, Field, Input, Spinner, StatusPill } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatHours, todayISO } from "@/lib/format";
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
  const [editHours, setEditHours] = useState(false);

  const { data, loading, reload } = useSupabaseQuery<DashboardData>(async (sb) => {
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
  // La vidange est la seule opération qui déclenche un bandeau d'alerte en haut de l'accueil
  let vidangeAlert: { moto: MotorcycleWithModel; hoursRemaining: number | null; status: DueStatus } | null = null;
  for (const moto of activeMotos) {
    const items = buildMaintenanceOverview(moto, moto.motorcycle_models.stroke, data.types, data.schedules, data.records, today);
    const vidange = items.find(
      (i) => i.alertEnabled && i.type.name === "Vidange moteur" && (i.due.status === "overdue" || i.due.status === "soon"),
    );
    if (vidange && (!vidangeAlert || (vidange.due.status === "overdue" && vidangeAlert.status !== "overdue"))) {
      vidangeAlert = { moto, hoursRemaining: vidange.due.hoursRemaining, status: vidange.due.status };
    }
    for (const item of urgentItems(items)) {
      urgent.push({
        key: `m-${moto.id}-${item.type.id}`,
        // Un tap ouvre directement l'enregistrement pré-rempli de l'entretien
        href: `/entretiens/nouveau?moto=${moto.id}&type=${item.type.id}`,
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
      <Greeting name={firstName} />

      {/* Alerte vidange — ligne discrète, uniquement si nécessaire */}
      {vidangeAlert && (
        <Link
          href={`/entretiens/nouveau?moto=${vidangeAlert.moto.id}&type=${data.types.find((t) => t.name === "Vidange moteur")?.id ?? ""}`}
          className="mb-6 flex items-center gap-3 rounded-[18px] border border-border bg-surface px-5 py-4"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${vidangeAlert.status === "overdue" ? "bg-danger" : "bg-accent"}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {vidangeAlert.status === "overdue" ? "Vidange dépassée" : "Vidange bientôt à faire"}
            </p>
            <p className="truncate text-[13px] text-ink-dim">
              {vidangeAlert.hoursRemaining !== null &&
                (vidangeAlert.hoursRemaining >= 0
                  ? `reste ${formatHours(vidangeAlert.hoursRemaining)}`
                  : `dépassée de ${formatHours(-vidangeAlert.hoursRemaining)}`)}
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-dim"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      )}

      {/* Moto principale — bloc noir premium, épuré */}
      <Link href={`/garage/${primary.id}`} className="block">
        <div className="rounded-[18px] bg-[#111112] p-6 text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Moto principale</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{motoLabel(primary)}</p>
          <div className="mt-8 flex items-end justify-between">
            <button
              type="button"
              aria-label="Modifier le compteur d'heures"
              onClick={(e) => {
                e.preventDefault();
                setEditHours(true);
              }}
              className="text-left"
            >
              <span className="text-4xl font-bold tracking-tight text-accent">{formatHours(primary.current_hours)}</span>
              <span className="mt-1 block text-[13px] text-white/40">compteur moteur · modifier</span>
            </button>
            {lastSession && (
              <p className="pb-1 text-right text-[13px] text-white/40">
                dernière sortie<br />
                <span className="text-white/70">{formatDate(lastSession.session_date)}</span>
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* À prévoir — liste épurée façon Linear */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-dim">À prévoir</h2>
          <Link href="/entretiens" className="text-[13px] font-semibold text-accent">Tout voir</Link>
        </div>
        {urgent.length === 0 ? (
          <p className="text-[15px] text-ink-dim">Tout est à jour.</p>
        ) : (
          <Card className="divide-y divide-border p-0">
            {urgent.slice(0, 3).map((entry) => (
              <Link key={entry.key} href={entry.href} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-2/50">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.title}</p>
                  <p className="truncate text-[13px] text-ink-dim">{entry.subtitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusPill status={entry.status} label={DUE_STATUS_LABELS[entry.status]} />
                  {entry.detail && <p className="mt-1 text-[12px] text-ink-dim">{entry.detail}</p>}
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* Dernier réglage — une ligne discrète */}
      {data.lastSetup && (
        <section className="mt-10">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-dim">Dernier réglage</h2>
          <Link href={`/suspensions/${data.lastSetup.id}`} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-2/50">
            <p className="truncate font-medium">
              {data.lastSetup.is_favorite && "⭐ "}
              {data.lastSetup.name}
            </p>
            <span className="shrink-0 text-[13px] text-ink-dim">{terrainName(data.lastSetup.terrain_type_id) ?? "Terrain libre"}</span>
          </Link>
        </section>
      )}

      {editHours && (
        <HoursEditor
          moto={primary}
          onClose={() => setEditHours(false)}
          onSaved={() => {
            setEditHours(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

/** Modification rapide du compteur d'heures depuis l'accueil */
function HoursEditor({ moto, onClose, onSaved }: { moto: MotorcycleWithModel; onClose: () => void; onSaved: () => void }) {
  const total = Math.round(moto.current_hours * 60);
  const [h, setH] = useState(String(Math.floor(total / 60)));
  const [m, setM] = useState(String(total % 60));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    const hours = (parseInt(h) || 0) + (parseInt(m) || 0) / 60;
    if (hours < 0 || (parseInt(m) || 0) > 59) {
      setError("Valeur invalide (minutes entre 0 et 59).");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("motorcycles")
      .update({ current_hours: hours })
      .eq("id", moto.id);
    setBusy(false);
    if (updateError) {
      setError("Enregistrement impossible. Réessayez.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="Modifier le compteur d'heures">
      <Card className="w-full max-w-sm shadow-[var(--shadow-float)]">
        <p className="text-lg font-extrabold">Compteur d'heures</p>
        <p className="mt-0.5 text-sm text-ink-dim">{motoLabel(moto)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Heures">
            <Input type="number" min={0} inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} autoFocus />
          </Field>
          <Field label="Minutes">
            <Input type="number" min={0} max={59} inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-ink-dim">
          À utiliser pour recaler le compteur sur la valeur réelle de l'horamètre. Les sessions continuent de s'ajouter automatiquement.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <ErrorText>{error}</ErrorText>
          <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
        </div>
      </Card>
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  const initial = (name[0] ?? "M").toUpperCase();
  return (
    <header className="pb-6 pt-3">
      <div className="mb-6 flex items-center justify-between">
        <Wordmark />
        <Link
          href="/profil"
          aria-label="Mon profil"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-black text-white"
        >
          {initial}
        </Link>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Bonjour</p>
      <h1 className="mt-1 text-[2.1rem] font-extrabold leading-[1.1] tracking-tight">{name}</h1>
    </header>
  );
}

