"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel, motoSpec } from "@/lib/moto";
import { usePhotoUrl } from "@/lib/photos";
import { formatDate, formatHours, todayISO, toCSV, downloadFile } from "@/lib/format";
import { buildMaintenanceOverview, type MaintenanceItem } from "@/lib/overview";
import { DUE_STATUS_LABELS } from "@/lib/maintenance";
import { MAINTENANCE_CATEGORY_LABELS, MOTO_STATUS_LABELS } from "@/lib/domain";
import { Badge, ButtonLink, Card, ConfirmButton, PageHeader, Spinner, StatusPill } from "@/components/ui";
import type {
  MaintenanceRecord, MaintenanceSchedule, MaintenanceType,
  MotorcycleWithModel, RidingSession, MaintenanceCategory,
} from "@/lib/types";

interface MotoData {
  moto: MotorcycleWithModel;
  types: MaintenanceType[];
  schedules: MaintenanceSchedule[];
  records: MaintenanceRecord[];
  sessions: RidingSession[];
}

export default function FicheMotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading, error } = useSupabaseQuery<MotoData>(async (sb) => {
    const [moto, types, schedules, records, sessions] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).eq("id", id).single(),
      sb.from("maintenance_types").select("*"),
      sb.from("maintenance_schedules").select("*").eq("motorcycle_id", id),
      sb.from("maintenance_records").select("*").eq("motorcycle_id", id),
      sb.from("riding_sessions").select("*").eq("motorcycle_id", id).order("session_date", { ascending: false }),
    ]);
    return { moto: must(moto), types: must(types), schedules: must(schedules), records: must(records), sessions: must(sessions) };
  }, [id]);

  const photo = usePhotoUrl(data?.moto.photo_url);

  if (loading) return (<><PageHeader title="Moto" back="/garage" /><Spinner /></>);
  if (error || !data) {
    return (<><PageHeader title="Moto" back="/garage" /><Card>Moto introuvable.</Card></>);
  }

  const { moto } = data;
  const items = buildMaintenanceOverview(moto, moto.motorcycle_models.stroke, data.types, data.schedules, data.records, todayISO());
  const byCategory = new Map<MaintenanceCategory, MaintenanceItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.type.category) ?? [];
    list.push(item);
    byCategory.set(item.type.category, list);
  }
  const typeName = (typeId: number) => data.types.find((t) => t.id === typeId)?.name ?? "";

  function exportCSV() {
    const sessionRows = data!.sessions.map((s) => [
      "Session", s.session_date, formatHours(s.duration_minutes / 60), "", s.track_name, s.comment,
    ]);
    const recordRows = data!.records.map((r) => [
      "Entretien", r.record_date, formatHours(r.hours_at), typeName(r.maintenance_type_id), r.workshop, r.comment,
    ]);
    const csv = toCSV(
      ["Type", "Date", "Heures", "Opération", "Lieu/Atelier", "Commentaire"],
      [...sessionRows, ...recordRows].sort((a, b) => String(b[1]).localeCompare(String(a[1]))),
    );
    downloadFile(`motocarnet-${motoLabel(moto).replace(/\s+/g, "-").toLowerCase()}.csv`, csv);
  }

  async function deleteMoto() {
    const supabase = createClient();
    const { error } = await supabase.from("motorcycles").delete().eq("id", moto.id);
    if (!error) {
      router.push("/garage");
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader
        title={motoLabel(moto)}
        back="/garage"
        action={
          <Link href={`/garage/${moto.id}/modifier`} className="flex min-h-11 items-center rounded-xl px-3 font-semibold text-accent">
            Modifier
          </Link>
        }
      />

      {/* Photo + compteur */}
      <Card className="overflow-hidden p-0">
        <div className="h-44 w-full bg-surface-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={motoLabel(moto)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl" aria-hidden>🏍️</div>
          )}
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-3xl font-black text-accent">{formatHours(moto.current_hours)}</p>
            <p className="text-xs text-ink-dim">compteur total</p>
          </div>
          <div className="text-right text-sm">
            <Badge className={moto.status === "active" ? "bg-ok/15 text-ok" : moto.status === "repair" ? "bg-warn/15 text-warn" : ""}>
              {MOTO_STATUS_LABELS[moto.status]}
            </Badge>
            {moto.is_primary && <Badge className="ml-1">Principale</Badge>}
            <p className="mt-1 text-ink-dim">{motoSpec(moto)}</p>
          </div>
        </div>
      </Card>

      {/* Actions rapides */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ButtonLink href={`/sessions/nouvelle?moto=${moto.id}`} size="md">＋ Session</ButtonLink>
        <ButtonLink href={`/entretiens/nouveau?moto=${moto.id}`} variant="secondary" size="md">🔧 Entretien</ButtonLink>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <ButtonLink href={`/garage/${moto.id}/historique`} variant="secondary" size="sm">Historique</ButtonLink>
        <ButtonLink href={`/garage/${moto.id}/echeances`} variant="secondary" size="sm">Échéances</ButtonLink>
        <button onClick={exportCSV} className="min-h-11 rounded-2xl border border-border bg-surface-2 px-4 text-sm font-semibold">
          Export CSV
        </button>
      </div>

      {/* Informations */}
      <Card className="mt-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">Informations</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-ink-dim">Achat</dt>
          <dd className="text-right font-semibold">{formatDate(moto.purchase_date)}</dd>
          <dt className="text-ink-dim">Heures à l'achat</dt>
          <dd className="text-right font-semibold">{formatHours(moto.purchase_hours)}</dd>
          <dt className="text-ink-dim">N° de série</dt>
          <dd className="text-right font-semibold">{moto.serial_number || "—"}</dd>
          <dt className="text-ink-dim">Sessions</dt>
          <dd className="text-right font-semibold">{data.sessions.length}</dd>
        </dl>
        {moto.notes && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-dim">{moto.notes}</p>}
      </Card>

      {/* Carnet d'entretien */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Carnet d'entretien</h2>
        {(["moteur", "partie_cycle", "suspensions"] as MaintenanceCategory[]).map((cat) => {
          const list = byCategory.get(cat) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
                {MAINTENANCE_CATEGORY_LABELS[cat]}
              </h3>
              <Card className="divide-y divide-border p-0">
                {list.map((item) => (
                  <Link
                    key={item.type.id}
                    href={`/entretiens/nouveau?moto=${moto.id}&type=${item.type.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.type.name}</p>
                      <p className="text-xs text-ink-dim">
                        {item.lastRecord
                          ? `Fait le ${formatDate(item.lastRecord.record_date)} à ${formatHours(item.lastRecord.hours_at)}`
                          : "Jamais enregistré"}
                        {item.due.hoursSince !== null && item.lastRecord && ` • il y a ${formatHours(item.due.hoursSince)}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {!item.alertEnabled && (
                        <span className="mr-1 text-sm opacity-50" title="Alerte coupée" aria-label="Alerte coupée">🔕</span>
                      )}
                      <StatusPill status={item.due.status} label={DUE_STATUS_LABELS[item.due.status]} />
                      {item.due.hoursRemaining !== null && item.due.status !== "none" && (
                        <p className="mt-0.5 text-xs text-ink-dim">
                          {item.due.hoursRemaining >= 0
                            ? `reste ${formatHours(item.due.hoursRemaining)}`
                            : `+${formatHours(-item.due.hoursRemaining)}`}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </Card>
            </div>
          );
        })}
      </section>

      <div className="mt-6">
        <ConfirmButton
          label="Supprimer cette moto"
          confirmTitle="Supprimer la moto ?"
          confirmText="Toutes ses sessions, entretiens et réglages seront définitivement supprimés."
          onConfirm={deleteMoto}
        />
      </div>
    </>
  );
}
