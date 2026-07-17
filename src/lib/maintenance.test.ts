import { describe, expect, it } from "vitest";
import { computeDue, computeReminderStatus } from "./maintenance";

const base = {
  currentHours: 20,
  today: "2026-07-17",
  intervalHours: null as number | null,
  intervalMonths: null as number | null,
  lastHours: null as number | null,
  lastDate: null as string | null,
};

describe("computeDue — échéances en heures", () => {
  it("est à jour juste après l'entretien", () => {
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 19, lastDate: "2026-07-10" });
    expect(r.status).toBe("ok");
    expect(r.hoursRemaining).toBe(4);
    expect(r.nextDueHours).toBe(24);
  });

  it("passe en « bientôt » sous 20 % de l'intervalle restant", () => {
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 15.5, lastDate: "2026-07-01" });
    expect(r.hoursRemaining).toBe(0.5);
    expect(r.status).toBe("soon");
  });

  it("passe en « dépassé » quand l'échéance est atteinte", () => {
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 14, lastDate: "2026-06-01" });
    expect(r.hoursRemaining).toBe(-1);
    expect(r.status).toBe("overdue");
  });

  it("utilise les heures d'achat comme point de départ si jamais fait", () => {
    const r = computeDue({ ...base, intervalHours: 40, baselineHours: 10, baselineDate: "2026-01-01" });
    expect(r.neverDone).toBe(true);
    expect(r.nextDueHours).toBe(50);
    expect(r.hoursRemaining).toBe(30);
    expect(r.status).toBe("ok");
  });
});

describe("computeDue — échéances en mois", () => {
  it("suit une fréquence en mois seule", () => {
    const r = computeDue({ ...base, intervalMonths: 12, lastHours: 18, lastDate: "2025-07-20" });
    expect(r.status).toBe("soon"); // ~11,9 mois écoulés sur 12
    expect(r.monthsRemaining).not.toBeNull();
  });

  it("est dépassé quand les mois sont écoulés", () => {
    const r = computeDue({ ...base, intervalMonths: 6, lastHours: 18, lastDate: "2025-06-01" });
    expect(r.status).toBe("overdue");
  });
});

describe("computeDue — première échéance atteinte", () => {
  it("prend la pire des deux échéances (heures OK, mois dépassés)", () => {
    const r = computeDue({
      ...base,
      intervalHours: 100,
      intervalMonths: 3,
      lastHours: 19,
      lastDate: "2025-12-01",
    });
    expect(r.status).toBe("overdue");
  });

  it("sans aucune fréquence : aucun statut", () => {
    const r = computeDue({ ...base, lastHours: 10, lastDate: "2026-01-01" });
    expect(r.status).toBe("none");
  });
});

describe("computeDue — seuils d'alerte personnalisés", () => {
  it("« alerter 2 h avant » : orange dès 2 h restantes même si > 20 %", () => {
    // Intervalle 40 h, reste 2 h (5 % < 20 % serait déjà orange) → testons l'inverse :
    // intervalle 5 h, reste 2 h (40 % de l'intervalle) : le seuil auto dirait « ok »
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 17, lastDate: "2026-07-10", alertBeforeHours: 2 });
    expect(r.hoursRemaining).toBe(2);
    expect(r.status).toBe("soon");
  });

  it("seuil personnalisé plus strict que 20 % : reste vert plus longtemps", () => {
    // Intervalle 5 h, reste 0,5 h (10 %) : auto = orange, mais seuil 0,25 h → vert
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 15.5, lastDate: "2026-07-01", alertBeforeHours: 0.25 });
    expect(r.status).toBe("ok");
  });

  it("« alerter X mois avant » sur une fréquence en mois", () => {
    // 12 mois, ~6 mois écoulés : auto = ok, seuil « 7 mois avant » → orange
    const r = computeDue({ ...base, intervalMonths: 12, lastHours: 18, lastDate: "2026-01-15", alertBeforeMonths: 7 });
    expect(r.status).toBe("soon");
  });

  it("seuil null : la règle des 20 % s'applique comme avant", () => {
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 15.5, lastDate: "2026-07-01", alertBeforeHours: null });
    expect(r.status).toBe("soon");
  });

  it("le dépassement reste rouge quel que soit le seuil", () => {
    const r = computeDue({ ...base, intervalHours: 5, lastHours: 14, lastDate: "2026-06-01", alertBeforeHours: 0 });
    expect(r.status).toBe("overdue");
  });
});

describe("computeReminderStatus — rappels libres", () => {
  const today = "2026-07-17";

  it("dépassé quand la date est atteinte", () => {
    expect(computeReminderStatus({ due_date: "2026-07-17", due_hours: null }, 10, today)).toBe("overdue");
    expect(computeReminderStatus({ due_date: "2026-07-01", due_hours: null }, 10, today)).toBe("overdue");
  });

  it("dépassé quand les heures moteur sont atteintes", () => {
    expect(computeReminderStatus({ due_date: null, due_hours: 20 }, 20, today)).toBe("overdue");
  });

  it("bientôt à moins de 14 jours ou 2 h", () => {
    expect(computeReminderStatus({ due_date: "2026-07-25", due_hours: null }, 10, today)).toBe("soon");
    expect(computeReminderStatus({ due_date: null, due_hours: 21 }, 19.5, today)).toBe("soon");
  });

  it("ok quand l'échéance est lointaine", () => {
    expect(computeReminderStatus({ due_date: "2026-12-01", due_hours: null }, 10, today)).toBe("ok");
    expect(computeReminderStatus({ due_date: null, due_hours: 50 }, 10, today)).toBe("ok");
  });

  it("la première échéance atteinte fait foi (date lointaine mais heures proches)", () => {
    expect(computeReminderStatus({ due_date: "2026-12-01", due_hours: 20 }, 20, today)).toBe("overdue");
  });
});
