import { describe, expect, it } from "vitest";
import { formatHours, formatMinutes, toCSV } from "./format";

describe("formatHours", () => {
  it("formate les heures pleines", () => {
    expect(formatHours(7)).toBe("7h");
    expect(formatHours(0)).toBe("0h");
  });
  it("formate les fractions d'heure", () => {
    expect(formatHours(7.5)).toBe("7h30");
    expect(formatHours(0.25)).toBe("0h15");
    expect(formatHours(1.75)).toBe("1h45");
  });
  it("arrondit proprement les flottants", () => {
    expect(formatHours(16.749999999)).toBe("16h45");
  });
});

describe("formatMinutes", () => {
  it("convertit les minutes en heures/minutes", () => {
    expect(formatMinutes(95)).toBe("1h35");
    expect(formatMinutes(60)).toBe("1h");
  });
});

describe("toCSV", () => {
  it("utilise le point-virgule et échappe les valeurs", () => {
    const csv = toCSV(["a", "b"], [["x;y", 'dit "oui"'], [null, 2]]);
    expect(csv).toBe('a;b\r\n"x;y";"dit ""oui"""\r\n;2');
  });
});
