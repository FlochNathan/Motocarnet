"use client";

import { useMemo, useState } from "react";
import { Card, ChipGroup, EmptyState, PageHeader, Spinner, Stars } from "@/components/ui";
import { ActivityHeatmap, HBars, LineChart, WearGauge } from "@/components/charts";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatEuro, formatHours } from "@/lib/format";
import { CONDITIONS, SYMPTOM_LABELS } from "@/lib/domain";
import { hoursPerMonth, totalCost } from "@/lib/stats";
import {
  activityCalendar, costPerHourByMonth, cumulativeHours,
  hoursByCondition, partWear, ratingByTerrain, symptomCounts,
} from "@/lib/analytics";
import { hoursPerTerrain } from "@/lib/stats";
import type {
  Expense, MaintenanceRecord, MaintenanceType, MotorcycleWithModel,
  RidingSession, SuspensionFeedback, SuspensionSetup, TerrainType,
} from "@/lib/types";

export default function StatsPage() {
  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [motos, sessions, records, types, expenses, terrains, setups, feedbacks] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).order("is_primary", { ascending: false }),
      sb.from("riding_sessions").select("*"),
      sb.from("maintenance_records").select("*"),
      sb.from("maintenance_types").select("*"),
      sb.from("expenses").select("*"),
      sb.from("terrain_types").select("*"),
      sb.from("suspension_setups").select("*"),
      sb.from("suspension_feedback").select("*"),
    ]);
    return {
      motos: must(motos) as MotorcycleWithModel[],
      sessions: must(sessions) as RidingSession[],
      records: must(records) as MaintenanceRecord[],
      types: must(types) as MaintenanceType[],
      expenses: must(expenses) as Expense[],
      terrains: must(terrains) as TerrainType[],
      setups: must(setups) as SuspensionSetup[],
      feedbacks: must(feedbacks) as SuspensionFeedback[],
    };
  });

  const [motoFilter, setMotoFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return null;
    const keep = (motorcycleId: string) => motoFilter === null || motorcycleId === motoFilter;
    return {
      sessions: data.sessions.filter((s) => keep(s.motorcycle_id)),
      records: data.records.filter((r) => keep(r.motorcycle_id)),
      expenses: data.expenses.filter((e) => keep(e.motorcycle_id)),
      setups: data.setups.filter((s) => keep(s.motorcycle_id)),
    };
  }, [data, motoFilter]);

  if (loading || !data || !filtered) return (<><PageHeader title="Analyses" back="/profil" /><Spinner /></>);

  if (data.sessions.length === 0 && data.records.length === 0) {
    return (
      <>
        <PageHeader title="Analyses" back="/profil" />
        <EmptyState icon="📊" title="Pas encore de données" text="Les analyses apparaîtront après vos premières sessions et entretiens." />
      </>
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const selectedMoto = motoFilter ? data.motos.find((m) => m.id === motoFilter) ?? null : null;

  // --- KPI ---
  const ridingHours = filtered.sessions.reduce((s, x) => s + x.duration_minutes / 60, 0);
  const avgSession = filtered.sessions.length > 0 ? ridingHours / filtered.sessions.length : 0;
  const ridingDays = new Set(filtered.sessions.map((s) => s.session_date)).size;
  const cost = totalCost(filtered.records, filtered.expenses);

  // --- Graphiques ---
  const cumul = cumulativeHours(filtered.sessions, selectedMoto?.purchase_hours ?? 0);
  const cumulPoints = cumul.map((p) => ({ label: formatDate(p.date), value: p.hours }));

  const calendar = activityCalendar(filtered.sessions, 26, now);

  const perMonth = hoursPerMonth(filtered.sessions, 12, now);
  const maxMonth = Math.max(1, ...perMonth.map((m) => m.hours));
  const monthLabel = (key: string) =>
    new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "narrow" });

  const costHour = costPerHourByMonth(filtered.expenses, filtered.sessions, year)
    .filter((r): r is { month: string; value: number } => r.value !== null)
    .map((r) => ({
      label: new Date(Number(r.month.slice(0, 4)), Number(r.month.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "short" }),
      value: r.value,
    }));

  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name ?? "Non précisé";
  const terrainRows = hoursPerTerrain(filtered.sessions).map((t) => ({
    label: terrainName(t.terrainId),
    value: t.hours,
  }));
  const conditionLabel = (c: string | null) => CONDITIONS.find((x) => x.value === c)?.label ?? "Non précisé";
  const conditionRows = hoursByCondition(filtered.sessions).map((c) => ({
    label: conditionLabel(c.condition),
    value: c.hours,
  }));

  // Usure : par moto (celles qui ont assez d'historique)
  const wearByMoto = (motoFilter ? data.motos.filter((m) => m.id === motoFilter) : data.motos)
    .map((moto) => ({ moto, wear: partWear(data.records, data.types, moto.id, moto.current_hours) }))
    .filter((x) => x.wear.length > 0);

  // Suspensions
  const setupIds = new Set(filtered.setups.map((s) => s.id));
  const symptoms = symptomCounts(data.feedbacks.filter((f) => setupIds.has(f.setup_id))).slice(0, 6)
    .map((s) => ({ label: SYMPTOM_LABELS[s.symptom] ?? s.symptom, value: s.count }));
  const bestByTerrain = ratingByTerrain(filtered.setups).slice(0, 5);

  return (
    <>
      <PageHeader title="Analyses" back="/profil" />

      {data.motos.length > 1 && (
        <div className="mb-4">
          <ChipGroup
            options={[{ value: "__all__", label: "Toutes les motos" }, ...data.motos.map((m) => ({ value: m.id, label: motoLabel(m) }))]}
            value={motoFilter ?? "__all__"}
            onChange={(v) => setMotoFilter(v === "__all__" || v === null ? null : (v as string))}
          />
        </div>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Heures roulées" value={formatHours(ridingHours)} hint={`${filtered.sessions.length} sessions`} />
        <Tile label="Moyenne / session" value={formatHours(avgSession)} hint={`${ridingDays} jours de roulage`} />
        <Tile label="Coût total" value={formatEuro(cost)} hint={ridingHours > 0 ? `${formatEuro(cost / ridingHours)} / h` : undefined} />
        <Tile
          label="Compteur"
          value={formatHours(selectedMoto ? selectedMoto.current_hours : data.motos.reduce((s, m) => s + m.current_hours, 0))}
          hint={selectedMoto ? motoLabel(selectedMoto) : "toutes motos"}
        />
      </div>

      {/* Courbe cumulée */}
      {cumulPoints.length > 1 && (
        <Card className="mt-3">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
            {selectedMoto ? "Évolution du compteur" : "Heures roulées cumulées"}
          </h2>
          <LineChart points={cumulPoints} color="var(--color-accent)" format={formatHours} />
        </Card>
      )}

      {/* Calendrier d'activité */}
      <Card className="mt-3">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Activité — 6 derniers mois</h2>
        <ActivityHeatmap days={calendar} color="var(--color-accent)" />
      </Card>

      {/* Heures par mois */}
      <Card className="mt-3">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Heures par mois — 12 derniers mois</h2>
        <div className="flex h-28 items-end gap-1" role="img" aria-label="Heures roulées par mois">
          {perMonth.map((m) => (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.month} : ${formatHours(m.hours)}`}>
              <div
                className="w-full rounded-t bg-accent"
                style={{ height: `${m.hours > 0 ? Math.max(5, (m.hours / maxMonth) * 100) : 2}%`, opacity: m.hours > 0 ? 1 : 0.12 }}
              />
              <span className="text-[9px] font-semibold text-ink-dim">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Coût par heure */}
      {costHour.length > 1 && (
        <Card className="mt-3">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Coût par heure roulée — {year}</h2>
          <LineChart points={costHour} color="var(--color-violet)" format={(v) => formatEuro(v)} />
        </Card>
      )}

      {/* Terrains et conditions */}
      {terrainRows.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Heures par terrain</h2>
          <HBars rows={terrainRows} color="var(--color-accent)" format={formatHours} />
        </Card>
      )}
      {conditionRows.length > 1 && (
        <Card className="mt-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Heures par conditions</h2>
          <HBars rows={conditionRows} color="var(--color-violet)" format={formatHours} />
        </Card>
      )}

      {/* Usure des pièces */}
      {wearByMoto.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-dim">Usure des pièces</h2>
          <p className="mb-3 text-xs text-ink-dim">
            Heures depuis le dernier remplacement, comparées à la durée de vie moyenne observée sur votre moto.
          </p>
          <div className="flex flex-col gap-4">
            {wearByMoto.map(({ moto, wear }) => (
              <div key={moto.id}>
                {wearByMoto.length > 1 && (
                  <p className="mb-2 text-xs font-bold text-ink-dim">{motoLabel(moto)}</p>
                )}
                <div className="flex flex-col gap-2.5">
                  {wear.map((w) => (
                    <WearGauge key={w.typeId} label={w.typeName} sinceLast={w.sinceLast} averageLife={w.averageLife} format={formatHours} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Analyse suspensions */}
      {(symptoms.length > 0 || bestByTerrain.length > 0) && (
        <Card className="mt-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Analyse suspensions</h2>
          {symptoms.length > 0 && (
            <>
              <p className="mb-2 text-xs font-bold text-ink-dim">Symptômes les plus ressentis</p>
              <HBars rows={symptoms} color="var(--color-warn)" format={(v) => `${v}×`} />
            </>
          )}
          {bestByTerrain.length > 0 && (
            <>
              <p className="mb-1 mt-4 text-xs font-bold text-ink-dim">Note moyenne des réglages par terrain</p>
              <div className="divide-y divide-border">
                {bestByTerrain.map((r) => (
                  <div key={String(r.terrainId)} className="flex items-center justify-between py-2">
                    <span className="text-sm font-semibold">
                      {terrainName(r.terrainId)}
                      <span className="ml-1 text-xs font-normal text-ink-dim">({r.count} réglage{r.count > 1 ? "s" : ""})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Stars value={Math.round(r.average)} />
                      <span className="text-sm font-bold">{r.average.toFixed(1)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="py-3">
      <p className="text-xs font-semibold text-ink-dim">{label}</p>
      <p className="mt-0.5 text-2xl font-black">{value}</p>
      {hint && <p className="text-[10px] text-ink-dim">{hint}</p>}
    </Card>
  );
}
