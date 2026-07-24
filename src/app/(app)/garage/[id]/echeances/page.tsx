"use client";

import { use, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT } from "@/lib/moto";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/domain";
import { Button, Card, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import type { MaintenanceCategory, MaintenanceSchedule, MaintenanceType, MotorcycleWithModel } from "@/lib/types";

interface EcheancesData {
  moto: MotorcycleWithModel;
  types: MaintenanceType[];
  schedules: MaintenanceSchedule[];
}

/**
 * Suivis d'entretien : rien n'est suivi par défaut, l'utilisateur
 * ajoute ses échéances une par une. Chaque action est enregistrée
 * immédiatement (pas de gros formulaire à valider).
 */
export default function EcheancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, loading, reload } = useSupabaseQuery<EcheancesData>(async (sb) => {
    const [moto, types, schedules] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single(),
      sb.from("maintenance_types").select("*").eq("active", true).order("sort"),
      sb.from("maintenance_schedules").select("*").eq("motorcycle_id", id),
    ]);
    return { moto: must(moto), types: must(types), schedules: must(schedules) };
  }, [id]);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading || !data) return (<><PageHeader title="Suivis d'entretien" back={`/garage/${id}`} /><Spinner /></>);

  const stroke = data.moto.motorcycle_models.stroke;
  const availableTypes = data.types.filter(
    (t) =>
      (t.applies_to_stroke === null || t.applies_to_stroke === stroke) &&
      !data.schedules.some((s) => s.maintenance_type_id === t.id),
  );
  const typeOf = (typeId: number) => data.types.find((t) => t.id === typeId);

  // Suivis groupés par catégorie, dans l'ordre du référentiel
  const followed = [...data.schedules].sort((a, b) => {
    const ta = typeOf(a.maintenance_type_id);
    const tb = typeOf(b.maintenance_type_id);
    return (ta?.category ?? "").localeCompare(tb?.category ?? "") || (ta?.sort ?? 0) - (tb?.sort ?? 0);
  });

  async function toggleBell(s: MaintenanceSchedule) {
    const supabase = createClient();
    await supabase.from("maintenance_schedules").update({ alert_enabled: !s.alert_enabled }).eq("id", s.id);
    reload();
  }

  async function removeSchedule(s: MaintenanceSchedule) {
    const supabase = createClient();
    await supabase.from("maintenance_schedules").delete().eq("id", s.id);
    reload();
  }

  async function removeAll() {
    const supabase = createClient();
    await supabase.from("maintenance_schedules").delete().eq("motorcycle_id", id);
    reload();
  }

  return (
    <>
      <PageHeader title="Suivis d'entretien" back={`/garage/${id}`} />
      <p className="mb-4 text-sm leading-relaxed text-ink-dim">
        Choisissez les opérations que vous voulez surveiller et leur fréquence.
        Seules celles-ci apparaîtront dans le carnet et les alertes.
      </p>

      {!showAdd && (
        <Button className="mb-4" onClick={() => setShowAdd(true)}>＋ Ajouter un suivi</Button>
      )}
      {showAdd && (
        <AddForm
          motoId={id}
          types={availableTypes}
          onDone={() => { setShowAdd(false); reload(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {followed.length === 0 && !showAdd ? (
        <EmptyState
          icon="📅"
          title="Aucun suivi pour l'instant"
          text="Ajoutez votre premier suivi — par exemple « Vidange moteur toutes les 5 h » — et PitLog surveillera l'échéance pour vous."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {followed.map((s) => {
            const type = typeOf(s.maintenance_type_id);
            if (!type) return null;
            return (
              <Card key={s.id} className="py-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{type.name}</p>
                    <p className="text-xs text-ink-dim">
                      {MAINTENANCE_CATEGORY_LABELS[type.category]} •{" "}
                      {[
                        s.interval_hours != null ? `toutes les ${s.interval_hours} h` : "",
                        s.interval_months != null ? `tous les ${s.interval_months} mois` : "",
                      ].filter(Boolean).join(" / ")}
                      {!s.alert_enabled && " • alerte coupée"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.alert_enabled}
                    aria-label={`${type.name} : alerte ${s.alert_enabled ? "activée" : "coupée"}`}
                    onClick={() => toggleBell(s)}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      s.alert_enabled ? "bg-accent-soft" : "bg-surface-2 grayscale opacity-60"
                    }`}
                  >
                    {s.alert_enabled ? "🔔" : "🔕"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Modifier ${type.name}`}
                    onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  </button>
                </div>
                {editingId === s.id && (
                  <EditForm
                    schedule={s}
                    typeName={type.name}
                    onDone={() => { setEditingId(null); reload(); }}
                    onRemove={() => removeSchedule(s)}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {followed.length > 0 && (
        <div className="mt-6">
          <ConfirmButton
            label="Tout retirer"
            confirmTitle="Retirer tous les suivis ?"
            confirmText="Toutes les échéances de cette moto seront supprimées. L'historique des entretiens déjà enregistrés est conservé."
            onConfirm={removeAll}
          />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Ajout d'un suivi : opération → fréquence → terminé
// ------------------------------------------------------------
function AddForm({
  motoId,
  types,
  onDone,
  onCancel,
}: {
  motoId: string;
  types: MaintenanceType[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [typeId, setTypeId] = useState("");
  const [hours, setHours] = useState("");
  const [months, setMonths] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    if (!typeId) {
      setError("Choisissez une opération.");
      return;
    }
    const h = hours.trim() === "" ? null : Number(hours.replace(",", "."));
    const m = months.trim() === "" ? null : parseInt(months);
    if (h === null && m === null) {
      setError("Indiquez une fréquence : en heures, en mois, ou les deux.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("maintenance_schedules").insert({
      user_id: userData.user!.id,
      motorcycle_id: motoId,
      maintenance_type_id: Number(typeId),
      interval_hours: h,
      interval_months: m,
    });
    setBusy(false);
    if (insertError) {
      setError("Enregistrement impossible. Réessayez.");
      return;
    }
    onDone();
  }

  return (
    <Card className="mb-4 flex flex-col gap-3">
      <Field label="Opération à suivre">
        <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">Choisir…</option>
          {(["moteur", "partie_cycle", "suspensions"] as MaintenanceCategory[]).map((cat) => (
            <optgroup key={cat} label={MAINTENANCE_CATEGORY_LABELS[cat]}>
              {types.filter((t) => t.category === cat).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Toutes les… (heures)">
          <Input type="number" min={0} step="0.5" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ex : 5" />
        </Field>
        <Field label="Ou tous les… (mois)">
          <Input type="number" min={0} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="Ex : 12" />
        </Field>
      </div>
      <p className="text-xs text-ink-dim">Si les deux sont remplis, la première échéance atteinte fait foi.</p>
      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>{busy ? "Ajout…" : "Ajouter le suivi"}</Button>
      <Button size="md" variant="secondary" onClick={onCancel}>Annuler</Button>
    </Card>
  );
}

// ------------------------------------------------------------
// Modification d'un suivi (repliée derrière le crayon)
// ------------------------------------------------------------
function EditForm({
  schedule,
  typeName,
  onDone,
  onRemove,
}: {
  schedule: MaintenanceSchedule;
  typeName: string;
  onDone: () => void;
  onRemove: () => void;
}) {
  const [hours, setHours] = useState(schedule.interval_hours != null ? String(schedule.interval_hours) : "");
  const [months, setMonths] = useState(schedule.interval_months != null ? String(schedule.interval_months) : "");
  const [showAdvanced, setShowAdvanced] = useState(
    schedule.alert_before_hours != null || schedule.alert_before_months != null,
  );
  const [beforeH, setBeforeH] = useState(schedule.alert_before_hours != null ? String(schedule.alert_before_hours) : "");
  const [beforeM, setBeforeM] = useState(schedule.alert_before_months != null ? String(schedule.alert_before_months) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    const h = hours.trim() === "" ? null : Number(hours.replace(",", "."));
    const m = months.trim() === "" ? null : parseInt(months);
    if (h === null && m === null) {
      setError("Indiquez au moins une fréquence (ou supprimez le suivi).");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("maintenance_schedules")
      .update({
        interval_hours: h,
        interval_months: m,
        alert_before_hours: beforeH.trim() === "" ? null : Number(beforeH.replace(",", ".")),
        alert_before_months: beforeM.trim() === "" ? null : Number(beforeM.replace(",", ".")),
      })
      .eq("id", schedule.id);
    setBusy(false);
    if (updateError) {
      setError("Enregistrement impossible. Réessayez.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Toutes les… (heures)">
          <Input type="number" min={0} step="0.5" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="—" />
        </Field>
        <Field label="Tous les… (mois)">
          <Input type="number" min={0} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="—" />
        </Field>
      </div>

      {!showAdvanced ? (
        <button type="button" onClick={() => setShowAdvanced(true)} className="self-start text-sm font-semibold text-accent-strong">
          ⚙️ Seuil d'alerte personnalisé (avancé)
        </button>
      ) : (
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink-dim">
            Passer à l'orange… <span className="font-normal">(vide = automatique, à 20 % de la fréquence)</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="… X heures avant">
              <Input type="number" min={0} step="0.5" inputMode="decimal" value={beforeH} onChange={(e) => setBeforeH(e.target.value)} placeholder="auto" />
            </Field>
            <Field label="… X mois avant">
              <Input type="number" min={0} step="0.5" inputMode="decimal" value={beforeM} onChange={(e) => setBeforeM(e.target.value)} placeholder="auto" />
            </Field>
          </div>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
      <ConfirmButton
        label={`Ne plus suivre « ${typeName} »`}
        size="md"
        confirmTitle="Retirer ce suivi ?"
        confirmText="L'échéance sera supprimée. L'historique des entretiens déjà enregistrés est conservé."
        onConfirm={onRemove}
      />
    </div>
  );
}
