"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, todayISO } from "@/lib/format";
import { FORK_FIELDS, SHOCK_FIELDS, TIRE_FIELDS, type SetupField } from "@/lib/setup-fields";
import { RECO_WARNING, RIDER_LEVELS, SYMPTOMS, SYMPTOM_LABELS } from "@/lib/domain";
import { getAdvice } from "@/lib/reco";
import { Badge, Button, ButtonLink, Card, ChipGroup, ConfirmButton, ErrorText, PageHeader, Spinner, Stars, Textarea } from "@/components/ui";
import type {
  MotorcycleWithModel, SetupRecommendation, SetupRevision,
  SuspensionFeedback, SuspensionSetup, TerrainType,
} from "@/lib/types";

export default function ReglagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    const [setup, motos, terrains, feedbacks, recos, revisions] = await Promise.all([
      sb.from("suspension_setups").select("*").eq("id", id).single(),
      sb.from("motorcycles").select(MOTO_SELECT),
      sb.from("terrain_types").select("*"),
      sb.from("suspension_feedback").select("*").eq("setup_id", id).order("created_at", { ascending: false }),
      sb.from("setup_recommendations").select("*"),
      sb.from("suspension_setup_revisions").select("*").eq("setup_id", id).order("created_at", { ascending: false }).limit(5),
    ]);
    return {
      setup: must(setup) as SuspensionSetup,
      motos: must(motos) as MotorcycleWithModel[],
      terrains: must(terrains) as TerrainType[],
      feedbacks: must(feedbacks) as SuspensionFeedback[],
      recos: must(recos) as SetupRecommendation[],
      revisions: must(revisions) as SetupRevision[],
    };
  }, [id]);

  // Formulaire de ressenti
  const [showFeedback, setShowFeedback] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [comfort, setComfort] = useState(3);
  const [confidence, setConfidence] = useState(3);
  const [comment, setComment] = useState("");
  const [fbError, setFbError] = useState("");
  const [fbBusy, setFbBusy] = useState(false);

  if (loading || !data) return (<><PageHeader title="Réglage" back="/suspensions" /><Spinner /></>);

  const { setup } = data;
  const moto = data.motos.find((m) => m.id === setup.motorcycle_id);
  const terrain = data.terrains.find((t) => t.id === setup.terrain_type_id);
  const levelLabel = RIDER_LEVELS.find((l) => l.value === setup.rider_level)?.label;

  // Conseils basés sur le dernier ressenti + le terrain associé
  const lastFeedback = data.feedbacks[0] ?? null;
  const advice = lastFeedback ? getAdvice(lastFeedback.symptoms, data.recos, terrain?.name) : [];

  async function toggleFavorite() {
    const supabase = createClient();
    await supabase.from("suspension_setups").update({ is_favorite: !setup.is_favorite }).eq("id", setup.id);
    reload();
  }

  async function setRating(v: number) {
    const supabase = createClient();
    await supabase.from("suspension_setups").update({ rating: v }).eq("id", setup.id);
    reload();
  }

  async function saveFeedback() {
    setFbError("");
    setFbBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("suspension_feedback").insert({
      user_id: userData.user!.id,
      setup_id: setup.id,
      feedback_date: todayISO(),
      symptoms,
      comfort,
      confidence,
      comment: comment || null,
    });
    setFbBusy(false);
    if (error) {
      setFbError("Enregistrement impossible. Réessayez.");
      return;
    }
    setShowFeedback(false);
    setSymptoms([]);
    setComment("");
    reload();
  }

  async function restoreRevision(rev: SetupRevision) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    // Sauvegarde l'état actuel avant de restaurer
    const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...current } = setup;
    await supabase.from("suspension_setup_revisions").insert({
      setup_id: setup.id,
      user_id: userData.user!.id,
      snapshot: current,
    });
    const { id: _rid, user_id: _ru, created_at: _rc, updated_at: _rup, is_favorite: _f, rating: _r, ...values } =
      rev.snapshot as SuspensionSetup;
    await supabase.from("suspension_setups").update(values).eq("id", setup.id);
    reload();
  }

  async function deleteSetup() {
    const supabase = createClient();
    const { error } = await supabase.from("suspension_setups").delete().eq("id", setup.id);
    if (!error) {
      router.push("/suspensions");
      router.refresh();
    }
  }

  function valueRows(fields: SetupField[]) {
    return fields
      .map((f) => ({ f, v: setup[f.key] }))
      .filter(({ v }) => v !== null && v !== undefined && v !== "")
      .map(({ f, v }) => (
        <div key={f.key} className="flex items-baseline justify-between gap-3 py-1.5">
          <dt className="text-sm text-ink-dim">{f.label}</dt>
          <dd className="whitespace-nowrap text-base font-black text-accent-strong">
            {String(v)} <span className="text-xs font-semibold text-ink-dim">{f.unit}</span>
          </dd>
        </div>
      ));
  }

  return (
    <>
      <PageHeader
        title={setup.name}
        back="/suspensions"
        action={
          <button onClick={toggleFavorite} aria-label={setup.is_favorite ? "Retirer des favoris" : "Marquer comme favori"} className="flex h-11 w-11 items-center justify-center text-2xl">
            {setup.is_favorite ? "⭐" : "☆"}
          </button>
        }
      />

      <Card>
        <p className="font-bold">{moto ? motoLabel(moto) : ""}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {terrain && <Badge>{terrain.name}</Badge>}
          {setup.terrain_conditions && <Badge>{setup.terrain_conditions}</Badge>}
          {setup.rider_weight_kg !== null && <Badge>{setup.rider_weight_kg} kg équipé</Badge>}
          {levelLabel && <Badge>{levelLabel}</Badge>}
          {setup.temperature_c !== null && <Badge>{setup.temperature_c} °C</Badge>}
          {setup.tire_type && <Badge>{setup.tire_type}</Badge>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-dim">Note :</span>
          <Stars value={setup.rating} onChange={setRating} label="Note du réglage" />
        </div>
        {setup.notes && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-dim">{setup.notes}</p>}
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <ButtonLink href={`/suspensions/${setup.id}/modifier`} variant="secondary" size="sm">Modifier</ButtonLink>
        <ButtonLink href={`/suspensions/nouveau?from=${setup.id}`} variant="secondary" size="sm">Dupliquer</ButtonLink>
        <ButtonLink href={`/suspensions/comparer?a=${setup.id}`} variant="secondary" size="sm">Comparer</ButtonLink>
      </div>

      {(valueRows(TIRE_FIELDS).length > 0) && (
        <Card className="mt-3">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-dim">Pneus</h2>
          <dl className="divide-y divide-border">{valueRows(TIRE_FIELDS)}</dl>
        </Card>
      )}

      <Card className="mt-3">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-dim">Fourche</h2>
        <dl className="divide-y divide-border">
          {valueRows(FORK_FIELDS)}
          {setup.fork_spring_rate && (
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-sm text-ink-dim">Ressort</dt>
              <dd className="font-black text-accent-strong">{setup.fork_spring_rate}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="mt-3">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-dim">Amortisseur</h2>
        <dl className="divide-y divide-border">
          {valueRows(SHOCK_FIELDS)}
          {setup.shock_spring_rate && (
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-sm text-ink-dim">Ressort</dt>
              <dd className="font-black text-accent-strong">{setup.shock_spring_rate}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Ressenti après roulage */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Ressenti après roulage</h2>
        {!showFeedback ? (
          <Button variant="secondary" onClick={() => setShowFeedback(true)}>📝 Noter mon ressenti</Button>
        ) : (
          <Card className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-ink-dim">Qu'avez-vous ressenti ? (plusieurs choix possibles)</p>
            <ChipGroup
              multi
              options={SYMPTOMS.map((s) => ({ value: s.key, label: s.label }))}
              value={symptoms}
              onChange={(v) => setSymptoms(v as string[])}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-dim">Confort général : {comfort}/5</span>
              <input type="range" min={1} max={5} value={comfort} onChange={(e) => setComfort(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-dim">Confiance générale : {confidence}/5</span>
              <input type="range" min={1} max={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
            </label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (facultatif)" />
            <ErrorText>{fbError}</ErrorText>
            <Button onClick={saveFeedback} disabled={fbBusy}>{fbBusy ? "Enregistrement…" : "Enregistrer le ressenti"}</Button>
            <Button variant="secondary" onClick={() => setShowFeedback(false)}>Annuler</Button>
          </Card>
        )}

        {data.feedbacks.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {data.feedbacks.map((f) => (
              <Card key={f.id} className="py-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold">{formatDate(f.feedback_date)}</p>
                  <p className="text-xs text-ink-dim">confort {f.comfort ?? "—"}/5 • confiance {f.confidence ?? "—"}/5</p>
                </div>
                {f.symptoms.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {f.symptoms.map((s) => <Badge key={s} className="bg-warn/15 text-warn">{SYMPTOM_LABELS[s] ?? s}</Badge>)}
                  </div>
                )}
                {f.comment && <p className="mt-1.5 text-sm text-ink-dim">{f.comment}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Conseils de réglage */}
      {advice.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Conseils de réglage</h2>
          <div className="flex flex-col gap-2">
            {advice.map((a) => (
              <Card key={a.key} className="border-l-4 border-l-accent py-3">
                <p className="font-bold">{a.title}</p>
                <p className="mt-1 text-sm text-ink-dim">{a.advice}</p>
              </Card>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-warn/10 px-4 py-3 text-sm font-medium text-warn">⚠️ {RECO_WARNING}</p>
        </section>
      )}

      {/* Historique des versions */}
      {data.revisions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Versions précédentes</h2>
          <Card className="divide-y divide-border p-0">
            {data.revisions.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm font-semibold">{formatDate(rev.created_at.slice(0, 10))}</p>
                <Button size="sm" variant="secondary" onClick={() => restoreRevision(rev)}>Restaurer</Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="mt-6">
        <ConfirmButton
          label="Supprimer ce réglage"
          confirmTitle="Supprimer le réglage ?"
          confirmText="Le réglage, ses versions et ses ressentis seront définitivement supprimés."
          onConfirm={deleteSetup}
        />
      </div>
    </>
  );
}
