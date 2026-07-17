"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { uploadPhoto } from "@/lib/photos";
import { todayISO } from "@/lib/format";
import { Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import type { ModelWithBrand } from "@/lib/types";

export default function NouvelleMotoPage() {
  const router = useRouter();
  const { data: models, loading } = useSupabaseQuery<ModelWithBrand[]>(
    async (sb) =>
      must(await sb.from("motorcycle_models").select("*, motorcycle_brands(*)").eq("active", true)),
  );

  const [step, setStep] = useState(1);

  // Étape 1 — listes dépendantes
  const [year, setYear] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);

  // Étape 2 — détails
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [hoursH, setHoursH] = useState("0");
  const [hoursM, setHoursM] = useState("0");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => (models ?? []).filter((m) => m.motorcycle_brands.active), [models]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const m of all) for (let y = m.year_from; y <= m.year_to; y++) set.add(y);
    return [...set].sort((a, b) => b - a);
  }, [all]);

  const forYear = useMemo(
    () => (year === null ? [] : all.filter((m) => m.year_from <= year && year <= m.year_to)),
    [all, year],
  );

  const brands = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of forYear) map.set(m.brand_id, m.motorcycle_brands.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [forYear]);

  const forBrand = useMemo(() => forYear.filter((m) => m.brand_id === brandId), [forYear, brandId]);

  const labels = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of forBrand) map.set(m.displacement_label, m.displacement_cc);
    return [...map.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([l]) => l);
  }, [forBrand]);

  const forLabel = useMemo(() => forBrand.filter((m) => m.displacement_label === label), [forBrand, label]);

  const names = useMemo(() => [...new Set(forLabel.map((m) => m.name))].sort(), [forLabel]);

  const versions = useMemo(() => forLabel.filter((m) => m.name === modelName), [forLabel, modelName]);

  const selectedModel = all.find((m) => m.id === modelId) ?? null;

  function pickName(name: string) {
    setModelName(name || null);
    const rows = forLabel.filter((m) => m.name === name);
    // Une seule variante : sélection directe ; sinon la liste « Version » s'affiche
    setModelId(rows.length === 1 ? rows[0].id : null);
  }

  async function save() {
    if (!selectedModel || year === null) return;
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Session expirée");

      let photoPath: string | null = null;
      if (photoFile) photoPath = await uploadPhoto(supabase, photoFile, userId);

      const purchaseHours = (parseInt(hoursH) || 0) + (parseInt(hoursM) || 0) / 60;

      if (isPrimary) {
        await supabase.from("motorcycles").update({ is_primary: false }).eq("is_primary", true);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("motorcycles")
        .insert({
          user_id: userId,
          model_id: selectedModel.id,
          year,
          photo_url: photoPath,
          serial_number: serial || null,
          purchase_date: purchaseDate || null,
          purchase_hours: purchaseHours,
          current_hours: purchaseHours,
          notes: notes || null,
          is_primary: isPrimary,
        })
        .select("id")
        .single();
      if (insertError) throw new Error(insertError.message);

      // Pré-remplit les échéances avec les fréquences par défaut du référentiel
      const { data: types } = await supabase
        .from("maintenance_types")
        .select("*")
        .eq("active", true);
      const schedules = (types ?? [])
        .filter(
          (t) =>
            (t.applies_to_stroke === null || t.applies_to_stroke === selectedModel.stroke) &&
            (t.default_interval_hours !== null || t.default_interval_months !== null),
        )
        .map((t) => ({
          user_id: userId,
          motorcycle_id: inserted.id,
          maintenance_type_id: t.id,
          interval_hours: t.default_interval_hours,
          interval_months: t.default_interval_months,
        }));
      if (schedules.length > 0) await supabase.from("maintenance_schedules").insert(schedules);

      router.push(`/garage/${inserted.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible. Réessayez.");
      setBusy(false);
    }
  }

  if (loading) return (<><PageHeader title="Nouvelle moto" back="/garage" /><Spinner /></>);

  return (
    <>
      <PageHeader title="Nouvelle moto" back="/garage" />
      <p className="mb-3 text-sm font-semibold text-ink-dim">Étape {step} sur 2 — {step === 1 ? "Choisissez le modèle" : "Détails de la moto"}</p>

      {step === 1 && (
        <Card className="flex flex-col gap-4">
          <Field label="Année">
            <Select value={year ?? ""} onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : null); setBrandId(null); setLabel(null); setModelName(null); setModelId(null); }}>
              <option value="">Choisir une année…</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>

          <Field label="Marque">
            <Select disabled={year === null} value={brandId ?? ""} onChange={(e) => { setBrandId(e.target.value ? Number(e.target.value) : null); setLabel(null); setModelName(null); setModelId(null); }}>
              <option value="">Choisir une marque…</option>
              {brands.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </Field>

          <Field label="Cylindrée">
            <Select disabled={brandId === null} value={label ?? ""} onChange={(e) => { setLabel(e.target.value || null); setModelName(null); setModelId(null); }}>
              <option value="">Choisir une cylindrée…</option>
              {labels.map((l) => <option key={l} value={l}>{l.includes("T") ? l.replace(" 2T", " cm³ 2 temps").replace(" 4T", " cm³ 4 temps") : `${l} cm³`}</option>)}
            </Select>
          </Field>

          <Field label="Modèle">
            <Select disabled={label === null} value={modelName ?? ""} onChange={(e) => pickName(e.target.value)}>
              <option value="">Choisir un modèle…</option>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>

          {modelName && versions.length > 1 && (
            <Field label="Version">
              <Select value={modelId ?? ""} onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Choisir une version…</option>
                {versions.map((v) => <option key={v.id} value={v.id}>{v.version ?? "Standard"}</option>)}
              </Select>
            </Field>
          )}

          <Button disabled={!selectedModel} onClick={() => setStep(2)}>Continuer</Button>
        </Card>
      )}

      {step === 2 && selectedModel && (
        <Card className="flex flex-col gap-4">
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm font-bold">
            {selectedModel.motorcycle_brands.name} {selectedModel.name}
            {selectedModel.version ? ` ${selectedModel.version}` : ""} {year} — {selectedModel.displacement_cc} cm³ {selectedModel.stroke} temps
          </p>

          <Field label="Date d'achat">
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </Field>

          <Field label="Heures au moment de l'achat">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} inputMode="numeric" value={hoursH} onChange={(e) => setHoursH(e.target.value)} aria-label="Heures" />
              <Select value={hoursM} onChange={(e) => setHoursM(e.target.value)} aria-label="Minutes">
                {[0, 15, 30, 45].map((m) => <option key={m} value={m}>{m} min</option>)}
              </Select>
            </div>
          </Field>

          <Field label="Numéro de série (facultatif)">
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="VIN…" />
          </Field>

          <Field label="Photo (facultatif)">
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="pt-2.5" />
          </Field>

          <Field label="Notes (facultatif)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Préparation, particularités…" />
          </Field>

          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-6 w-6 accent-accent" />
            <span className="font-semibold">Définir comme moto principale</span>
          </label>

          <ErrorText>{error}</ErrorText>
          <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Ajouter au garage"}</Button>
          <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
        </Card>
      )}
    </>
  );
}
