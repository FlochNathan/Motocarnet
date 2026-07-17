import { describe, expect, it } from "vitest";
import { clickerAdvice, sagAdvice, springAdvice } from "./setup-advisor";

describe("sagAdvice", () => {
  it("réduit le SAG cible pour le sable (stabilité)", () => {
    const a = sagAdvice("Sable", "confirme");
    expect(a.riderMin).toBeLessThanOrEqual(100);
    expect(a.riderMax).toBeLessThanOrEqual(103);
    expect(a.staticMin).toBe(33);
  });

  it("augmente le SAG cible pour le terrain dur (confort)", () => {
    const a = sagAdvice("Terre dure", null);
    expect(a.riderMin).toBeGreaterThanOrEqual(104);
  });

  it("donne une base polyvalente sans terrain", () => {
    const a = sagAdvice(null, null);
    expect(a.riderMin).toBe(102);
    expect(a.riderMax).toBe(105);
  });

  it("ajoute un conseil pour les pilotes loisir", () => {
    expect(sagAdvice("Sable", "loisir").note).toContain("loisir");
  });
});

describe("springAdvice", () => {
  it("propose des ressorts plus durs quand le poids augmente", () => {
    expect(springAdvice(68)!.fork).toBe("4,2 N/mm");
    expect(springAdvice(78)!.fork).toBe("4,4 N/mm");
    expect(springAdvice(90)!.fork).toBe("4,8 N/mm");
  });

  it("retourne null pour un poids absent ou hors plage", () => {
    expect(springAdvice(null)).toBeNull();
    expect(springAdvice(20)).toBeNull();
  });

  it("avertit toujours de vérifier le tableau constructeur", () => {
    expect(springAdvice(75)!.note).toContain("constructeur");
  });
});

describe("clickerAdvice", () => {
  it("conseille de fermer la compression dans le sable", () => {
    const tips = clickerAdvice("Sable", null);
    expect(tips.some((t) => t.area === "Fourche" && t.tip.includes("Fermez la compression"))).toBe(true);
  });

  it("conseille d'ouvrir la compression sur terrain dur", () => {
    const tips = clickerAdvice("Terre dure", null);
    expect(tips.some((t) => t.tip.includes("Ouvrez la compression"))).toBe(true);
  });

  it("ajoute un conseil lié aux conditions grasses", () => {
    const tips = clickerAdvice("Sable", "boueux");
    expect(tips.some((t) => t.area === "Général" && t.tip.includes("grasses"))).toBe(true);
  });

  it("donne un conseil générique sans terrain", () => {
    const tips = clickerAdvice(null, null);
    expect(tips).toHaveLength(1);
    expect(tips[0].area).toBe("Général");
  });
});
