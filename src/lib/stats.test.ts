import { describe, expect, it } from "vitest";
import { averageLifeHours, hoursPerMonth, hoursPerTerrain } from "./stats";
import type { MaintenanceRecord, RidingSession } from "./types";

function session(date: string, minutes: number, terrain: number | null = null): RidingSession {
  return {
    id: crypto.randomUUID(), user_id: "u", motorcycle_id: "m",
    session_date: date, duration_minutes: minutes, terrain_type_id: terrain,
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

describe("hoursPerMonth", () => {
  it("agrège les minutes par mois sur la fenêtre demandée", () => {
    const today = new Date(2026, 6, 17); // juillet 2026
    const rows = hoursPerMonth([session("2026-07-01", 90), session("2026-07-10", 30), session("2026-06-05", 60)], 3, today);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ month: "2026-07", hours: 2 });
    expect(rows[1]).toEqual({ month: "2026-06", hours: 1 });
    expect(rows[0]).toEqual({ month: "2026-05", hours: 0 });
  });
});

describe("hoursPerTerrain", () => {
  it("trie les terrains par heures décroissantes", () => {
    const rows = hoursPerTerrain([session("2026-07-01", 60, 1), session("2026-07-02", 120, 2), session("2026-07-03", 30, 1)]);
    expect(rows[0]).toEqual({ terrainId: 2, hours: 2 });
    expect(rows[1].hours).toBe(1.5);
  });
});

describe("averageLifeHours", () => {
  it("calcule l'écart moyen entre remplacements sur une même moto", () => {
    const records = [record("a", 1, 10), record("a", 1, 50), record("a", 1, 95)];
    expect(averageLifeHours(records, 1)).toBe(42.5);
  });

  it("retourne null avec moins de deux remplacements", () => {
    expect(averageLifeHours([record("a", 1, 10)], 1)).toBeNull();
  });

  it("ne mélange pas les motos", () => {
    const records = [record("a", 1, 10), record("b", 1, 50)];
    expect(averageLifeHours(records, 1)).toBeNull();
  });
});
