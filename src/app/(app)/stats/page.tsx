"use client";

import { useMemo, useState } from "react";
import { Card, ChipGroup, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatEuro, formatHours } from "@/lib/format";
import { averageLifeHours, hoursPerMonth, hoursPerTerrain, maintenanceFrequency, totalCost } from "@/lib/stats";
import type { Expense, MaintenanceRecord, MaintenanceType, MotorcycleWithModel, RidingSession, SuspensionSetup, TerrainType } from "@/lib/types";

export default function StatsPage() {
  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [motos, sessions, records, types, expenses, terrains, setups] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT),
      sb.from("riding_sessions").select("*"),
      sb.from("maintenance_records").select("*"),
      sb.from("maintenance_types").select("*"),
      sb.from("expenses").select("*"),
      sb.from("terrain_types").select("*"),
      sb.from("suspension_setups").select("*").not("rating", "is", null).order("rating", { ascending: false }).limit(3),
    ]);
    return {
      motos: must(motos) as MotorcycleWithModel[],
      sessions: must(sessions) as RidingSession[],
      records: must(records) as MaintenanceRecord[],
      types: must(types) as MaintenanceType[],
      expenses: must(expenses) as Expense[],
      terrains: must(terrains) as TerrainType[],
      setups: must(setups) as SuspensionSetup[],
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
    };
  }, [data, motoFilter]);

  if (loading || !data || !filtered) return (<><PageHeader title="Statistiques" back="/profil" /><Spinner /></>);

  if (data.sessions.length === 0 && data.records.length === 0) {
    return (
      <>
        <PageHeader title="Statistiques" back="/profil" />
        <EmptyState icon="📊" title="Pas encore de données" text="Les statistiques apparaîtront après vos premières sessions et entretiens." />
      </>
    );
  }

  const totalHours = motoFilter
    ? data.motos.find((m) => m.id === motoFilter)?.current_hours ?? 0
    : data.motos.reduce((s, m) => s + m.current_hours, 0);
  const ridingHours = filtered.sessions.reduce((s, x) => s + x.duration_minutes / 60, 0);
  const cost = totalCost(filtered.records, filtered.expenses);
  const costPerHour = ridingHours > 0 ? cost / ridingHours : null;

  const perMonth = hoursPerMonth(filtered.sessions, 12, new Date());
  const maxMonth = Math.max(1, ...perMonth.map((m) => m.hours));
  const perTerrain = hoursPerTerrain(filtered.sessions);
  const maxTerrain = Math.max(1, ...perTerrain.map((t) => t.hours));
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name ?? "Non précisé";
  const typeName = (id: number) => data.types.find((t) => t.id === id)?.name ?? "";
  const typeIdByName = (name: string) => data.types.find((t) => t.name === name)?.id;

  const pistonType = typeIdByName("Piston");
  const tireType = typeIdByName("Pneus");
  const pistonLife = pistonType ? averageLifeHours(filtered.records, pistonType) : null;
  const tireLife = tireType ? averageLifeHours(filtered.records, tireType) : null;
  const frequency = maintenanceFrequency(filtered.records).slice(0, 5);

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
  };

  return (
    <>
      <PageHeader title="Statistiques" back="/profil" />

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
        <Tile label="Heures compteur" value={formatHours(totalHours)} />
        <Tile label="Sessions" value={String(filtered.sessions.length)} />
        <Tile label="Coût total" value={formatEuro(cost)} />
        <Tile label="Coût par heure" value={costPerHour !== null ? formatEuro(costPerHour) : "—"} />
      </div>

      {/* Heures par mois */}
      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Heures roulées par mois (12 mois)</h2>
        <div className="flex h-32 items-end gap-1" role="img" aria-label="Heures roulées par mois sur les 12 derniers mois">
          {perMonth.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${monthLabel(m.month)} : ${formatHours(m.hours)}`}>
              <div
                className="w-full rounded-t bg-accent"
                style={{ height: `${Math.max(m.hours > 0 ? 4 : 1, (m.hours / maxMonth) * 100)}%`, opacity: m.hours > 0 ? 1 : 0.15 }}
              />
              <span className="text-[9px] text-ink-dim">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Heures par terrain */}
      {perTerrain.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Heures par terrain</h2>
          <div className="flex flex-col gap-2">
            {perTerrain.map((t) => (
              <div key={String(t.terrainId)}>
                <div className="mb-0.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{terrainName(t.terrainId)}</span>
                  <span className="font-bold">{formatHours(t.hours)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(t.hours / maxTerrain) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Durées de vie */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Vie moyenne piston" value={pistonLife !== null ? formatHours(pistonLife) : "—"} hint={pistonLife === null ? "≥ 2 remplacements requis" : undefined} />
        <Tile label="Vie moyenne pneus" value={tireLife !== null ? formatHours(tireLife) : "—"} hint={tireLife === null ? "≥ 2 remplacements requis" : undefined} />
      </div>

      {/* Fréquence des entretiens */}
      {frequency.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Entretiens les plus fréquents</h2>
          <div className="divide-y divide-border">
            {frequency.map((f) => (
              <div key={f.typeId} className="flex items-baseline justify-between py-2 text-sm">
                <span className="font-semibold">{typeName(f.typeId)}</span>
                <span className="font-bold">{f.count}×</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Meilleurs réglages */}
      {data.setups.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Réglages les mieux notés</h2>
          <div className="divide-y divide-border">
            {data.setups.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between py-2 text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="font-bold text-accent">{"★".repeat(s.rating ?? 0)}</span>
              </div>
            ))}
          </div>
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
