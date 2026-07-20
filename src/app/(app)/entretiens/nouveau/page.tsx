"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { uploadPhoto } from "@/lib/photos";
import { todayISO } from "@/lib/format";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/domain";
import { Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import type { MaintenanceCategory, MaintenanceType, MotorcycleWithModel } from "@/lib/types";

export default function NouvelEntretienPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EntretienForm />
    </Suspense>
  );
}

function EntretienForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMoto = searchParams.get("moto");
  const presetType = searchParams.get("type");

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [motos, types] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).neq("status", "sold").order("is_primary", { ascending: false }),
      sb.from("maintenance_types").select("*").eq("active", true).order("sort"),
    ]);
    return { motos: must(motos) as MotorcycleWithModel[], types: must(types) as MaintenanceType[] };
  });

  const [motoId, setMotoId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [hoursH, setHoursH] = useState("");
  const [hoursM, setHoursM] = useState("");
  const [parts, setParts] = useState("");
  const [cost, setCost] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const moto = data?.motos.find((m) => m.id === motoId) ?? null;

  useEffect(() => {
    if (data && !motoId) setMotoId(presetMoto ?? data.motos[0]?.id ?? "");
    if (data && !typeId && presetType) setTypeId(presetType);
  }, [data, presetMoto, presetType, motoId, typeId]);

  // Pré-remplit les heures avec le compteur actuel de la moto choisie
  useEffect(() => {
    if (!moto) return;
    const total = Math.round(moto.current_hours * 60);
    setHoursH(String(Math.floor(total / 60)));
    setHoursM(String(total % 60));
  }, [moto]);

  const visibleTypes = (data?.types ?? []).filter(
    (t) => !moto || t.applies_to_stroke === null || t.applies_to_stroke === moto.motorcycle_models.stroke,
  );

  async function save() {
    setError("");
    if (!motoId || !typeId) {
      setError("Choisissez la moto et le type d'entretien.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      let photoPath: string | null = null;
      if (photoFile) photoPath = await uploadPhoto(supabase, photoFile, userId);

      const hoursAt = (parseInt(hoursH) || 0) + (parseInt(hoursM) || 0) / 60;
      const costValue = cost.trim() === "" ? null : Number(cost.replace(",", "."));

      const { data: inserted, error: insertError } = await supabase
        .from("maintenance_records")
        .insert({
          user_id: userId,
          motorcycle_id: motoId,
          maintenance_type_id: Number(typeId),
          record_date: date,
          hours_at: hoursAt,
          parts_replaced: parts || null,
          cost: costValue,
          workshop: workshop || null,
          comment: comment || null,
          photo_url: photoPath,
        })
        .select("id")
        .single();
      if (insertError) throw new Error(insertError.message);

      // Le coût alimente automatiquement le suivi des dépenses
      if (costValue !== null && costValue > 0) {
        const typeName = data!.types.find((t) => t.id === Number(typeId))?.name ?? "Entretien";
        await supabase.from("expenses").insert({
          user_id: userId,
          motorcycle_id: motoId,
          maintenance_record_id: inserted.id,
          expense_date: date,
          category: "entretien",
          label: typeName,
          amount: costValue,
        });
      }

      router.push(`/garage/${motoId}`);
      router.refresh();
    } catch {
      setError("Enregistrement impossible. Vérifiez votre réseau et réessayez.");
      setBusy(false);
    }
  }

  if (loading || !data) return (<><PageHeader title="Nouvel entretien" back="/entretiens" /><Spinner /></>);

  if (data.motos.length === 0) {
    return (
      <>
        <PageHeader title="Nouvel entretien" back="/entretiens" />
        <Card>Ajoutez d'abord une moto dans le garage.</Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Nouvel entretien" back="/entretiens" />
      <Card className="flex flex-col gap-4">
        <Field label="Moto">
          <Select value={motoId} onChange={(e) => setMotoId(e.target.value)}>
            {data.motos.map((m) => <option key={m.id} value={m.id}>{motoLabel(m)}</option>)}
          </Select>
        </Field>

        <Field label="Type d'entretien">
          <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Choisir une opération…</option>
            {(["moteur", "partie_cycle", "suspensions"] as MaintenanceCategory[]).map((cat) => (
              <optgroup key={cat} label={MAINTENANCE_CATEGORY_LABELS[cat]}>
                {visibleTypes.filter((t) => t.category === cat).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Date">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Heures de la moto au moment de l'entretien">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} inputMode="numeric" value={hoursH} onChange={(e) => setHoursH(e.target.value)} aria-label="Heures" />
            <Input type="number" min={0} max={59} inputMode="numeric" value={hoursM} onChange={(e) => setHoursM(e.target.value)} aria-label="Minutes" />
          </div>
        </Field>

        {!showDetails ? (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="min-h-11 self-start text-sm font-semibold text-accent"
          >
            ＋ Ajouter des détails (pièces, coût, photo…)
          </button>
        ) : (
          <>
            <Field label="Pièces remplacées (facultatif)">
              <Input value={parts} onChange={(e) => setParts(e.target.value)} placeholder="Ex : piston Vertex, joints…" />
            </Field>

            <Field label="Coût en € (facultatif)">
              <Input type="number" min={0} step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
            </Field>

            <Field label="Atelier ou mécanicien (facultatif)">
              <Input value={workshop} onChange={(e) => setWorkshop(e.target.value)} placeholder="Moi-même, concession…" />
            </Field>

            <Field label="Photo ou facture (facultatif)">
              <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="pt-2.5" />
            </Field>

            <Field label="Commentaire (facultatif)">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
          </>
        )}

        <ErrorText>{error}</ErrorText>
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer l'entretien"}
        </Button>
      </Card>
    </>
  );
}
