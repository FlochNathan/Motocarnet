"use client";

// Formulaire de réglage de suspensions — partagé entre création,
// modification et duplication.

import { useState } from "react";
import { CONDITIONS, RIDER_LEVELS, TIRE_TYPES } from "@/lib/domain";
import { FORK_FIELDS, SHOCK_FIELDS, TIRE_FIELDS, type SetupField } from "@/lib/setup-fields";
import { motoLabel } from "@/lib/moto";
import { Button, Card, ChipGroup, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import type { Conditions, MotorcycleWithModel, RiderLevel, SuspensionSetup, TerrainType } from "@/lib/types";

export type SetupPayload = Omit<SuspensionSetup, "id" | "user_id" | "created_at" | "updated_at" | "is_favorite" | "rating">;

type NumericState = Record<string, string>;

function toNumericState(initial: Partial<SuspensionSetup>): NumericState {
  const s: NumericState = {};
  for (const f of [...TIRE_FIELDS, ...FORK_FIELDS, ...SHOCK_FIELDS]) {
    const v = initial[f.key];
    s[f.key] = v === null || v === undefined ? "" : String(v);
  }
  return s;
}

export default function SetupForm({
  motos,
  terrains,
  initial,
  submitLabel,
  onSave,
}: {
  motos: MotorcycleWithModel[];
  terrains: TerrainType[];
  initial: Partial<SuspensionSetup>;
  submitLabel: string;
  onSave: (payload: SetupPayload) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [motoId, setMotoId] = useState(initial.motorcycle_id ?? motos[0]?.id ?? "");
  const [weight, setWeight] = useState(initial.rider_weight_kg != null ? String(initial.rider_weight_kg) : "");
  const [level, setLevel] = useState<RiderLevel | "">(initial.rider_level ?? "");
  const [terrainId, setTerrainId] = useState(initial.terrain_type_id != null ? String(initial.terrain_type_id) : "");
  const [conditions, setConditions] = useState<Conditions | null>(initial.terrain_conditions ?? null);
  const [temperature, setTemperature] = useState(initial.temperature_c != null ? String(initial.temperature_c) : "");
  const [tireType, setTireType] = useState(initial.tire_type ?? "");
  const [forkSpring, setForkSpring] = useState(initial.fork_spring_rate ?? "");
  const [shockSpring, setShockSpring] = useState(initial.shock_spring_rate ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [nums, setNums] = useState<NumericState>(() => toNumericState(initial));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function numValue(key: string): number | null {
    const raw = (nums[key] ?? "").trim().replace(",", ".");
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function submit() {
    setError("");
    if (!name.trim()) {
      setError("Donnez un nom à ce réglage (ex : « Base sable »).");
      return;
    }
    if (!motoId) {
      setError("Choisissez une moto.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        motorcycle_id: motoId,
        name: name.trim(),
        rider_weight_kg: weight.trim() === "" ? null : Number(weight.replace(",", ".")),
        rider_level: level || null,
        terrain_type_id: terrainId ? Number(terrainId) : null,
        terrain_conditions: conditions,
        temperature_c: temperature.trim() === "" ? null : Number(temperature.replace(",", ".")),
        tire_type: tireType || null,
        tire_pressure_front_bar: numValue("tire_pressure_front_bar"),
        tire_pressure_rear_bar: numValue("tire_pressure_rear_bar"),
        fork_compression_clicks: numValue("fork_compression_clicks"),
        fork_rebound_clicks: numValue("fork_rebound_clicks"),
        fork_preload_turns: numValue("fork_preload_turns"),
        fork_height_mm: numValue("fork_height_mm"),
        fork_air_pressure_bar: numValue("fork_air_pressure_bar"),
        fork_spring_rate: forkSpring || null,
        shock_lsc_clicks: numValue("shock_lsc_clicks"),
        shock_hsc_turns: numValue("shock_hsc_turns"),
        shock_rebound_clicks: numValue("shock_rebound_clicks"),
        shock_preload_mm: numValue("shock_preload_mm"),
        shock_sag_static_mm: numValue("shock_sag_static_mm"),
        shock_sag_rider_mm: numValue("shock_sag_rider_mm"),
        shock_spring_rate: shockSpring || null,
        notes: notes || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  function numericInputs(fields: SetupField[]) {
    return fields.map((f) => (
      <Field key={f.key} label={`${f.label} (${f.unit})`}>
        <Input
          type="number"
          inputMode="decimal"
          step={f.step ?? "1"}
          value={nums[f.key] ?? ""}
          onChange={(e) => setNums((s) => ({ ...s, [f.key]: e.target.value }))}
          placeholder="—"
        />
      </Field>
    ));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Contexte</h2>
        <Field label="Nom du réglage">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Base sable, Course terrain dur…" />
        </Field>
        <Field label="Moto">
          <Select value={motoId} onChange={(e) => setMotoId(e.target.value)}>
            {motos.map((m) => <option key={m.id} value={m.id}>{motoLabel(m)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poids équipé (kg)">
            <Input type="number" inputMode="decimal" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Température (°C)">
            <Input type="number" inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <Field label="Niveau du pilote">
          <Select value={level} onChange={(e) => setLevel(e.target.value as RiderLevel | "")}>
            <option value="">Non précisé</option>
            {RIDER_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
        </Field>
        <Field label="Type de terrain">
          <Select value={terrainId} onChange={(e) => setTerrainId(e.target.value)}>
            <option value="">Non précisé</option>
            {terrains.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Conditions du terrain">
          <ChipGroup options={CONDITIONS.map((c) => ({ value: c.value, label: c.label }))} value={conditions} onChange={(v) => setConditions(v as Conditions | null)} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Pneus</h2>
        <Field label="Type de pneus">
          <Select value={tireType} onChange={(e) => setTireType(e.target.value)}>
            <option value="">Non précisé</option>
            {TIRE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">{numericInputs(TIRE_FIELDS)}</div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Fourche</h2>
        <div className="grid grid-cols-2 gap-3">{numericInputs(FORK_FIELDS.slice(0, 4))}</div>
        {numericInputs(FORK_FIELDS.slice(4))}
        <Field label="Dureté du ressort (fourche à ressort)" hint="Ex : 4.4 N/mm">
          <Input value={forkSpring} onChange={(e) => setForkSpring(e.target.value)} placeholder="—" />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Amortisseur</h2>
        <div className="grid grid-cols-2 gap-3">{numericInputs(SHOCK_FIELDS)}</div>
        <Field label="Dureté du ressort" hint="Ex : 45 N/mm">
          <Input value={shockSpring} onChange={(e) => setShockSpring(e.target.value)} placeholder="—" />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <Field label="Notes (facultatif)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations, contexte…" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : submitLabel}</Button>
      </Card>
    </div>
  );
}
