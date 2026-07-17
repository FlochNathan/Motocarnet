"use client";

import { use, useMemo, useState } from "react";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatEuro, formatHours, formatMinutes } from "@/lib/format";
import { Card, ChipGroup, EmptyState, PageHeader, Spinner } from "@/components/ui";
import type {
  Expense, MaintenanceRecord, MaintenanceType,
  MotorcycleWithModel, RidingSession, SuspensionSetup, TerrainType,
} from "@/lib/types";

type EventKind = "session" | "entretien" | "reglage" | "depense";

interface TimelineEvent {
  kind: EventKind;
  date: string;
  title: string;
  details: string[];
  cost: number | null;
}

const KIND_META: Record<EventKind, { label: string; icon: string }> = {
  session: { label: "Sessions", icon: "🏁" },
  entretien: { label: "Entretiens", icon: "🔧" },
  reglage: { label: "Réglages", icon: "🎚️" },
  depense: { label: "Dépenses", icon: "💶" },
};

const PERIODS = [
  { value: 0, label: "Tout" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "3 mois" },
  { value: 365, label: "12 mois" },
];

export default function HistoriquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [kinds, setKinds] = useState<EventKind[]>([]);
  const [period, setPeriod] = useState<number | null>(0);

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [moto, sessions, records, types, setups, expenses, terrains] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single(),
      sb.from("riding_sessions").select("*").eq("motorcycle_id", id),
      sb.from("maintenance_records").select("*").eq("motorcycle_id", id),
      sb.from("maintenance_types").select("*"),
      sb.from("suspension_setups").select("*").eq("motorcycle_id", id),
      sb.from("expenses").select("*").eq("motorcycle_id", id),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      moto: must(moto) as MotorcycleWithModel,
      sessions: must(sessions) as RidingSession[],
      records: must(records) as MaintenanceRecord[],
      types: must(types) as MaintenanceType[],
      setups: must(setups) as SuspensionSetup[],
      expenses: must(expenses) as Expense[],
      terrains: must(terrains) as TerrainType[],
    };
  }, [id]);

  const events = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const typeName = (tid: number) => data.types.find((t) => t.id === tid)?.name ?? "Entretien";
    const terrainName = (tid: number | null) => data.terrains.find((t) => t.id === tid)?.name;

    const list: TimelineEvent[] = [
      ...data.sessions.map((s): TimelineEvent => ({
        kind: "session",
        date: s.session_date,
        title: `Session — ${formatMinutes(s.duration_minutes)}`,
        details: [
          [terrainName(s.terrain_type_id), s.track_name].filter(Boolean).join(" • "),
          s.comment ?? "",
        ].filter(Boolean),
        cost: null,
      })),
      ...data.records.map((r): TimelineEvent => ({
        kind: "entretien",
        date: r.record_date,
        title: typeName(r.maintenance_type_id),
        details: [
          `à ${formatHours(r.hours_at)}`,
          r.parts_replaced ? `Pièces : ${r.parts_replaced}` : "",
          r.workshop ?? "",
          r.comment ?? "",
        ].filter(Boolean),
        cost: r.cost,
      })),
      ...data.setups.map((s): TimelineEvent => ({
        kind: "reglage",
        date: s.created_at.slice(0, 10),
        title: `Réglage — ${s.name}`,
        details: [terrainName(s.terrain_type_id) ?? ""].filter(Boolean),
        cost: null,
      })),
      ...data.expenses.map((e): TimelineEvent => ({
        kind: "depense",
        date: e.expense_date,
        title: e.label,
        details: [],
        cost: e.amount,
      })),
    ];
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const filtered = useMemo(() => {
    let list = events;
    if (kinds.length > 0) list = list.filter((e) => kinds.includes(e.kind));
    if (period && period > 0) {
      const min = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
      list = list.filter((e) => e.date >= min);
    }
    return list;
  }, [events, kinds, period]);

  if (loading || !data) return (<><PageHeader title="Historique" back={`/garage/${id}`} /><Spinner /></>);

  return (
    <>
      <PageHeader title={`Historique — ${motoLabel(data.moto)}`} back={`/garage/${id}`} />

      <div className="mb-3 flex flex-col gap-2">
        <ChipGroup
          multi
          options={Object.entries(KIND_META).map(([value, m]) => ({ value: value as EventKind, label: `${m.icon} ${m.label}` }))}
          value={kinds}
          onChange={(v) => setKinds(v as EventKind[])}
        />
        <ChipGroup
          options={PERIODS}
          value={period}
          onChange={(v) => setPeriod((v as number | null) ?? 0)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📭" title="Rien à afficher" text="Aucun événement ne correspond aux filtres choisis." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((e, i) => (
            <Card key={i} className="flex items-start gap-3 py-3">
              <span className="text-xl" aria-hidden>{KIND_META[e.kind].icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-bold">{e.title}</p>
                  <p className="shrink-0 text-xs font-semibold text-ink-dim">{formatDate(e.date)}</p>
                </div>
                {e.details.map((d, j) => (
                  <p key={j} className="truncate text-xs text-ink-dim">{d}</p>
                ))}
                {e.cost !== null && <p className="mt-0.5 text-sm font-bold text-accent">{formatEuro(e.cost)}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
