// ============================================================
// Moteur de recommandations de suspension.
// Les conseils sont stockés en base (administrables) ; ce module
// sélectionne ceux qui correspondent aux symptômes cochés et au terrain.
// Les recommandations sont indicatives et ne garantissent jamais
// la sécurité ni le résultat : l'avertissement RECO_WARNING doit
// toujours être affiché avec elles (voir domain.ts).
// ============================================================

import type { SetupRecommendation } from "./types";

export interface Advice {
  key: string;
  title: string;
  advice: string;
}

/** Clés de recommandation « terrain » déclenchées par le nom du terrain */
function terrainKeys(terrainName: string | null | undefined): string[] {
  if (!terrainName) return [];
  const n = terrainName.toLowerCase();
  const keys: string[] = [];
  if (n.includes("sable")) keys.push("terrain_sand");
  if (n.includes("dure") || n.includes("cailloux") || n.includes("sec")) keys.push("terrain_hard");
  return keys;
}

/**
 * Retourne les conseils correspondant aux symptômes sélectionnés,
 * complétés par les conseils liés au terrain.
 */
export function getAdvice(
  symptoms: string[],
  recommendations: SetupRecommendation[],
  terrainName?: string | null,
): Advice[] {
  const wanted = new Set([...symptoms, ...terrainKeys(terrainName)]);
  const byKey = new Map(recommendations.filter((r) => r.active).map((r) => [r.symptom_key, r]));
  const result: Advice[] = [];
  for (const key of wanted) {
    const r = byKey.get(key);
    if (r) result.push({ key: r.symptom_key, title: r.title, advice: r.advice });
  }
  return result;
}
