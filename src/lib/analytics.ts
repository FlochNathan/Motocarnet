// ============================================================
// Analyses avancées : fonctions pures alimentant le tableau
// de bord Statistiques.
// ============================================================

import type { Expense, MaintenanceRecord, MaintenanceType, RidingSession, SuspensionFeedback, SuspensionSetup } from "./types";

/** Évolution cumulée des heures roulées (points triés par date) */
export function cumulativeHours(
  sessions: RidingSession[],
  startHours = 0,
): { date: string; hours: number }[] {
  const sorted = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
  let total = startHours;
  const points: { date: string; hours: number }[] = [];
  for (const s of sorted) {
    total += s.duration_minutes / 60;
    const last = points[points.length - 1];
    if (last && last.date === s.session_date) last.hours = total;
    else points.push({ date: s.session_date, hours: total });
  }
  return points;
}

/** Calendrier d'activité : minutes roulées par jour sur `weeks` semaines
 *  (se termine dimanche de la semaine courante ; grille lundi → dimanche) */
export function activityCalendar(
  sessions: RidingSession[],
  weeks: number,
  today: Date,
): { date: string; minutes: number }[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    byDate.set(s.session_date, (byDate.get(s.session_date) ?? 0) + s.duration_minutes);
  }
  // Fin de grille : dimanche de la semaine courante
  const end = new Date(today);
  const dow = (end.getDay() + 6) % 7; // 0 = lundi
  end.setDate(end.getDate() + (6 - dow));

  const days: { date: string; minutes: number }[] = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: iso, minutes: byDate.get(iso) ?? 0 });
  }
  return days;
}

/** Heures par condition de terrain (sec, humide…), trié décroissant */
export function hoursByCondition(sessions: RidingSession[]): { condition: string | null; hours: number }[] {
  const map = new Map<string | null, number>();
  for (const s of sessions) {
    map.set(s.conditions, (map.get(s.conditions) ?? 0) + s.duration_minutes / 60);
  }
  return [...map.entries()].map(([condition, hours]) => ({ condition, hours })).sort((a, b) => b.hours - a.hours);
}

export interface PartWear {
  typeId: number;
  typeName: string;
  /** Durée de vie moyenne observée entre remplacements (h) */
  averageLife: number;
  /** Heures écoulées depuis le dernier remplacement */
  sinceLast: number;
  /** sinceLast / averageLife (peut dépasser 1) */
  ratio: number;
}

/**
 * Usure des pièces : pour chaque opération ayant ≥ 2 remplacements sur la moto,
 * compare les heures écoulées depuis le dernier à la durée de vie moyenne observée.
 */
export function partWear(
  records: MaintenanceRecord[],
  types: MaintenanceType[],
  motorcycleId: string,
  currentHours: number,
): PartWear[] {
  const byType = new Map<number, number[]>();
  for (const r of records) {
    if (r.motorcycle_id !== motorcycleId) continue;
    const list = byType.get(r.maintenance_type_id) ?? [];
    list.push(r.hours_at);
    byType.set(r.maintenance_type_id, list);
  }
  const result: PartWear[] = [];
  for (const [typeId, hours] of byType) {
    if (hours.length < 2) continue;
    hours.sort((a, b) => a - b);
    const gaps = hours.slice(1).map((h, i) => h - hours[i]);
    const averageLife = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (averageLife <= 0) continue;
    const sinceLast = Math.max(0, currentHours - hours[hours.length - 1]);
    const type = types.find((t) => t.id === typeId);
    result.push({
      typeId,
      typeName: type?.name ?? `#${typeId}`,
      averageLife,
      sinceLast,
      ratio: sinceLast / averageLife,
    });
  }
  return result.sort((a, b) => b.ratio - a.ratio);
}

/** Fréquence des symptômes remontés dans les ressentis, trié décroissant */
export function symptomCounts(feedbacks: SuspensionFeedback[]): { symptom: string; count: number }[] {
  const map = new Map<string, number>();
  for (const f of feedbacks) {
    for (const s of f.symptoms) map.set(s, (map.get(s) ?? 0) + 1);
  }
  return [...map.entries()].map(([symptom, count]) => ({ symptom, count })).sort((a, b) => b.count - a.count);
}

/** Note moyenne des réglages par terrain (id de terrain → moyenne), trié décroissant */
export function ratingByTerrain(setups: SuspensionSetup[]): { terrainId: number | null; average: number; count: number }[] {
  const map = new Map<number | null, { sum: number; count: number }>();
  for (const s of setups) {
    if (s.rating === null) continue;
    const entry = map.get(s.terrain_type_id) ?? { sum: 0, count: 0 };
    entry.sum += s.rating;
    entry.count += 1;
    map.set(s.terrain_type_id, entry);
  }
  return [...map.entries()]
    .map(([terrainId, { sum, count }]) => ({ terrainId, average: sum / count, count }))
    .sort((a, b) => b.average - a.average);
}

/** Coût par heure roulée, mois par mois d'une année (null quand 0 h roulée) */
export function costPerHourByMonth(
  expenses: Expense[],
  sessions: RidingSession[],
  year: number,
): { month: string; value: number | null }[] {
  const cost = new Array(12).fill(0);
  const minutes = new Array(12).fill(0);
  for (const e of expenses) {
    if (e.expense_date.startsWith(`${year}-`)) cost[Number(e.expense_date.slice(5, 7)) - 1] += e.amount;
  }
  for (const s of sessions) {
    if (s.session_date.startsWith(`${year}-`)) minutes[Number(s.session_date.slice(5, 7)) - 1] += s.duration_minutes;
  }
  return cost.map((c, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    value: minutes[i] > 0 ? c / (minutes[i] / 60) : null,
  }));
}
