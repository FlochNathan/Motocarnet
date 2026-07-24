"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, ButtonLink, Card, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, StatusPill, Textarea } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatHours, todayISO } from "@/lib/format";
import { buildMaintenanceOverview, urgentItems, type MaintenanceItem } from "@/lib/overview";
import { computeReminderStatus, DUE_STATUS_LABELS } from "@/lib/maintenance";
import type { CustomReminder, MaintenanceRecord, MaintenanceSchedule, MaintenanceType, MotorcycleWithModel } from "@/lib/types";

interface EntretiensData {
  motos: MotorcycleWithModel[];
  types: MaintenanceType[];
  schedules: MaintenanceSchedule[];
  records: MaintenanceRecord[];
  reminders: CustomReminder[];
}

/** Récapitulatif des entretiens urgents pour toutes les motos actives + rappels libres */
export default function EntretiensPage() {
  const { data, loading, reload } = useSupabaseQuery<EntretiensData>(async (sb) => {
    const [motos, types, schedules, records, reminders] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).neq("status", "sold"),
      sb.from("maintenance_types").select("*"),
      sb.from("maintenance_schedules").select("*"),
      sb.from("maintenance_records").select("*").order("record_date", { ascending: false }),
      sb.from("custom_reminders").select("*").eq("done", false).order("created_at"),
    ]);
    return { motos: must(motos), types: must(types), schedules: must(schedules), records: must(records), reminders: must(reminders) };
  });

  if (loading || !data) return (<><PageHeader title="Entretiens" /><Spinner /></>);

  if (data.motos.length === 0) {
    return (
      <>
        <PageHeader title="Entretiens" />
        <EmptyState
          icon="🔧"
          title="Aucune moto à entretenir"
          text="Ajoutez une moto dans le garage pour suivre ses entretiens."
          action={<ButtonLink href="/garage/nouvelle">Ajouter une moto</ButtonLink>}
        />
      </>
    );
  }

  const today = todayISO();
  const perMoto = data.motos.map((moto) => {
    const items = buildMaintenanceOverview(moto, moto.motorcycle_models.stroke, data.types, data.schedules, data.records, today);
    return { moto, urgent: urgentItems(items) };
  });
  const totalUrgent = perMoto.reduce((n, x) => n + x.urgent.length, 0);
  const lastRecords = data.records.slice(0, 5);
  const typeName = (id: number) => data.types.find((t) => t.id === id)?.name ?? "";
  const motoName = (id: string) => {
    const m = data.motos.find((x) => x.id === id);
    return m ? motoLabel(m) : "";
  };

  return (
    <>
      <PageHeader title="Entretiens" />
      <div className="mb-4">
        <ButtonLink href="/entretiens/nouveau">＋ Enregistrer un entretien</ButtonLink>
      </div>

      <h2 className="mb-2 text-lg font-bold">À prévoir {totalUrgent > 0 && <span className="text-danger">({totalUrgent})</span>}</h2>
      {totalUrgent === 0 ? (
        <Card className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>✅</span>
          <p className="text-sm font-semibold text-ink-dim">Tous les entretiens surveillés sont à jour sur toutes vos motos.</p>
        </Card>
      ) : (
        perMoto.map(({ moto, urgent }) =>
          urgent.length === 0 ? null : (
            <div key={moto.id} className="mb-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-dim">
                {motoLabel(moto)} — {formatHours(moto.current_hours)}
              </h3>
              <Card className="divide-y divide-border p-0">
                {urgent.map((item: MaintenanceItem) => (
                  <Link
                    key={item.type.id}
                    href={`/entretiens/nouveau?moto=${moto.id}&type=${item.type.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.type.name}</p>
                      <p className="text-xs text-ink-dim">
                        {item.lastRecord ? `dernier : ${formatDate(item.lastRecord.record_date)}` : "jamais enregistré"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill status={item.due.status} label={DUE_STATUS_LABELS[item.due.status]} />
                      {item.due.hoursRemaining !== null && (
                        <p className="mt-0.5 text-xs text-ink-dim">
                          {item.due.hoursRemaining >= 0
                            ? `reste ${formatHours(item.due.hoursRemaining)}`
                            : `dépassé de ${formatHours(-item.due.hoursRemaining)}`}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </Card>
            </div>
          ),
        )
      )}

      <RemindersSection motos={data.motos} reminders={data.reminders} reload={reload} today={today} />

      {lastRecords.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Derniers entretiens</h2>
          <Card className="divide-y divide-border p-0">
            {lastRecords.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold">{typeName(r.maintenance_type_id)}</p>
                  <p className="shrink-0 text-xs text-ink-dim">{formatDate(r.record_date)}</p>
                </div>
                <p className="text-xs text-ink-dim">{motoName(r.motorcycle_id)} • à {formatHours(r.hours_at)}</p>
              </div>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Mes rappels : échéances libres créées par le pilote
// ------------------------------------------------------------
function RemindersSection({
  motos,
  reminders,
  reload,
  today,
}: {
  motos: MotorcycleWithModel[];
  reminders: CustomReminder[];
  reload: () => void;
  today: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [motoId, setMotoId] = useState(motos[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [dueH, setDueH] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentHours = (id: string) => motos.find((m) => m.id === id)?.current_hours ?? 0;
  const motoName = (id: string) => {
    const m = motos.find((x) => x.id === id);
    return m ? motoLabel(m) : "";
  };

  async function addReminder() {
    setError("");
    if (!title.trim()) {
      setError("Donnez un titre au rappel (ex : « Contrôle technique »).");
      return;
    }
    if (dueDate.trim() === "" && dueH.trim() === "") {
      setError("Indiquez au moins une échéance : une date ou un nombre d'heures moteur.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("custom_reminders").insert({
      user_id: userData.user!.id,
      motorcycle_id: motoId,
      title: title.trim(),
      due_date: dueDate || null,
      due_hours: dueH.trim() === "" ? null : Number(dueH.replace(",", ".")),
      note: note || null,
    });
    setBusy(false);
    if (insertError) {
      setError("Enregistrement impossible. Réessayez.");
      return;
    }
    setTitle("");
    setDueDate("");
    setDueH("");
    setNote("");
    setShowForm(false);
    reload();
  }

  async function markDone(r: CustomReminder) {
    const supabase = createClient();
    await supabase.from("custom_reminders").update({ done: true, done_at: new Date().toISOString() }).eq("id", r.id);
    reload();
  }

  async function remove(r: CustomReminder) {
    const supabase = createClient();
    await supabase.from("custom_reminders").delete().eq("id", r.id);
    reload();
  }

  // Les plus urgents en premier
  const rank = { overdue: 0, soon: 1, ok: 2, none: 3 } as const;
  const sorted = [...reminders].sort(
    (a, b) =>
      rank[computeReminderStatus(a, currentHours(a.motorcycle_id), today)] -
      rank[computeReminderStatus(b, currentHours(b.motorcycle_id), today)],
  );

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Mes rappels</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="min-h-11 px-2 text-sm font-semibold text-accent-strong">
            ＋ Ajouter un rappel
          </button>
        )}
      </div>

      {showForm && (
        <Card className="mb-3 flex flex-col gap-3">
          <Field label="Titre du rappel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Contrôle technique, renouveler licence…" />
          </Field>
          <Field label="Moto concernée">
            <Select value={motoId} onChange={(e) => setMotoId(e.target.value)}>
              {motos.map((m) => <option key={m.id} value={m.id}>{motoLabel(m)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Échéance (date)">
              <Input type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Ou heures moteur" hint={`Compteur actuel : ${formatHours(currentHours(motoId))}`}>
              <Input type="number" min={0} step="0.5" inputMode="decimal" value={dueH} onChange={(e) => setDueH(e.target.value)} placeholder="—" />
            </Field>
          </div>
          <Field label="Note (facultatif)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button size="md" onClick={addReminder} disabled={busy}>{busy ? "Enregistrement…" : "Créer le rappel"}</Button>
          <Button size="md" variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
        </Card>
      )}

      {sorted.length === 0 && !showForm ? (
        <Card className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🔔</span>
          <p className="text-sm text-ink-dim">
            Aucun rappel. Créez vos propres échéances : contrôle technique, licence, achat d'un pneu…
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((r) => {
            const status = computeReminderStatus(r, currentHours(r.motorcycle_id), today);
            return (
              <Card key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">🔔 {r.title}</p>
                    <p className="text-xs text-ink-dim">
                      {motoName(r.motorcycle_id)}
                      {r.due_date && ` • ${formatDate(r.due_date)}`}
                      {r.due_hours !== null && ` • à ${formatHours(r.due_hours)}`}
                    </p>
                    {r.note && <p className="mt-0.5 text-xs text-ink-dim/80">{r.note}</p>}
                  </div>
                  <StatusPill status={status} label={DUE_STATUS_LABELS[status]} />
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => markDone(r)} className="flex-1">Fait ✓</Button>
                  <ConfirmButton
                    label="Supprimer"
                    size="sm"
                    confirmTitle="Supprimer ce rappel ?"
                    confirmText={`« ${r.title} » sera définitivement supprimé.`}
                    onConfirm={() => remove(r)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
