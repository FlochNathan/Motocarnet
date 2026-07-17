"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT } from "@/lib/moto";
import SetupForm, { type SetupPayload } from "@/components/SetupForm";
import { PageHeader, Spinner } from "@/components/ui";
import type { MotorcycleWithModel, SuspensionSetup, TerrainType } from "@/lib/types";

export default function ModifierReglagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [setup, motos, terrains] = await Promise.all([
      sb.from("suspension_setups").select("*").eq("id", id).single(),
      sb.from("motorcycles").select(MOTO_SELECT).order("is_primary", { ascending: false }),
      sb.from("terrain_types").select("*").eq("active", true).order("sort"),
    ]);
    return {
      setup: must(setup) as SuspensionSetup,
      motos: must(motos) as MotorcycleWithModel[],
      terrains: must(terrains) as TerrainType[],
    };
  }, [id]);

  if (loading || !data) return (<><PageHeader title="Modifier le réglage" back="/suspensions" /><Spinner /></>);

  async function save(payload: SetupPayload) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    // Conserve l'ancienne version pour pouvoir y revenir
    const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...snapshot } = data!.setup;
    await supabase.from("suspension_setup_revisions").insert({
      setup_id: id,
      user_id: userData.user!.id,
      snapshot,
    });

    const { error } = await supabase.from("suspension_setups").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    router.push(`/suspensions/${id}`);
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Modifier le réglage" back={`/suspensions/${id}`} />
      <SetupForm motos={data.motos} terrains={data.terrains} initial={data.setup} submitLabel="Enregistrer les modifications" onSave={save} />
    </>
  );
}
