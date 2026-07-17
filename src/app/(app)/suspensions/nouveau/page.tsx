"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT } from "@/lib/moto";
import SetupForm, { type SetupPayload } from "@/components/SetupForm";
import { Card, PageHeader, Spinner } from "@/components/ui";
import type { MotorcycleWithModel, SuspensionSetup, TerrainType } from "@/lib/types";

export default function NouveauReglagePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NouveauReglage />
    </Suspense>
  );
}

function NouveauReglage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from"); // duplication d'un réglage existant
  const presetMoto = searchParams.get("moto");

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [motos, terrains, from] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).neq("status", "sold").order("is_primary", { ascending: false }),
      sb.from("terrain_types").select("*").eq("active", true).order("sort"),
      fromId
        ? sb.from("suspension_setups").select("*").eq("id", fromId).single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    return {
      motos: must(motos) as MotorcycleWithModel[],
      terrains: must(terrains) as TerrainType[],
      from: (from.data as SuspensionSetup | null) ?? null,
    };
  }, [fromId]);

  if (loading || !data) return (<><PageHeader title="Nouveau réglage" back="/suspensions" /><Spinner /></>);

  if (data.motos.length === 0) {
    return (
      <>
        <PageHeader title="Nouveau réglage" back="/suspensions" />
        <Card>Ajoutez d'abord une moto dans le garage.</Card>
      </>
    );
  }

  const initial: Partial<SuspensionSetup> = data.from
    ? { ...data.from, name: `${data.from.name} (copie)` }
    : { motorcycle_id: presetMoto ?? undefined };

  async function save(payload: SetupPayload) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase
      .from("suspension_setups")
      .insert({ ...payload, user_id: userData.user!.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    router.push(`/suspensions/${inserted.id}`);
    router.refresh();
  }

  return (
    <>
      <PageHeader title={data.from ? "Dupliquer le réglage" : "Nouveau réglage"} back="/suspensions" />
      <SetupForm motos={data.motos} terrains={data.terrains} initial={initial} submitLabel="Enregistrer le réglage" onSave={save} />
    </>
  );
}
