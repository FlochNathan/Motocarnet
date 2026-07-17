// ============================================================
// Fiches techniques : correspondance moto → fiche et application
// des intervalles suggérés aux échéances (opt-in, jamais automatique).
// ============================================================

import type { MaintenanceSchedule, MaintenanceType, ModelSpec, Motorcycle, SuggestedInterval } from "./types";

/** Avertissement affiché avec toute fiche technique */
export const SPEC_WARNING =
  "Valeurs indicatives fournies à titre de repère. Vérifiez toujours le manuel du constructeur " +
  "de votre millésime avant toute intervention — un couple de serrage ou une quantité d'huile " +
  "erronés peuvent endommager la moto.";

/** Trouve la fiche correspondant à une moto (modèle + année dans la plage) */
export function findSpecForMoto(specs: ModelSpec[], moto: Pick<Motorcycle, "model_id" | "year">): ModelSpec | null {
  return (
    specs.find((s) => s.model_id === moto.model_id && s.year_from <= moto.year && moto.year <= s.year_to) ?? null
  );
}

export interface SchedulePayload {
  motorcycle_id: string;
  maintenance_type_id: number;
  interval_hours: number | null;
  interval_months: number | null;
}

/**
 * Construit les échéances à créer depuis les intervalles suggérés d'une fiche.
 * Ne touche jamais aux échéances déjà définies par l'utilisateur : seules les
 * opérations sans échéance existante sont proposées.
 */
export function buildSuggestedSchedules(
  intervals: SuggestedInterval[],
  types: MaintenanceType[],
  existing: MaintenanceSchedule[],
  motorcycleId: string,
): SchedulePayload[] {
  const existingTypeIds = new Set(existing.map((s) => s.maintenance_type_id));
  const result: SchedulePayload[] = [];
  for (const interval of intervals) {
    if (interval.hours == null && interval.months == null) continue;
    const type = types.find((t) => t.name === interval.type_name && t.active);
    if (!type || existingTypeIds.has(type.id)) continue;
    result.push({
      motorcycle_id: motorcycleId,
      maintenance_type_id: type.id,
      interval_hours: interval.hours,
      interval_months: interval.months,
    });
  }
  return result;
}
