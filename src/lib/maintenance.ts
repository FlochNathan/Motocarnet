// ============================================================
// Calcul des échéances d'entretien
// Une opération est due « toutes les X heures » et/ou « tous les X mois » :
// la première échéance atteinte fait foi.
// ============================================================

import { monthsBetween } from "./format";

export type DueStatus = "ok" | "soon" | "overdue" | "none";

export interface DueInput {
  /** Heures actuelles de la moto */
  currentHours: number;
  /** Date du jour (ISO) */
  today: string;
  /** Fréquence en heures (null si non définie) */
  intervalHours: number | null;
  /** Fréquence en mois (null si non définie) */
  intervalMonths: number | null;
  /** Dernière réalisation : heures moteur (null si jamais faite) */
  lastHours: number | null;
  /** Dernière réalisation : date ISO (null si jamais faite) */
  lastDate: string | null;
  /** Point de départ si jamais faite (heures à l'achat) */
  baselineHours?: number;
  /** Point de départ si jamais faite (date d'achat) */
  baselineDate?: string | null;
  /** Seuil personnalisé : « bientôt » quand il reste moins de X heures (null = 20 %) */
  alertBeforeHours?: number | null;
  /** Seuil personnalisé : « bientôt » quand il reste moins de X mois (null = 20 %) */
  alertBeforeMonths?: number | null;
}

export interface DueResult {
  status: DueStatus;
  /** Heures écoulées depuis le dernier entretien */
  hoursSince: number | null;
  /** Heures restantes avant échéance (négatif = dépassé) */
  hoursRemaining: number | null;
  /** Échéance en heures moteur totales */
  nextDueHours: number | null;
  /** Mois restants avant échéance (négatif = dépassé) */
  monthsRemaining: number | null;
  /** L'entretien n'a jamais été enregistré */
  neverDone: boolean;
}

/** Fraction de l'intervalle restant sous laquelle on passe en « bientôt » */
const SOON_THRESHOLD = 0.2;

export function computeDue(input: DueInput): DueResult {
  const {
    currentHours, today, intervalHours, intervalMonths,
    lastHours, lastDate, baselineHours = 0, baselineDate = null,
    alertBeforeHours = null, alertBeforeMonths = null,
  } = input;

  const neverDone = lastHours === null && lastDate === null;
  const refHours = lastHours ?? baselineHours;
  const refDate = lastDate ?? baselineDate;

  const hoursSince = Math.max(0, currentHours - refHours);

  let hoursRemaining: number | null = null;
  let nextDueHours: number | null = null;
  let hoursRatio: number | null = null;
  if (intervalHours !== null && intervalHours > 0) {
    nextDueHours = refHours + intervalHours;
    hoursRemaining = nextDueHours - currentHours;
    hoursRatio = hoursRemaining / intervalHours;
  }

  let monthsRemaining: number | null = null;
  let monthsRatio: number | null = null;
  if (intervalMonths !== null && intervalMonths > 0 && refDate) {
    const elapsed = monthsBetween(refDate, today);
    monthsRemaining = intervalMonths - elapsed;
    monthsRatio = monthsRemaining / intervalMonths;
  }

  if (hoursRemaining === null && monthsRemaining === null) {
    return { status: "none", hoursSince: neverDone ? null : hoursSince, hoursRemaining, nextDueHours, monthsRemaining, neverDone };
  }

  // La première échéance atteinte fait foi : on prend le ratio le plus bas
  const ratios = [hoursRatio, monthsRatio].filter((r): r is number => r !== null);
  const worst = Math.min(...ratios);

  // « Bientôt » : seuil personnalisé par dimension, sinon règle des 20 %
  const soonByHours =
    hoursRemaining !== null &&
    (alertBeforeHours !== null ? hoursRemaining <= alertBeforeHours : (hoursRatio as number) <= SOON_THRESHOLD);
  const soonByMonths =
    monthsRemaining !== null &&
    (alertBeforeMonths !== null ? monthsRemaining <= alertBeforeMonths : (monthsRatio as number) <= SOON_THRESHOLD);

  const status: DueStatus = worst <= 0 ? "overdue" : soonByHours || soonByMonths ? "soon" : "ok";

  return { status, hoursSince, hoursRemaining, nextDueHours, monthsRemaining, neverDone };
}

// ------------------------------------------------------------
// Rappels libres (contrôle technique, licence, achat pneu…)
// ------------------------------------------------------------

/** Marge sous laquelle un rappel passe en « bientôt » */
const REMINDER_SOON_DAYS = 14;
const REMINDER_SOON_HOURS = 2;

export interface ReminderTarget {
  due_date: string | null;
  due_hours: number | null;
}

export function computeReminderStatus(
  reminder: ReminderTarget,
  currentHours: number,
  today: string,
): DueStatus {
  if (reminder.due_date === null && reminder.due_hours === null) return "none";

  const dateReached = reminder.due_date !== null && today >= reminder.due_date;
  const hoursReached = reminder.due_hours !== null && currentHours >= reminder.due_hours;
  if (dateReached || hoursReached) return "overdue";

  const dateSoon =
    reminder.due_date !== null &&
    (new Date(reminder.due_date).getTime() - new Date(today).getTime()) / 86400000 <= REMINDER_SOON_DAYS;
  const hoursSoon = reminder.due_hours !== null && reminder.due_hours - currentHours <= REMINDER_SOON_HOURS;
  return dateSoon || hoursSoon ? "soon" : "ok";
}

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  ok: "À jour",
  soon: "Bientôt",
  overdue: "Dépassé",
  none: "Sans échéance",
};
