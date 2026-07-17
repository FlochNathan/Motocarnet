"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { ALL_NUMERIC_FIELDS } from "@/lib/setup-fields";
import { Card, Field, PageHeader, Select, Spinner } from "@/components/ui";
import type { MotorcycleWithModel, SuspensionSetup, TerrainType } from "@/lib/types";

export default function ComparerPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Comparer />
    </Suspense>
  );
}

function Comparer() {
  const searchParams = useSearchParams();
  const presetA = searchParams.get("a");

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [setups, motos, terrains] = await Promise.all([
      sb.from("suspension_setups").select("*").order("updated_at", { ascending: false }),
      sb.from("motorcycles").select(MOTO_SELECT),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      setups: must(setups) as SuspensionSetup[],
      motos: must(motos) as MotorcycleWithModel[],
      terrains: must(terrains) as TerrainType[],
    };
  });

  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  useEffect(() => {
    if (data && !aId) setAId(presetA ?? data.setups[0]?.id ?? "");
  }, [data, presetA, aId]);

  if (loading || !data) return (<><PageHeader title="Comparer" back="/suspensions" /><Spinner /></>);

  const a = data.setups.find((s) => s.id === aId) ?? null;
  const b = data.setups.find((s) => s.id === bId) ?? null;
  const motoName = (id: string) => {
    const m = data.motos.find((x) => x.id === id);
    return m ? motoLabel(m) : "";
  };
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name ?? "—";

  const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

  const rows: { label: string; unit?: string; a: string; b: string }[] = [];
  if (a && b) {
    rows.push({ label: "Moto", a: motoName(a.motorcycle_id), b: motoName(b.motorcycle_id) });
    rows.push({ label: "Terrain", a: terrainName(a.terrain_type_id), b: terrainName(b.terrain_type_id) });
    rows.push({ label: "Poids équipé", unit: "kg", a: fmt(a.rider_weight_kg), b: fmt(b.rider_weight_kg) });
    for (const f of ALL_NUMERIC_FIELDS) {
      rows.push({ label: f.label, unit: f.unit, a: fmt(a[f.key]), b: fmt(b[f.key]) });
    }
    rows.push({ label: "Ressort fourche", a: fmt(a.fork_spring_rate), b: fmt(b.fork_spring_rate) });
    rows.push({ label: "Ressort amortisseur", a: fmt(a.shock_spring_rate), b: fmt(b.shock_spring_rate) });
  }

  return (
    <>
      <PageHeader title="Comparer deux réglages" back="/suspensions" />
      <Card className="flex flex-col gap-3">
        <Field label="Réglage A">
          <Select value={aId} onChange={(e) => setAId(e.target.value)}>
            <option value="">Choisir…</option>
            {data.setups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Réglage B">
          <Select value={bId} onChange={(e) => setBId(e.target.value)}>
            <option value="">Choisir…</option>
            {data.setups.filter((s) => s.id !== aId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </Card>

      {a && b && (
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-semibold text-ink-dim">Paramètre</th>
                <th className="px-3 py-2 font-extrabold">{a.name}</th>
                <th className="px-3 py-2 font-extrabold">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const differs = r.a !== r.b;
                return (
                  <tr key={i} className={`border-b border-border last:border-0 ${differs ? "bg-accent/10" : ""}`}>
                    <td className="px-3 py-2 text-ink-dim">
                      {r.label}
                      {r.unit && <span className="text-xs"> ({r.unit})</span>}
                    </td>
                    <td className={`px-3 py-2 ${differs ? "font-black text-accent" : "font-semibold"}`}>{r.a}</td>
                    <td className={`px-3 py-2 ${differs ? "font-black text-accent" : "font-semibold"}`}>{r.b}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
