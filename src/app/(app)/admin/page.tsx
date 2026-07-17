"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/domain";
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import type {
  Brand, MaintenanceCategory, MaintenanceType, ModelWithBrand,
  SetupRecommendation, TerrainType,
} from "@/lib/types";

const DISPLACEMENT_LABELS = ["50", "65", "85", "125", "150", "250 2T", "250 4T", "300 2T", "350 4T", "450 4T"];

type Tab = "modeles" | "entretiens" | "terrains" | "conseils";

export default function AdminPage() {
  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    const { data: userData } = await sb.auth.getUser();
    const profile = must(await sb.from("profiles").select("is_admin").eq("id", userData.user!.id).single()) as { is_admin: boolean };
    const [brands, models, types, terrains, recos] = await Promise.all([
      sb.from("motorcycle_brands").select("*").order("name"),
      sb.from("motorcycle_models").select("*, motorcycle_brands(*)").order("name"),
      sb.from("maintenance_types").select("*").order("category").order("sort"),
      sb.from("terrain_types").select("*").order("sort"),
      sb.from("setup_recommendations").select("*").order("id"),
    ]);
    return {
      isAdmin: profile.is_admin,
      brands: must(brands) as Brand[],
      models: must(models) as ModelWithBrand[],
      types: must(types) as MaintenanceType[],
      terrains: must(terrains) as TerrainType[],
      recos: must(recos) as SetupRecommendation[],
    };
  });

  const [tab, setTab] = useState<Tab>("modeles");

  if (loading || !data) return (<><PageHeader title="Administration" back="/profil" /><Spinner /></>);

  if (!data.isAdmin) {
    return (
      <>
        <PageHeader title="Administration" back="/profil" />
        <Card>Cette section est réservée aux administrateurs.</Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Administration" back="/profil" />
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {([
          ["modeles", "Modèles"],
          ["entretiens", "Entretiens"],
          ["terrains", "Terrains"],
          ["conseils", "Conseils"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`min-h-11 rounded-xl text-xs font-bold transition ${tab === value ? "bg-accent text-accent-contrast" : "text-ink-dim"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "modeles" && <ModelsAdmin brands={data.brands} models={data.models} reload={reload} />}
      {tab === "entretiens" && <TypesAdmin types={data.types} reload={reload} />}
      {tab === "terrains" && <TerrainsAdmin terrains={data.terrains} reload={reload} />}
      {tab === "conseils" && <RecosAdmin recos={data.recos} reload={reload} />}
    </>
  );
}

// ------------------------------------------------------------
// Marques et modèles
// ------------------------------------------------------------
function ModelsAdmin({ brands, models, reload }: { brands: Brand[]; models: ModelWithBrand[]; reload: () => void }) {
  const [brandName, setBrandName] = useState("");
  const [form, setForm] = useState({ brand_id: "", name: "", version: "", label: "250 4T", cc: "250", stroke: "4", year_from: "2024", year_to: "2026" });
  const [error, setError] = useState("");

  async function addBrand() {
    if (!brandName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("motorcycle_brands").insert({ name: brandName.trim() });
    if (error) { setError(error.message); return; }
    setBrandName("");
    reload();
  }

  async function addModel() {
    setError("");
    if (!form.brand_id || !form.name.trim()) {
      setError("Marque et nom du modèle obligatoires.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("motorcycle_models").insert({
      brand_id: Number(form.brand_id),
      name: form.name.trim(),
      version: form.version.trim() || null,
      displacement_label: form.label,
      displacement_cc: Number(form.cc),
      stroke: Number(form.stroke),
      year_from: Number(form.year_from),
      year_to: Number(form.year_to),
    });
    if (error) { setError(error.message); return; }
    setForm((f) => ({ ...f, name: "", version: "" }));
    reload();
  }

  async function toggleModel(m: ModelWithBrand) {
    const supabase = createClient();
    await supabase.from("motorcycle_models").update({ active: !m.active }).eq("id", m.id);
    reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Ajouter une marque</h2>
        <div className="flex gap-2">
          <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Nom de la marque" />
          <Button size="md" onClick={addBrand}>Ajouter</Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Ajouter un modèle</h2>
        <Field label="Marque">
          <Select value={form.brand_id} onChange={(e) => setForm((f) => ({ ...f, brand_id: e.target.value }))}>
            <option value="">Choisir…</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Modèle"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="250 SX-F" /></Field>
          <Field label="Version (facultatif)"><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="Factory Edition" /></Field>
          <Field label="Catégorie">
            <Select value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}>
              {DISPLACEMENT_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Cylindrée (cm³)"><Input type="number" value={form.cc} onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))} /></Field>
          <Field label="Moteur">
            <Select value={form.stroke} onChange={(e) => setForm((f) => ({ ...f, stroke: e.target.value }))}>
              <option value="2">2 temps</option>
              <option value="4">4 temps</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="De"><Input type="number" value={form.year_from} onChange={(e) => setForm((f) => ({ ...f, year_from: e.target.value }))} /></Field>
            <Field label="À"><Input type="number" value={form.year_to} onChange={(e) => setForm((f) => ({ ...f, year_to: e.target.value }))} /></Field>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button size="md" onClick={addModel}>Ajouter le modèle</Button>
      </Card>

      <Card className="max-h-96 divide-y divide-border overflow-y-auto p-0">
        {models.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {m.motorcycle_brands.name} {m.name}{m.version ? ` ${m.version}` : ""}
              </p>
              <p className="text-xs text-ink-dim">{m.displacement_label} • {m.year_from}–{m.year_to}</p>
            </div>
            <Button size="sm" variant={m.active ? "secondary" : "primary"} onClick={() => toggleModel(m)}>
              {m.active ? "Désactiver" : "Activer"}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Types d'entretien
// ------------------------------------------------------------
function TypesAdmin({ types, reload }: { types: MaintenanceType[]; reload: () => void }) {
  const [form, setForm] = useState({ category: "moteur", name: "", hours: "", months: "", stroke: "" });
  const [error, setError] = useState("");

  async function addType() {
    setError("");
    if (!form.name.trim()) { setError("Nom obligatoire."); return; }
    const supabase = createClient();
    const { error } = await supabase.from("maintenance_types").insert({
      category: form.category,
      name: form.name.trim(),
      default_interval_hours: form.hours ? Number(form.hours) : null,
      default_interval_months: form.months ? Number(form.months) : null,
      applies_to_stroke: form.stroke ? Number(form.stroke) : null,
      sort: 99,
    });
    if (error) { setError(error.message); return; }
    setForm((f) => ({ ...f, name: "", hours: "", months: "" }));
    reload();
  }

  async function toggleType(t: MaintenanceType) {
    const supabase = createClient();
    await supabase.from("maintenance_types").update({ active: !t.active }).eq("id", t.id);
    reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Ajouter un type d'entretien</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Catégorie">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Moteur concerné">
            <Select value={form.stroke} onChange={(e) => setForm((f) => ({ ...f, stroke: e.target.value }))}>
              <option value="">Tous</option>
              <option value="2">2 temps</option>
              <option value="4">4 temps</option>
            </Select>
          </Field>
        </div>
        <Field label="Nom de l'opération"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fréquence (heures)"><Input type="number" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} placeholder="—" /></Field>
          <Field label="Fréquence (mois)"><Input type="number" value={form.months} onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} placeholder="—" /></Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button size="md" onClick={addType}>Ajouter</Button>
      </Card>

      <Card className="max-h-96 divide-y divide-border overflow-y-auto p-0">
        {types.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-ink-dim">
                {MAINTENANCE_CATEGORY_LABELS[t.category as MaintenanceCategory]}
                {t.default_interval_hours != null && ` • ${t.default_interval_hours} h`}
                {t.default_interval_months != null && ` • ${t.default_interval_months} mois`}
              </p>
            </div>
            <Button size="sm" variant={t.active ? "secondary" : "primary"} onClick={() => toggleType(t)}>
              {t.active ? "Désactiver" : "Activer"}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Types de terrain
// ------------------------------------------------------------
function TerrainsAdmin({ terrains, reload }: { terrains: TerrainType[]; reload: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function addTerrain() {
    if (!name.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("terrain_types").insert({ name: name.trim(), sort: terrains.length + 1 });
    if (error) { setError(error.message); return; }
    setName("");
    reload();
  }

  async function toggleTerrain(t: TerrainType) {
    const supabase = createClient();
    await supabase.from("terrain_types").update({ active: !t.active }).eq("id", t.id);
    reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">Ajouter un type de terrain</h2>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du terrain" />
          <Button size="md" onClick={addTerrain}>Ajouter</Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </Card>
      <Card className="divide-y divide-border p-0">
        {terrains.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <p className="text-sm font-semibold">{t.name} {!t.active && <Badge>inactif</Badge>}</p>
            <Button size="sm" variant={t.active ? "secondary" : "primary"} onClick={() => toggleTerrain(t)}>
              {t.active ? "Désactiver" : "Activer"}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------
// Recommandations de réglage
// ------------------------------------------------------------
function RecosAdmin({ recos, reload }: { recos: SetupRecommendation[]; reload: () => void }) {
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [savedId, setSavedId] = useState<number | null>(null);

  async function saveReco(r: SetupRecommendation) {
    const advice = edits[r.id];
    if (advice === undefined || advice === r.advice) return;
    const supabase = createClient();
    await supabase.from("setup_recommendations").update({ advice }).eq("id", r.id);
    setSavedId(r.id);
    setTimeout(() => setSavedId(null), 2000);
    reload();
  }

  return (
    <div className="flex flex-col gap-3">
      {recos.map((r) => (
        <Card key={r.id} className="flex flex-col gap-2">
          <p className="text-sm font-bold">{r.title} <span className="text-xs font-normal text-ink-dim">({r.symptom_key})</span></p>
          <Textarea
            value={edits[r.id] ?? r.advice}
            onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
            rows={4}
          />
          <Button size="sm" variant="secondary" onClick={() => saveReco(r)}>
            {savedId === r.id ? "Enregistré ✔" : "Enregistrer"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
