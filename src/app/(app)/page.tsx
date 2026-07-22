"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorText, Field, Input, Spinner, StatusPill } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
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
  const [editHours, setEditHours] = useState(false);
  const [hideStart, setHideStart] = useState(true);

  useEffect(() => {
    setHideStart(localStorage.getItem("mc-hide-start") === "1");
  }, []);
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

      {/* Bandeau vidange — seule alerte affichée en bandeau */}
      {vidangeAlert && (
        <Link
          href={`/entretiens/nouveau?moto=${vidangeAlert.moto.id}&type=${data.types.find((t) => t.name === "Vidange moteur")?.id ?? ""}`}
          className={`mb-3 flex items-center gap-3 rounded-card border px-4 py-3 shadow-[var(--shadow-card)] ${
            vidangeAlert.status === "overdue"
              ? "border-danger/25 bg-danger/10"
              : "border-warn/25 bg-warn/10"
          }`}
        >
          <span className="text-2xl" aria-hidden>🛢️</span>
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold ${vidangeAlert.status === "overdue" ? "text-danger" : "text-warn"}`}>
              {vidangeAlert.status === "overdue" ? "Vidange dépassée !" : "Vidange bientôt à faire"}
            </p>
            <p className="truncate text-xs text-ink-dim">
              {motoLabel(vidangeAlert.moto)}
              {vidangeAlert.hoursRemaining !== null &&
                (vidangeAlert.hoursRemaining >= 0
                  ? ` • reste ${formatHours(vidangeAlert.hoursRemaining)}`
                  : ` • dépassée de ${formatHours(-vidangeAlert.hoursRemaining)}`)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white ${vidangeAlert.status === "overdue" ? "bg-danger" : "bg-warn"}`}>
            Enregistrer
          </span>
        </Link>
      )}

      {/* Moto principale — carte héro noire premium */}
      <Link href={`/garage/${primary.id}`} className="block">
        <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#1c1c1e] to-[#0c0c0d] p-5 text-white shadow-[var(--shadow-float)]">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-accent/15 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-white/[0.03]" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Moto principale</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight">{motoLabel(primary)}</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Modifier le compteur d'heures"
                onClick={(e) => {
                  e.preventDefault();
                  setEditHours(true);
                }}
                className="relative flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border-[3px] border-white/30 bg-white/10 active:scale-95"
              >
                <span className="text-lg font-black leading-none">{formatHours(primary.current_hours)}</span>
                <span className="text-[9px] text-white/60">compteur</span>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </span>
              </button>
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
        <ActionChip href="/terrains" icon="🚩" label="Terrains" tint="bg-surface-2" />
        <ActionChip href="/entretiens/nouveau" icon="🔧" label="Entretien" tint="bg-surface-2" />
        <ActionChip href="/suspensions/nouveau" icon="🎚️" label="Réglage" tint="bg-surface-2" />
        <ActionChip href="/finances" icon="💶" label="Finances" tint="bg-surface-2" />
        <ActionChip href="/stats" icon="📊" label="Stats" tint="bg-surface-2" />
      </div>

      {/* Guide de démarrage — disparaît une fois les 3 étapes faites (ou masqué) */}
      {!hideStart && (() => {
        const steps = [
          { done: data.schedules.length > 0, label: "Choisir quoi surveiller (ex : vidange toutes les 5 h)", href: `/garage/${primary.id}/echeances` },
          { done: data.sessions.length > 0, label: "Enregistrer une première session de roulage", href: "/sessions/nouvelle" },
          { done: data.lastSetup !== null, label: "Noter vos réglages de suspensions actuels", href: "/suspensions/nouveau" },
        ];
        if (steps.every((s) => s.done)) return null;
        return (
          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">🚀 Bien démarrer</h2>
              <button
                onClick={() => {
                  localStorage.setItem("mc-hide-start", "1");
                  setHideStart(true);
                }}
                className="min-h-11 px-2 text-sm font-semibold text-ink-dim"
              >
                Masquer
              </button>
            </div>
            <div className="mt-1 flex flex-col">
              {steps.map((step) => (
                <Link key={step.href} href={step.href} className="flex min-h-12 items-center gap-3 border-b border-border py-2 last:border-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      step.done ? "bg-ok/15 text-ok" : "border-2 border-border text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className={`text-sm font-semibold ${step.done ? "text-ink-dim line-through" : ""}`}>{step.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        );
      })()}

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
