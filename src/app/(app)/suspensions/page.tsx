"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Spinner, Stars } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate } from "@/lib/format";
import type { MotorcycleWithModel, SuspensionSetup, TerrainType } from "@/lib/types";

export default function SuspensionsPage() {
  const { data, loading } = useSupabaseQuery(async (sb) => {
    const [setups, motos, terrains] = await Promise.all([
      sb.from("suspension_setups").select("*").order("is_favorite", { ascending: false }).order("updated_at", { ascending: false }),
      sb.from("motorcycles").select(MOTO_SELECT),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      setups: must(setups) as SuspensionSetup[],
      motos: must(motos) as MotorcycleWithModel[],
      terrains: must(terrains) as TerrainType[],
    };
  });

  if (loading || !data) return (<><PageHeader title="Suspensions" /><Spinner /></>);

  const motoName = (id: string) => {
    const m = data.motos.find((x) => x.id === id);
    return m ? motoLabel(m) : "";
  };
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name;

  return (
    <>
      <PageHeader title="Suspensions" />
      {data.setups.length === 0 ? (
        <EmptyState
          icon="🎚️"
          title="Aucun réglage enregistré"
          text="Enregistrez vos réglages de fourche et d'amortisseur pour chaque terrain, et retrouvez-les au bord de la piste."
          action={<ButtonLink href="/suspensions/nouveau">Créer un réglage</ButtonLink>}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <ButtonLink href="/suspensions/nouveau" size="md">＋ Nouveau</ButtonLink>
            <ButtonLink href="/suspensions/comparer" variant="secondary" size="md">⚖️ Comparer</ButtonLink>
          </div>
          <div className="flex flex-col gap-2">
            {data.setups.map((s) => (
              <Link key={s.id} href={`/suspensions/${s.id}`}>
                <Card className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-extrabold">
                      {s.is_favorite && <span aria-label="Favori">⭐ </span>}
                      {s.name}
                    </p>
                    <p className="shrink-0 text-xs text-ink-dim">{formatDate(s.updated_at.slice(0, 10))}</p>
                  </div>
                  <p className="truncate text-xs text-ink-dim">{motoName(s.motorcycle_id)}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {terrainName(s.terrain_type_id) && <Badge>{terrainName(s.terrain_type_id)}</Badge>}
                      {s.terrain_conditions && <Badge>{s.terrain_conditions}</Badge>}
                    </div>
                    {s.rating !== null && <Stars value={s.rating} />}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
