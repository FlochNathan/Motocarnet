"use client";

// Administration des fiches techniques par modèle.
// Les couples et intervalles se saisissent en lignes « Nom = valeur ».

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import type { ModelSpec, ModelWithBrand, SuggestedInterval, TorqueSpec } from "@/lib/types";

function parseTorques(text: string): TorqueSpec[] {
  return text
    .split("\n")
    .map((line) => line.split("="))
    .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .map(([name, value]) => ({ name: name.trim(), value: value.trim() }));
}

function parseIntervals(text: string): SuggestedInterval[] {
  const result: SuggestedInterval[] = [];
  for (const line of text.split("\n")) {
    const parts = line.split("=");
    if (parts.length !== 2 || !parts[0].trim()) continue;
    const right = parts[1];
    const hoursMatch = right.match(/([\d.,]+)\s*h/i);
    const monthsMatch = right.match(/([\d.,]+)\s*mois/i);
    const hours = hoursMatch ? Number(hoursMatch[1].replace(",", ".")) : null;
    const months = monthsMatch ? Number(monthsMatch[1].replace(",", ".")) : null;
    if (hours === null && months === null) continue;
    result.push({ type_name: parts[0].trim(), hours, months });
  }
  return result;
}

const torquesToText = (t: TorqueSpec[]) => t.map((x) => `${x.name} = ${x.value}`).join("\n");
const intervalsToText = (s: SuggestedInterval[]) =>
  s.map((x) => `${x.type_name} = ${[x.hours != null ? `${x.hours} h` : "", x.months != null ? `${x.months} mois` : ""].filter(Boolean).join(" / ")}`).join("\n");

const EMPTY_FORM = {
  model_id: "", year_from: "2023", year_to: "2026",
  oil_qty: "", oil_type: "", coolant_qty: "", premix_ratio: "",
  valve_intake: "", valve_exhaust: "", spark_plug: "",
  fork_info: "", fork_clicks: "", shock_clicks: "", sag_recommended: "",
  torques: "", intervals: "", notes: "", verified: false,
};

export default function SpecsAdmin({
  models,
  specs,
  maintenanceTypeNames,
  reload,
}: {
  models: ModelWithBrand[];
  specs: ModelSpec[];
  maintenanceTypeNames: string[];
  reload: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const modelName = (id: number) => {
    const m = models.find((x) => x.id === id);
    return m ? `${m.motorcycle_brands.name} ${m.name}${m.version ? ` ${m.version}` : ""}` : `#${id}`;
  };

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(s: ModelSpec) {
    setEditingId(s.id);
    setForm({
      model_id: String(s.model_id), year_from: String(s.year_from), year_to: String(s.year_to),
      oil_qty: s.oil_qty ?? "", oil_type: s.oil_type ?? "", coolant_qty: s.coolant_qty ?? "",
      premix_ratio: s.premix_ratio ?? "", valve_intake: s.valve_intake ?? "", valve_exhaust: s.valve_exhaust ?? "",
      spark_plug: s.spark_plug ?? "", fork_info: s.fork_info ?? "", fork_clicks: s.fork_clicks ?? "",
      shock_clicks: s.shock_clicks ?? "", sag_recommended: s.sag_recommended ?? "",
      torques: torquesToText(s.torques), intervals: intervalsToText(s.suggested_intervals),
      notes: s.notes ?? "", verified: s.verified,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setError("");
    if (!form.model_id) {
      setError("Choisissez un modèle.");
      return;
    }
    const intervals = parseIntervals(form.intervals);
    const unknown = intervals.filter((i) => !maintenanceTypeNames.includes(i.type_name));
    if (unknown.length > 0) {
      setError(`Types d'entretien inconnus : ${unknown.map((u) => u.type_name).join(", ")}. Les noms doivent correspondre exactement.`);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      model_id: Number(form.model_id),
      year_from: parseInt(form.year_from) || 2023,
      year_to: parseInt(form.year_to) || 2026,
      oil_qty: form.oil_qty || null,
      oil_type: form.oil_type || null,
      coolant_qty: form.coolant_qty || null,
      premix_ratio: form.premix_ratio || null,
      valve_intake: form.valve_intake || null,
      valve_exhaust: form.valve_exhaust || null,
      spark_plug: form.spark_plug || null,
      fork_info: form.fork_info || null,
      fork_clicks: form.fork_clicks || null,
      shock_clicks: form.shock_clicks || null,
      sag_recommended: form.sag_recommended || null,
      torques: parseTorques(form.torques),
      suggested_intervals: intervals,
      notes: form.notes || null,
      verified: form.verified,
    };
    const { error: saveError } = editingId
      ? await supabase.from("model_specs").update(payload).eq("id", editingId)
      : await supabase.from("model_specs").insert(payload);
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
    reload();
  }

  async function remove(s: ModelSpec) {
    const supabase = createClient();
    await supabase.from("model_specs").delete().eq("id", s.id);
    if (editingId === s.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">
          {editingId ? `Modifier la fiche — ${modelName(Number(form.model_id))}` : "Nouvelle fiche technique"}
        </h2>
        <Field label="Modèle">
          <Select value={form.model_id} onChange={(e) => set("model_id", e.target.value)}>
            <option value="">Choisir…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.motorcycle_brands.name} {m.name}{m.version ? ` ${m.version}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Année de début"><Input type="number" value={form.year_from} onChange={(e) => set("year_from", e.target.value)} /></Field>
          <Field label="Année de fin"><Input type="number" value={form.year_to} onChange={(e) => set("year_to", e.target.value)} /></Field>
          <Field label="Huile (quantité)"><Input value={form.oil_qty} onChange={(e) => set("oil_qty", e.target.value)} placeholder="1,20 L (avec filtre)" /></Field>
          <Field label="Type d'huile"><Input value={form.oil_type} onChange={(e) => set("oil_type", e.target.value)} placeholder="10W-50" /></Field>
          <Field label="Liquide refroid."><Input value={form.coolant_qty} onChange={(e) => set("coolant_qty", e.target.value)} placeholder="1,1 L" /></Field>
          <Field label="Mélange 2T"><Input value={form.premix_ratio} onChange={(e) => set("premix_ratio", e.target.value)} placeholder="1:60" /></Field>
          <Field label="Jeu soupapes adm."><Input value={form.valve_intake} onChange={(e) => set("valve_intake", e.target.value)} placeholder="0,10 – 0,15 mm" /></Field>
          <Field label="Jeu soupapes éch."><Input value={form.valve_exhaust} onChange={(e) => set("valve_exhaust", e.target.value)} placeholder="0,12 – 0,17 mm" /></Field>
          <Field label="Bougie"><Input value={form.spark_plug} onChange={(e) => set("spark_plug", e.target.value)} placeholder="NGK LKAR8AI-9" /></Field>
          <Field label="SAG recommandé"><Input value={form.sag_recommended} onChange={(e) => set("sag_recommended", e.target.value)} placeholder="105 mm" /></Field>
        </div>
        <Field label="Fourche (info)"><Input value={form.fork_info} onChange={(e) => set("fork_info", e.target.value)} placeholder="WP XACT à air — 10,5 bar standard" /></Field>
        <Field label="Clics fourche (origine)"><Input value={form.fork_clicks} onChange={(e) => set("fork_clicks", e.target.value)} placeholder="Compression 12 · Détente 12" /></Field>
        <Field label="Clics amortisseur (origine)"><Input value={form.shock_clicks} onChange={(e) => set("shock_clicks", e.target.value)} placeholder="BV 12 · HV 1,5 tr · Détente 12" /></Field>
        <Field label="Couples de serrage" hint="Une ligne par couple : Nom = valeur (ex : Axe de roue avant = 35 Nm)">
          <Textarea rows={4} value={form.torques} onChange={(e) => set("torques", e.target.value)} />
        </Field>
        <Field label="Intervalles suggérés" hint="Une ligne par opération : Nom exact = X h / Y mois (ex : Vidange moteur = 10 h)">
          <Textarea rows={4} value={form.intervals} onChange={(e) => set("intervals", e.target.value)} />
        </Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="h-6 w-6 accent-accent" />
          <span className="text-sm font-semibold">Fiche vérifiée sur le manuel officiel</span>
        </label>
        <ErrorText>{error}</ErrorText>
        <Button size="md" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer la fiche"}
        </Button>
        {editingId && (
          <Button size="md" variant="secondary" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
            Annuler la modification
          </Button>
        )}
      </Card>

      <Card className="max-h-96 divide-y divide-border overflow-y-auto p-0">
        {specs.length === 0 && <p className="px-4 py-3 text-sm text-ink-dim">Aucune fiche pour l'instant.</p>}
        {specs.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{modelName(s.model_id)}</p>
              <p className="text-xs text-ink-dim">
                {s.year_from}–{s.year_to}{" "}
                <Badge className={s.verified ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}>
                  {s.verified ? "vérifiée" : "indicative"}
                </Badge>
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => startEdit(s)}>Modifier</Button>
              <Button size="sm" variant="danger" onClick={() => remove(s)}>✕</Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
