"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { todayISO } from "@/lib/format";
import { CONDITIONS } from "@/lib/domain";
import { Button, Card, ChipGroup, ErrorText, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import type { Conditions, MotorcycleWithModel, TerrainType } from "@/lib/types";

const QUICK_DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 h" },
  { value: 180, label: "3 h" },
];

export default function NouvelleSessionPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SessionForm />
    </Suspense>
  );
}

function SessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMoto = searchParams.get("moto");

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [motos, terrains] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).neq("status", "sold").order("is_primary", { ascending: false }),
      sb.from("terrain_types").select("*").eq("active", true).order("sort"),
    ]);
    return { motos: must(motos) as MotorcycleWithModel[], terrains: must(terrains) as TerrainType[] };
  });

  const [motoId, setMotoId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [quickDuration, setQuickDuration] = useState<number | null>(60);
  const [customH, setCustomH] = useState("");
  const [customM, setCustomM] = useState("");
  const [terrainId, setTerrainId] = useState<string>("");
  const [trackName, setTrackName] = useState("");
  const [conditions, setConditions] = useState<Conditions | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !motoId) {
      setMotoId(presetMoto ?? data.motos[0]?.id ?? "");
    }
  }, [data, presetMoto, motoId]);

  const customMinutes = (parseInt(customH) || 0) * 60 + (parseInt(customM) || 0);
  const duration = customMinutes > 0 ? customMinutes : quickDuration ?? 0;

  async function save() {
    setError("");
    if (!motoId) {
      setError("Choisissez une moto.");
      return;
    }
    if (duration <= 0) {
      setError("Indiquez la durée de la session.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("riding_sessions").insert({
      user_id: userData.user!.id,
      motorcycle_id: motoId,
      session_date: date,
      duration_minutes: duration,
      terrain_type_id: terrainId ? Number(terrainId) : null,
      track_name: trackName || null,
      conditions,
      comment: comment || null,
    });
    if (insertError) {
      setError("Enregistrement impossible. Vérifiez votre réseau et réessayez.");
      setBusy(false);
      return;
    }
    router.push(`/garage/${motoId}`);
    router.refresh();
  }

  if (loading || !data) return (<><PageHeader title="Nouvelle session" back="/accueil" /><Spinner /></>);

  if (data.motos.length === 0) {
    return (
      <>
        <PageHeader title="Nouvelle session" back="/accueil" />
        <Card>Ajoutez d'abord une moto dans le garage.</Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Nouvelle session" back="/accueil" />
      <Card className="flex flex-col gap-4">
        <Field label="Moto">
          <Select value={motoId} onChange={(e) => setMotoId(e.target.value)}>
            {data.motos.map((m) => <option key={m.id} value={m.id}>{motoLabel(m)}</option>)}
          </Select>
        </Field>

        <Field label="Date">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Durée de roulage">
          <ChipGroup
            options={QUICK_DURATIONS}
            value={customMinutes > 0 ? null : quickDuration}
            onChange={(v) => { setQuickDuration(v as number | null); setCustomH(""); setCustomM(""); }}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input type="number" min={0} inputMode="numeric" placeholder="Heures" value={customH} onChange={(e) => setCustomH(e.target.value)} aria-label="Durée personnalisée : heures" />
            <Input type="number" min={0} max={59} inputMode="numeric" placeholder="Minutes" value={customM} onChange={(e) => setCustomM(e.target.value)} aria-label="Durée personnalisée : minutes" />
          </div>
        </Field>

        <Field label="Type de terrain">
          <Select value={terrainId} onChange={(e) => setTerrainId(e.target.value)}>
            <option value="">Non précisé</option>
            {data.terrains.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>

        <Field label="Nom du terrain (facultatif)">
          <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Ex : MX Park Romagné" />
        </Field>

        <Field label="Conditions">
          <ChipGroup options={CONDITIONS.map((c) => ({ value: c.value, label: c.label }))} value={conditions} onChange={(v) => setConditions(v as Conditions | null)} />
        </Field>

        <Field label="Commentaire (facultatif)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Sensations, chrono, incidents…" />
        </Field>

        <ErrorText>{error}</ErrorText>
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer la session"}
        </Button>
      </Card>
    </>
  );
}
