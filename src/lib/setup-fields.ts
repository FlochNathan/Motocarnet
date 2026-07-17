// ============================================================
// Champs numériques d'un réglage de suspensions, avec libellés
// et unités — partagés entre formulaire, fiche et comparaison.
// ============================================================

import type { SuspensionSetup } from "./types";

export interface SetupField {
  key: keyof SuspensionSetup;
  label: string;
  unit: string;
  step?: string;
}

export const FORK_FIELDS: SetupField[] = [
  { key: "fork_compression_clicks", label: "Compression", unit: "clics" },
  { key: "fork_rebound_clicks", label: "Détente", unit: "clics" },
  { key: "fork_preload_turns", label: "Précharge", unit: "tours", step: "0.5" },
  { key: "fork_height_mm", label: "Hauteur des tubes dans les tés", unit: "mm", step: "0.5" },
  { key: "fork_air_pressure_bar", label: "Pression d'air (fourche pneumatique)", unit: "bar", step: "0.05" },
];

export const SHOCK_FIELDS: SetupField[] = [
  { key: "shock_lsc_clicks", label: "Compression basse vitesse", unit: "clics" },
  { key: "shock_hsc_turns", label: "Compression haute vitesse", unit: "tours", step: "0.25" },
  { key: "shock_rebound_clicks", label: "Détente", unit: "clics" },
  { key: "shock_preload_mm", label: "Précharge", unit: "mm", step: "0.5" },
  { key: "shock_sag_static_mm", label: "SAG statique", unit: "mm" },
  { key: "shock_sag_rider_mm", label: "SAG avec pilote", unit: "mm" },
];

export const TIRE_FIELDS: SetupField[] = [
  { key: "tire_pressure_front_bar", label: "Pression pneu avant", unit: "bar", step: "0.05" },
  { key: "tire_pressure_rear_bar", label: "Pression pneu arrière", unit: "bar", step: "0.05" },
];

export const ALL_NUMERIC_FIELDS = [...TIRE_FIELDS, ...FORK_FIELDS, ...SHOCK_FIELDS];
