"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { uploadPhoto } from "@/lib/photos";
import { MOTO_STATUS_LABELS } from "@/lib/domain";
import { Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import type { MotoStatus, MotorcycleWithModel } from "@/lib/types";

export default function ModifierMotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: moto, loading } = useSupabaseQuery<MotorcycleWithModel>(
    async (sb) => must(await sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single()),
    [id],
  );

  const [status, setStatus] = useState<MotoStatus>("active");
  const [isPrimary, setIsPrimary] = useState(false);
  const [serial, setSerial] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [hoursH, setHoursH] = useState("0");
  const [hoursM, setHoursM] = useState("0");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!moto) return;
    setStatus(moto.status);
    setIsPrimary(moto.is_primary);
    setSerial(moto.serial_number ?? "");
    setPurchaseDate(moto.purchase_date ?? "");
    setNotes(moto.notes ?? "");
    const total = Math.round(moto.current_hours * 60);
    setHoursH(String(Math.floor(total / 60)));
    setHoursM(String(total % 60));
  }, [moto]);

  async function save() {
    if (!moto) return;
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      let photoPath = moto.photo_url;
      if (photoFile) {
        const { data: userData } = await supabase.auth.getUser();
        photoPath = await uploadPhoto(supabase, photoFile, userData.user!.id);
      }
      if (isPrimary && !moto.is_primary) {
        await supabase.from("motorcycles").update({ is_primary: false }).eq("is_primary", true);
      }
      // Correction manuelle du compteur autorisée (visible dans l'historique via les notes)
      const currentHours = (parseInt(hoursH) || 0) + (parseInt(hoursM) || 0) / 60;
      const { error: updateError } = await supabase
        .from("motorcycles")
        .update({
          status,
          is_primary: isPrimary,
          serial_number: serial || null,
          purchase_date: purchaseDate || null,
          notes: notes || null,
          photo_url: photoPath,
          current_hours: currentHours,
        })
        .eq("id", moto.id);
      if (updateError) throw new Error(updateError.message);
      router.push(`/garage/${moto.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  if (loading || !moto) return (<><PageHeader title="Modifier" back="/garage" /><Spinner /></>);

  return (
    <>
      <PageHeader title={`Modifier — ${motoLabel(moto)}`} back={`/garage/${moto.id}`} />
      <Card className="flex flex-col gap-4">
        <Field label="Statut">
          <Select value={status} onChange={(e) => setStatus(e.target.value as MotoStatus)}>
            {Object.entries(MOTO_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>

        <Field label="Compteur d'heures actuel" hint="Correction manuelle : à utiliser si le compteur réel diffère.">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} inputMode="numeric" value={hoursH} onChange={(e) => setHoursH(e.target.value)} aria-label="Heures" />
            <Input type="number" min={0} max={59} inputMode="numeric" value={hoursM} onChange={(e) => setHoursM(e.target.value)} aria-label="Minutes" />
          </div>
        </Field>

        <Field label="Date d'achat">
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>

        <Field label="Numéro de série">
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
        </Field>

        <Field label="Changer la photo">
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="pt-2.5" />
        </Field>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-6 w-6 accent-accent" />
          <span className="font-semibold">Moto principale</span>
        </label>

        <ErrorText>{error}</ErrorText>
        <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
      </Card>
    </>
  );
}
