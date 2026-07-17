"use client";

import { use, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { buildSuggestedSchedules, findSpecForMoto, SPEC_WARNING } from "@/lib/specs";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import type { MaintenanceSchedule, MaintenanceType, ModelSpec, MotorcycleWithModel } from "@/lib/types";

export default function FicheTechniquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    const moto = must(await sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single()) as MotorcycleWithModel;
    const [specs, types, schedules] = await Promise.all([
      sb.from("model_specs").select("*").eq("model_id", moto.model_id),
      sb.from("maintenance_types").select("*"),
      sb.from("maintenance_schedules").select("*").eq("motorcycle_id", id),
    ]);
    return {
      moto,
      specs: must(specs) as ModelSpec[],
      types: must(types) as MaintenanceType[],
      schedules: must(schedules) as MaintenanceSchedule[],
    };
  }, [id]);

  const [applyMsg, setApplyMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !data) return (<><PageHeader title="Fiche technique" back={`/garage/${id}`} /><Spinner /></>);

  const spec = findSpecForMoto(data.specs, data.moto);

  if (!spec) {
    return (
      <>
        <PageHeader title="Fiche technique" back={`/garage/${id}`} />
        <EmptyState
          icon="📖"
          title="Pas encore de fiche pour ce modèle"
          text={`Aucune fiche technique n'est disponible pour ${motoLabel(data.moto)} pour l'instant. Les fiches sont ajoutées progressivement modèle par modèle.`}
        />
      </>
    );
  }

  const suggested = buildSuggestedSchedules(spec.suggested_intervals, data.types, data.schedules, data.moto.id);
  const typeName = (tid: number) => data.types.find((t) => t.id === tid)?.name ?? "";

  async function applySuggested() {
    setBusy(true);
    setApplyMsg("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("maintenance_schedules")
      .insert(suggested.map((s) => ({ ...s, user_id: userData.user!.id })));
    setBusy(false);
    if (error) {
      setApplyMsg("Application impossible. Réessayez.");
      return;
    }
    setApplyMsg(`${suggested.length} échéance(s) ajoutée(s) ✔ — ajustez-les dans « Échéances et alertes ».`);
    reload();
  }

  const engineRows: [string, string | null][] = [
    ["Huile", spec.oil_qty],
    ["Type d'huile", spec.oil_type],
    ["Liquide de refroidissement", spec.coolant_qty],
    ["Mélange 2 temps", spec.premix_ratio],
    ["Jeu soupapes admission", spec.valve_intake],
    ["Jeu soupapes échappement", spec.valve_exhaust],
    ["Bougie", spec.spark_plug],
  ];
  const suspensionRows: [string, string | null][] = [
    ["Fourche", spec.fork_info],
    ["Clics fourche (origine)", spec.fork_clicks],
    ["Clics amortisseur (origine)", spec.shock_clicks],
    ["SAG recommandé", spec.sag_recommended],
  ];

  return (
    <>
      <PageHeader title="Fiche technique" back={`/garage/${id}`} />

      <Card className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-extrabold">{motoLabel(data.moto)}</p>
          <Badge className={spec.verified ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}>
            {spec.verified ? "Vérifiée" : "Indicative"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-ink-dim">Fiche valable {spec.year_from}–{spec.year_to}</p>
      </Card>

      <p className="mb-3 rounded-xl bg-warn/10 px-4 py-3 text-sm font-medium text-warn">⚠️ {SPEC_WARNING}</p>

      <SpecSection icon="⚙️" title="Moteur" rows={engineRows} />
      <SpecSection icon="🎚️" title="Suspensions (réglages d'origine)" rows={suspensionRows} />

      {spec.torques.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-2 flex items-center gap-2 font-extrabold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-lg" aria-hidden>🔩</span>
            Couples de serrage
          </h2>
          <dl className="divide-y divide-border">
            {spec.torques.map((t, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-sm text-ink-dim">{t.name}</dt>
                <dd className="whitespace-nowrap font-black text-accent-strong">{t.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {spec.suggested_intervals.length > 0 && (
        <Card className="mt-3">
          <h2 className="mb-2 flex items-center gap-2 font-extrabold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet/15 text-lg" aria-hidden>📅</span>
            Intervalles suggérés
          </h2>
          <dl className="divide-y divide-border">
            {spec.suggested_intervals.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-sm text-ink-dim">{s.type_name}</dt>
                <dd className="whitespace-nowrap text-sm font-bold">
                  {s.hours != null && `toutes les ${s.hours} h`}
                  {s.hours != null && s.months != null && " / "}
                  {s.months != null && `tous les ${s.months} mois`}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ink-dim">
            Rien n'est appliqué automatiquement : le bouton ci-dessous ajoute uniquement les opérations
            pour lesquelles vous n'avez pas encore défini d'échéance.
          </p>
          {applyMsg && <p className="mt-2 rounded-xl bg-ok/10 px-3 py-2 text-sm font-medium text-ok">{applyMsg}</p>}
          <div className="mt-3 flex flex-col gap-2">
            {suggested.length > 0 ? (
              <Button size="md" onClick={applySuggested} disabled={busy}>
                {busy ? "Application…" : `Appliquer ${suggested.length} échéance(s) suggérée(s)`}
              </Button>
            ) : (
              !applyMsg && <p className="text-sm font-semibold text-ink-dim">✔ Toutes ces opérations ont déjà une échéance définie.</p>
            )}
            <ButtonLink href={`/garage/${id}/echeances`} variant="secondary" size="md">Voir mes échéances</ButtonLink>
          </div>
        </Card>
      )}

      {spec.notes && <p className="mt-3 text-xs leading-relaxed text-ink-dim">{spec.notes}</p>}
    </>
  );
}

function SpecSection({ icon, title, rows }: { icon: string; title: string; rows: [string, string | null][] }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <Card className="mt-3">
      <h2 className="mb-2 flex items-center gap-2 font-extrabold">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2 text-lg" aria-hidden>{icon}</span>
        {title}
      </h2>
      <dl className="divide-y divide-border">
        {filled.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-sm text-ink-dim">{label}</dt>
            <dd className="text-right text-sm font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
