// ============================================================
// Vocabulaire métier : libellés français et listes de choix.
// Centralisé pour préparer une future traduction (en dupliquant ce
// fichier par langue et en le servant selon la locale).
// ============================================================

import type { Conditions, MaintenanceCategory, MotoStatus, RiderLevel } from "./types";

export const MOTO_STATUS_LABELS: Record<MotoStatus, string> = {
  active: "Active",
  sold: "Vendue",
  repair: "En réparation",
};

export const RIDER_LEVELS: { value: RiderLevel; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "loisir", label: "Loisir" },
  { value: "confirme", label: "Confirmé" },
  { value: "competition", label: "Compétition" },
];

export const CONDITIONS: { value: Conditions; label: string }[] = [
  { value: "sec", label: "Sec" },
  { value: "humide", label: "Humide" },
  { value: "boueux", label: "Boueux" },
  { value: "poussiereux", label: "Poussiéreux" },
  { value: "gele", label: "Gelé" },
  { value: "variable", label: "Variable" },
];

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  moteur: "Moteur",
  partie_cycle: "Partie-cycle",
  suspensions: "Suspensions",
};

export const TIRE_TYPES = ["Soft (sable/boue)", "Medium (mixte)", "Hard (terrain dur)", "Mousse"];

// Symptômes de ressenti — les clés correspondent à setup_recommendations.symptom_key
export const SYMPTOMS: { key: string; label: string }[] = [
  { key: "fork_too_hard", label: "Train avant trop dur" },
  { key: "fork_too_soft", label: "Train avant trop souple" },
  { key: "rear_too_hard", label: "Arrière trop dur" },
  { key: "rear_too_soft", label: "Arrière trop souple" },
  { key: "headshake", label: "La moto guidonne" },
  { key: "dives_braking", label: "Plonge au freinage" },
  { key: "lack_traction", label: "Manque de motricité" },
  { key: "rebounds", label: "La moto rebondit" },
  { key: "bottoms_out", label: "La moto talonne" },
  { key: "hard_to_turn", label: "Tourne difficilement" },
  { key: "unstable_high_speed", label: "Instable à haute vitesse" },
];

export const SYMPTOM_LABELS: Record<string, string> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.key, s.label]),
);

// Avertissement obligatoire affiché avec chaque recommandation
export const RECO_WARNING =
  "Modifiez un seul réglage à la fois, par petites étapes de 1 à 2 clics, puis testez la moto. " +
  "Vérifiez également les recommandations du constructeur ou consultez un professionnel des suspensions.";

// Catégories de dépenses — l'ordre ET les couleurs sont fixes : la palette a été
// validée pour le daltonisme dans cet ordre d'adjacence (donut, légendes).
export const EXPENSE_CATEGORIES = [
  { value: "entretien", label: "Entretien", icon: "🔧", color: "#d96230" },
  { value: "piece", label: "Pièces", icon: "⚙️", color: "#8b6fc4" },
  { value: "essence", label: "Essence", icon: "⛽", color: "#2f9e68" },
  { value: "transport", label: "Transport", icon: "🚐", color: "#3e86c0" },
  { value: "equipement", label: "Équipement", icon: "🧤", color: "#b08600" },
  { value: "inscription", label: "Inscriptions", icon: "🎟️", color: "#c75884" },
  { value: "autre", label: "Autre", icon: "📦", color: "#0aa3ab" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
