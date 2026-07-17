"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT } from "@/lib/moto";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/domain";
import { Button, Card, ErrorText, Input, PageHeader, Spinner } from "@/components/ui";
import type { MaintenanceCategory, MaintenanceSchedule, MaintenanceType, MotorcycleWithModel } from "@/lib/types";

interface EcheancesData {
  moto: MotorcycleWithModel;
  types: MaintenanceType[];
  schedules: MaintenanceSchedule[];
}

interface RowState {
  hours: string;
  months: string;
  alertEnabled: boolean;
  beforeHours: string;
  beforeMonths: string;
}

/** Fréquences d'entretien et alertes : « toutes les X heures » et/ou « tous les X mois » */
export default function EcheancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading } = useSupabaseQuery<EcheancesData>(async (sb) => {
    const [moto, types, schedules] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single(),
      sb.from("maintenance_types").select("*").eq("active", true).order("sort"),
      sb.from("maintenance_schedules").select("*").eq("motorcycle_id", id),
    ]);
    return { moto: must(moto), types: must(types), schedules: must(schedules) };
  }, [id]);

  const [values, setValues] = useState<Record<number, RowState>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const v: Record<number, RowState> = {};
    for (const t of data.types) {
      const s = data.schedules.find((x) => x.maintenance_type_id === t.id);
      v[t.id] = {
        hours: s?.interval_hours != null ? String(s.interval_hours) : "",
        months: s?.interval_months != null ? String(s.interval_months) : "",
        alertEnabled: s?.alert_enabled ?? true,
        beforeHours: s?.alert_before_hours != null ? String(s.alert_before_hours) : "",
        beforeMonths: s?.alert_before_months != null ? String(s.alert_before_months) : "",
      };
    }
    setValues(v);
  }, [data]);

  function setRow(typeId: number, patch: Partial<RowState>) {
    setValues((v) => ({ ...v, [typeId]: { ...v[typeId], ...patch } }));
  }

  async function save() {
    if (!data) return;
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

      const toUpsert = [];
      const toDelete = [];
      for (const t of data.types) {
        const v = values[t.id];
        if (!v) continue;
        const hours = num(v.hours);
        const months = v.months.trim() === "" ? null : parseInt(v.months);
        const existing = data.schedules.find((x) => x.maintenance_type_id === t.id);
        if (hours === null && months === null) {
          if (existing) toDelete.push(existing.id);
        } else {
          toUpsert.push({
            user_id: userId,
            motorcycle_id: id,
            maintenance_type_id: t.id,
            interval_hours: hours,
            interval_months: months,
            alert_enabled: v.alertEnabled,
            alert_before_hours: num(v.beforeHours),
            alert_before_months: num(v.beforeMonths),
          });
        }
      }
      if (toDelete.length > 0) {
        const { error: e1 } = await supabase.from("maintenance_schedules").delete().in("id", toDelete);
        if (e1) throw new Error(e1.message);
      }
      if (toUpsert.length > 0) {
        const { error: e2 } = await supabase
          .from("maintenance_schedules")
          .upsert(toUpsert, { onConflict: "motorcycle_id,maintenance_type_id" });
        if (e2) throw new Error(e2.message);
      }
      router.push(`/garage/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  if (loading || !data) return (<><PageHeader title="Échéances" back={`/garage/${id}`} /><Spinner /></>);

  const stroke = data.moto.motorcycle_models.stroke;
  const visibleTypes = data.types.filter((t) => t.applies_to_stroke === null || t.applies_to_stroke === stroke);

  return (
    <>
      <PageHeader title="Échéances et alertes" back={`/garage/${id}`} />
      <p className="mb-4 text-sm leading-relaxed text-ink-dim">
        Définissez la fréquence de chaque opération (heures moteur et/ou mois — la première échéance
        atteinte fait foi). La cloche 🔔 contrôle l'alerte : coupée, l'opération garde son statut sur
        la fiche moto mais ne remonte plus dans les urgences. Vous pouvez aussi choisir votre propre
        seuil d'alerte (« prévenir X h avant ») au lieu du seuil automatique.
      </p>

      {(["moteur", "partie_cycle", "suspensions"] as MaintenanceCategory[]).map((cat) => {
        const list = visibleTypes.filter((t) => t.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat} className="mb-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">{MAINTENANCE_CATEGORY_LABELS[cat]}</h2>
            <Card className="divide-y divide-border p-0">
              {list.map((t) => {
                const v = values[t.id];
                const tracked = v && (v.hours.trim() !== "" || v.months.trim() !== "");
                return (
                  <div key={t.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold">{t.name}</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" min={0} step="0.5" inputMode="decimal"
                          value={v?.hours ?? ""}
                          onChange={(e) => setRow(t.id, { hours: e.target.value })}
                          className="w-16 text-center" aria-label={`${t.name} : fréquence en heures`} placeholder="—"
                        />
                        <span className="text-xs text-ink-dim">h</span>
                        <Input
                          type="number" min={0} inputMode="numeric"
                          value={v?.months ?? ""}
                          onChange={(e) => setRow(t.id, { months: e.target.value })}
                          className="w-14 text-center" aria-label={`${t.name} : fréquence en mois`} placeholder="—"
                        />
                        <span className="text-xs text-ink-dim">mois</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={v?.alertEnabled ?? true}
                          aria-label={`${t.name} : alerte ${v?.alertEnabled ? "activée" : "coupée"}`}
                          disabled={!tracked}
                          onClick={() => setRow(t.id, { alertEnabled: !(v?.alertEnabled ?? true) })}
                          className={`ml-1 flex h-10 w-10 items-center justify-center rounded-full text-lg disabled:opacity-30 ${
                            v?.alertEnabled ?? true ? "bg-accent-soft" : "bg-surface-2 grayscale opacity-60"
                          }`}
                        >
                          {v?.alertEnabled ?? true ? "🔔" : "🔕"}
                        </button>
                      </div>
                    </div>
                    {tracked && v?.alertEnabled && (
                      <div className="mt-2 flex items-center justify-end gap-1 text-xs text-ink-dim">
                        <span className="mr-1">Alerter</span>
                        <Input
                          type="number" min={0} step="0.5" inputMode="decimal"
                          value={v.beforeHours}
                          onChange={(e) => setRow(t.id, { beforeHours: e.target.value })}
                          className="!min-h-9 w-16 text-center" aria-label={`${t.name} : alerter X heures avant`} placeholder="auto"
                        />
                        <span>h avant</span>
                        <Input
                          type="number" min={0} step="0.5" inputMode="decimal"
                          value={v.beforeMonths}
                          onChange={(e) => setRow(t.id, { beforeMonths: e.target.value })}
                          className="!min-h-9 w-14 text-center" aria-label={`${t.name} : alerter X mois avant`} placeholder="auto"
                        />
                        <span>mois avant</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}

      <ErrorText>{error}</ErrorText>
      <div className="mt-3">
        <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer les échéances"}</Button>
      </div>
    </>
  );
}
