"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel, motoSpec } from "@/lib/moto";
import { usePhotoUrl } from "@/lib/photos";
import { formatHours } from "@/lib/format";
import { MOTO_STATUS_LABELS } from "@/lib/domain";
import type { MotorcycleWithModel } from "@/lib/types";

export default function GaragePage() {
  const { data: motos, loading } = useSupabaseQuery<MotorcycleWithModel[]>(
    async (sb) =>
      must(await sb.from("motorcycles").select(MOTO_SELECT).order("is_primary", { ascending: false }).order("created_at")),
  );

  return (
    <>
      <PageHeader title="Garage" />
      {loading || !motos ? (
        <Spinner />
      ) : motos.length === 0 ? (
        <EmptyState
          icon="🏍️"
          title="Le garage est vide"
          text="Ajoutez votre première moto pour commencer à suivre ses heures et ses entretiens."
          action={<ButtonLink href="/garage/nouvelle">Ajouter une moto</ButtonLink>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {motos.map((m) => (
              <MotoCard key={m.id} moto={m} />
            ))}
          </div>
          <div className="mt-4">
            <ButtonLink href="/garage/nouvelle">＋ Ajouter une moto</ButtonLink>
          </div>
        </>
      )}
    </>
  );
}

function MotoCard({ moto }: { moto: MotorcycleWithModel }) {
  const photo = usePhotoUrl(moto.photo_url);
  const statusCls =
    moto.status === "active" ? "bg-ok/15 text-ok" : moto.status === "repair" ? "bg-warn/15 text-warn" : "bg-surface-2 text-ink-dim";

  return (
    <Link href={`/garage/${moto.id}`}>
      <Card className="flex items-center gap-4 p-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>🏍️</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{motoLabel(moto)}</p>
          <p className="text-xs text-ink-dim">{motoSpec(moto)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-lg font-black text-accent-strong">{formatHours(moto.current_hours)}</span>
            <Badge className={statusCls}>{MOTO_STATUS_LABELS[moto.status]}</Badge>
            {moto.is_primary && <Badge>Principale</Badge>}
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-ink-dim"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Card>
    </Link>
  );
}
