import { describe, expect, it } from "vitest";
import { getAdvice } from "./reco";
import type { SetupRecommendation } from "./types";

const recos: SetupRecommendation[] = [
  { id: 1, symptom_key: "bottoms_out", title: "Talonne", advice: "Fermez la compression.", active: true },
  { id: 2, symptom_key: "rebounds", title: "Rebondit", advice: "Ouvrez la détente.", active: true },
  { id: 3, symptom_key: "terrain_sand", title: "Sable", advice: "Base sable.", active: true },
  { id: 4, symptom_key: "headshake", title: "Guidonne", advice: "Vérifiez le SAG.", active: false },
];

describe("getAdvice", () => {
  it("retourne les conseils des symptômes cochés", () => {
    const advice = getAdvice(["bottoms_out"], recos);
    expect(advice).toHaveLength(1);
    expect(advice[0].title).toBe("Talonne");
  });

  it("ignore les recommandations désactivées", () => {
    expect(getAdvice(["headshake"], recos)).toHaveLength(0);
  });

  it("ajoute le conseil terrain pour le sable", () => {
    const advice = getAdvice(["rebounds"], recos, "Sable");
    expect(advice.map((a) => a.key).sort()).toEqual(["rebounds", "terrain_sand"]);
  });

  it("ne double pas un conseil déjà présent", () => {
    const advice = getAdvice(["terrain_sand"], recos, "Sable");
    expect(advice).toHaveLength(1);
  });
});
