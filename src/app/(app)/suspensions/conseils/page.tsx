"use client";

import { useEffect, useState } from "react";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { Badge, ButtonLink, Card, ChipGroup, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { CONDITIONS, RECO_WARNING, RIDER_LEVELS } from "@/lib/domain";
import { clickerAdvice, sagAdvice, springAdvice } from "@/lib/setup-advisor";
import type { Conditions, Profile, RiderLevel, TerrainType } from "@/lib/types";

/** Assistant de réglage : bases de départ selon terrain, conditions et poids */
export default function ConseilsPage() {
  const { data, loading } = useSupabaseQuery(async (sb) => {
    const { data: userData } = await sb.auth.getUser();
    const [profile, terrains] = await Promise.all([
      sb.from("profiles").select("*").eq("id", userData.user!.id).single(),
      sb.from("terrain_types").select("*").eq("active", true).order("sort"),
    ]);
    return { profile: must(profile) as Profile, terrains: must(terrains) as TerrainType[] };
  });

  const [weight, setWeight] = useState("");
  const [level, setLevel] = useState<RiderLevel | "">("");
  const [terrainId, setTerrainId] = useState("");
  const [conditions, setConditions] = useState<Conditions | null>(null);

  // Pré-remplissage depuis le profil
  useEffect(() => {
    if (!data) return;
    if (data.profile.rider_weight_kg != null) setWeight(String(data.profile.rider_weight_kg));
    if (data.profile.rider_level) setLevel(data.profile.rider_level);
  }, [data]);

  if (loading || !data) return (<><PageHeader title="Conseils de réglage" back="/suspensions" /><Spinner /></>);

  const terrainName = data.terrains.find((t) => t.id === Number(terrainId))?.name ?? null;
  const weightValue = weight.trim() === "" ? null : Number(weight.replace(",", "."));

  const sag = sagAdvice(terrainName, level || null);
  const springs = springAdvice(weightValue);
  const clicks = clickerAdvice(terrainName, conditions);

  return (
    <>
      <PageHeader title="Conseils de réglage" back="/suspensions" />
      <p className="mb-4 text-sm leading-relaxed text-ink-dim">
        Des bases de départ selon votre poids, le terrain et les conditions. Réglez d'abord le SAG,
        puis affinez aux clics — un seul paramètre à la fois.
      </p>

      {/* Paramètres */}
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poids équipé (kg)">
            <Input type="number" inputMode="decimal" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Niveau">
            <Select value={level} onChange={(e) => setLevel(e.target.value as RiderLevel | "")}>
              <option value="">—</option>
              {RIDER_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Type de terrain">
          <Select value={terrainId} onChange={(e) => setTerrainId(e.target.value)}>
            <option value="">Choisir un terrain…</option>
            {data.terrains.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Conditions">
          <ChipGroup options={CONDITIONS.map((c) => ({ value: c.value, label: c.label }))} value={conditions} onChange={(v) => setConditions(v as Conditions | null)} />
        </Field>
      </Card>

      {/* SAG cible */}
      <Card className="mt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet/15 text-lg" aria-hidden>🎯</span>
          <h2 className="font-extrabold">SAG cible</h2>
          {terrainName && <Badge>{terrainName}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-accent-strong">{sag.staticMin}–{sag.staticMax} <span className="text-sm">mm</span></p>
            <p className="text-xs text-ink-dim">SAG statique (moto seule)</p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-accent-strong">{sag.riderMin}–{sag.riderMax} <span className="text-sm">mm</span></p>
            <p className="text-xs text-ink-dim">SAG avec pilote</p>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">{sag.note}</p>
      </Card>

      {/* Ressorts selon le poids */}
      <Card className="mt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-lg" aria-hidden>🌀</span>
          <h2 className="font-extrabold">Ressorts selon votre poids</h2>
        </div>
        {springs ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
                <p className="text-lg font-black text-accent-strong">{springs.fork}</p>
                <p className="text-xs text-ink-dim">Fourche</p>
              </div>
              <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
                <p className="text-lg font-black text-accent-strong">{springs.shock}</p>
                <p className="text-xs text-ink-dim">Amortisseur</p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{springs.note}</p>
          </>
        ) : (
          <p className="text-sm text-ink-dim">Indiquez votre poids équipé (casque, bottes, protections) pour obtenir une suggestion de dureté de ressorts.</p>
        )}
      </Card>

      {/* Ajustements de clics */}
      <Card className="mt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ok/10 text-lg" aria-hidden>🔧</span>
          <h2 className="font-extrabold">Ajustements par rapport à votre base</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {clicks.map((c, i) => (
            <div key={i} className="flex gap-2.5">
              <Badge className="h-fit shrink-0">{c.area}</Badge>
              <p className="text-sm leading-relaxed text-ink-dim">{c.tip}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-3 rounded-xl bg-warn/10 px-4 py-3 text-sm font-medium text-warn">⚠️ {RECO_WARNING}</p>

      <div className="mt-4">
        <ButtonLink href="/suspensions/nouveau">Créer un réglage avec ces bases</ButtonLink>
      </div>
    </>
  );
}
