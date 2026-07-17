// ============================================================
// Calculs statistiques (purs, testables)
// ============================================================

import type { Expense, MaintenanceRecord, RidingSession } from "./types";

/** Heures roulées par mois (YYYY-MM), sur les `months` derniers mois */
export function hoursPerMonth(sessions: RidingSession[], months: number, today: Date): { month: string; hours: number }[] {
  const result: { month: string; hours: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, hours: 0 });
  }
  const byKey = new Map(result.map((r) => [r.month, r]));
  for (const s of sessions) {
    const key = s.session_date.slice(0, 7);
    const row = byKey.get(key);
    if (row) row.hours += s.duration_minutes / 60;
  }
  return result;
}

/** Heures par type de terrain (id → heures), trié décroissant */
export function hoursPerTerrain(sessions: RidingSession[]): { terrainId: number | null; hours: number }[] {
  const map = new Map<number | null, number>();
  for (const s of sessions) {
    map.set(s.terrain_type_id, (map.get(s.terrain_type_id) ?? 0) + s.duration_minutes / 60);
  }
  return [...map.entries()].map(([terrainId, hours]) => ({ terrainId, hours })).sort((a, b) => b.hours - a.hours);
}

export function totalCost(records: MaintenanceRecord[], expenses: Expense[]): number {
  // Les coûts d'entretien sont dupliqués dans expenses (liés par maintenance_record_id) :
  // on prend expenses comme source, plus les records à coût non reportés.
  const linked = new Set(expenses.map((e) => e.maintenance_record_id).filter(Boolean));
  const fromExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fromRecords = records.filter((r) => r.cost !== null && !linked.has(r.id)).reduce((s, r) => s + (r.cost ?? 0), 0);
  return fromExpenses + fromRecords;
}

/**
 * Durée de vie moyenne d'une pièce : écart moyen en heures moteur entre
 * remplacements successifs du même type d'entretien sur une même moto.
 */
export function averageLifeHours(records: MaintenanceRecord[], maintenanceTypeId: number): number | null {
  const byMoto = new Map<string, number[]>();
  for (const r of records) {
    if (r.maintenance_type_id !== maintenanceTypeId) continue;
    const list = byMoto.get(r.motorcycle_id) ?? [];
    list.push(r.hours_at);
    byMoto.set(r.motorcycle_id, list);
  }
  const gaps: number[] = [];
  for (const hours of byMoto.values()) {
    hours.sort((a, b) => a - b);
    for (let i = 1; i < hours.length; i++) gaps.push(hours[i] - hours[i - 1]);
  }
  if (gaps.length === 0) return null;
  return gaps.reduce((s, g) => s + g, 0) / gaps.length;
}

/** Somme de valeurs datées par mois civil d'une année (12 lignes, janv. → déc.) */
export function sumPerMonthOfYear(
  entries: { date: string; value: number }[],
  year: number,
): { month: string; total: number }[] {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    total: 0,
  }));
  for (const e of entries) {
    if (!e.date.startsWith(`${year}-`)) continue;
    const m = Number(e.date.slice(5, 7));
    if (m >= 1 && m <= 12) rows[m - 1].total += e.value;
  }
  return rows;
}

/** Total des dépenses par catégorie, dans l'ordre fixe fourni (pour le donut) */
export function expensesPerCategory(
  expenses: Expense[],
  categoryOrder: readonly string[],
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return categoryOrder
    .map((category) => ({ category, total: map.get(category) ?? 0 }))
    .filter((r) => r.total > 0);
}

/** Nombre d'entretiens par type, trié décroissant */
export function maintenanceFrequency(records: MaintenanceRecord[]): { typeId: number; count: number }[] {
  const map = new Map<number, number>();
  for (const r of records) map.set(r.maintenance_type_id, (map.get(r.maintenance_type_id) ?? 0) + 1);
  return [...map.entries()].map(([typeId, count]) => ({ typeId, count })).sort((a, b) => b.count - a.count);
}
