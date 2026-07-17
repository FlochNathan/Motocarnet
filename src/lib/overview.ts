// ============================================================
// Aperçu du carnet d'entretien d'une moto : croise les types
// d'entretien, les échéances définies et l'historique pour produire
// la liste affichable avec statut vert / orange / rouge.
// ============================================================

import { computeDue, type DueResult } from "./maintenance";
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceType,
  Motorcycle,
  Stroke,
} from "./types";

export interface MaintenanceItem {
  type: MaintenanceType;
  schedule: MaintenanceSchedule | null;
  lastRecord: MaintenanceRecord | null;
  due: DueResult;
  /** false : l'utilisateur a coupé l'alerte — ne remonte pas dans les urgences */
  alertEnabled: boolean;
}

export function buildMaintenanceOverview(
  moto: Motorcycle,
  stroke: Stroke,
  types: MaintenanceType[],
  schedules: MaintenanceSchedule[],
  records: MaintenanceRecord[],
  today: string,
): MaintenanceItem[] {
  const scheduleByType = new Map(
    schedules.filter((s) => s.motorcycle_id === moto.id).map((s) => [s.maintenance_type_id, s]),
  );

  // Dernière réalisation par type (date la plus récente, puis heures)
  const lastByType = new Map<number, MaintenanceRecord>();
  for (const r of records) {
    if (r.motorcycle_id !== moto.id) continue;
    const prev = lastByType.get(r.maintenance_type_id);
    if (!prev || r.record_date > prev.record_date || (r.record_date === prev.record_date && r.hours_at > prev.hours_at)) {
      lastByType.set(r.maintenance_type_id, r);
    }
  }

  return types
    .filter((t) => t.active && (t.applies_to_stroke === null || t.applies_to_stroke === stroke))
    .sort((a, b) => a.category.localeCompare(b.category) || a.sort - b.sort)
    .map((type) => {
      const schedule = scheduleByType.get(type.id) ?? null;
      const last = lastByType.get(type.id) ?? null;
      const due = computeDue({
        currentHours: moto.current_hours,
        today,
        intervalHours: schedule?.interval_hours ?? null,
        intervalMonths: schedule?.interval_months ?? null,
        lastHours: last?.hours_at ?? null,
        lastDate: last?.record_date ?? null,
        baselineHours: moto.purchase_hours,
        baselineDate: moto.purchase_date,
        alertBeforeHours: schedule?.alert_before_hours ?? null,
        alertBeforeMonths: schedule?.alert_before_months ?? null,
      });
      return { type, schedule, lastRecord: last, due, alertEnabled: schedule?.alert_enabled ?? true };
    });
}

/** Entretiens à surveiller (orange) ou dépassés (rouge), les pires d'abord.
 *  Les opérations dont l'alerte est coupée sont exclues. */
export function urgentItems(items: MaintenanceItem[]): MaintenanceItem[] {
  const rank = { overdue: 0, soon: 1, ok: 2, none: 3 } as const;
  return items
    .filter((i) => i.alertEnabled && (i.due.status === "overdue" || i.due.status === "soon"))
    .sort(
      (a, b) =>
        rank[a.due.status] - rank[b.due.status] ||
        (a.due.hoursRemaining ?? Infinity) - (b.due.hoursRemaining ?? Infinity),
    );
}
