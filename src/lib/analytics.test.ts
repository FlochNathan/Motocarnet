import { describe, expect, it } from "vitest";
import { activityCalendar, costPerHourByMonth, cumulativeHours, partWear, symptomCounts } from "./analytics";
import type { MaintenanceRecord, MaintenanceType, RidingSession, SuspensionFeedback } from "./types";

function session(date: string, minutes: number, moto = "m1"): RidingSession {
  return {
    id: crypto.randomUUID(), user_id: "u", motorcycle_id: moto,
    session_date: date, duration_minutes: minutes, terrain_type_id: null,
    track_name: null, conditions: null, comment: null, created_at: date,
  };
}

function record(moto: string, typeId: number, hoursAt: number): MaintenanceRecord {
  return {
    id: crypto.randomUUID(), user_id: "u", motorcycle_id: moto,
    maintenance_type_id: typeId, record_date: "2026-01-01", hours_at: hoursAt,
    parts_replaced: null, cost: null, workshop: null, comment: null,
    photo_url: null, created_at: "2026-01-01",
  };
}

describe("cumulativeHours", () => {
  it("cumule dans l'ordre chronologique en partant des heures d'achat", () => {
    const points = cumulativeHours([session("2026-03-01", 60), session("2026-01-01", 90)], 10);
    expect(points).toEqual([
      { date: "2026-01-01", hours: 11.5 },
      { date: "2026-03-01", hours: 12.5 },
    ]);
  });

  it("fusionne deux sessions du même jour en un seul point", () => {
    const points = cumulativeHours([session("2026-01-01", 60), session("2026-01-01", 30)], 0);
    expect(points).toHaveLength(1);
    expect(points[0].hours).toBe(1.5);
  });
});

describe("activityCalendar", () => {
  it("produit une grille complète terminant le dimanche de la semaine courante", () => {
    const days = activityCalendar([session("2026-07-15", 90)], 4, new Date(2026, 6, 15)); // mercredi 15/07/2026
    expect(days).toHaveLength(28);
    expect(days[days.length - 1].date).toBe("2026-07-19"); // dimanche
    expect(days.find((d) => d.date === "2026-07-15")?.minutes).toBe(90);
    expect(days.find((d) => d.date === "2026-07-14")?.minutes).toBe(0);
  });
});

describe("partWear", () => {
  const types: MaintenanceType[] = [{
    id: 1, category: "moteur", name: "Piston",
    default_interval_hours: null, default_interval_months: null,
    applies_to_stroke: null, sort: 0, active: true,
  }];

  it("calcule la vie moyenne et l'usure depuis le dernier remplacement", () => {
    const wear = partWear([record("m1", 1, 10), record("m1", 1, 50)], types, "m1", 70);
    expect(wear).toHaveLength(1);
    expect(wear[0].averageLife).toBe(40);
    expect(wear[0].sinceLast).toBe(20);
    expect(wear[0].ratio).toBeCloseTo(0.5);
  });

  it("ignore les opérations avec moins de deux remplacements", () => {
    expect(partWear([record("m1", 1, 10)], types, "m1", 70)).toHaveLength(0);
  });

  it("classe les usures les plus critiques en premier", () => {
    const types2 = [...types, { ...types[0], id: 2, name: "Pneus" }];
    const wear = partWear(
      [record("m1", 1, 0), record("m1", 1, 40), record("m1", 2, 0), record("m1", 2, 30)],
      types2, "m1", 60,
    );
    expect(wear[0].typeName).toBe("Pneus"); // 30/30 = 1 > 20/40 = 0,5
  });
});

describe("symptomCounts", () => {
  it("compte les symptômes sur l'ensemble des ressentis", () => {
    const feedbacks: SuspensionFeedback[] = [
      { id: "1", user_id: "u", setup_id: "s", session_id: null, feedback_date: "2026-01-01", symptoms: ["bottoms_out", "headshake"], comfort: 3, confidence: 3, comment: null, created_at: "" },
      { id: "2", user_id: "u", setup_id: "s", session_id: null, feedback_date: "2026-01-02", symptoms: ["bottoms_out"], comfort: 3, confidence: 3, comment: null, created_at: "" },
    ];
    const counts = symptomCounts(feedbacks);
    expect(counts[0]).toEqual({ symptom: "bottoms_out", count: 2 });
  });
});

describe("costPerHourByMonth", () => {
  it("divise les dépenses du mois par les heures roulées du mois", () => {
    const rows = costPerHourByMonth(
      [{ id: "e", user_id: "u", motorcycle_id: "m1", maintenance_record_id: null, expense_date: "2026-03-10", category: "essence", label: "x", amount: 30, created_at: "" }],
      [session("2026-03-05", 120)],
      2026,
    );
    expect(rows[2].value).toBe(15);
    expect(rows[0].value).toBeNull(); // aucun roulage en janvier
  });
});
