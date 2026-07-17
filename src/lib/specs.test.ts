import { describe, expect, it } from "vitest";
import { buildSuggestedSchedules, findSpecForMoto } from "./specs";
import type { MaintenanceSchedule, MaintenanceType, ModelSpec } from "./types";

function spec(modelId: number, yearFrom: number, yearTo: number): ModelSpec {
  return {
    id: 1, model_id: modelId, year_from: yearFrom, year_to: yearTo,
    oil_qty: null, oil_type: null, coolant_qty: null, premix_ratio: null,
    valve_intake: null, valve_exhaust: null, spark_plug: null,
    fork_info: null, fork_clicks: null, shock_clicks: null, sag_recommended: null,
    torques: [], suggested_intervals: [], notes: null, verified: false,
    created_at: "", updated_at: "",
  };
}

function mType(id: number, name: string, active = true): MaintenanceType {
  return {
    id, category: "moteur", name,
    default_interval_hours: null, default_interval_months: null,
    applies_to_stroke: null, sort: 0, active,
  };
}

describe("findSpecForMoto", () => {
  it("trouve la fiche dont la plage d'années couvre la moto", () => {
    const specs = [spec(10, 2019, 2022), spec(10, 2023, 2026)];
    expect(findSpecForMoto(specs, { model_id: 10, year: 2024 })).toBe(specs[1]);
    expect(findSpecForMoto(specs, { model_id: 10, year: 2020 })).toBe(specs[0]);
  });

  it("retourne null si aucun modèle ou année ne correspond", () => {
    const specs = [spec(10, 2023, 2026)];
    expect(findSpecForMoto(specs, { model_id: 99, year: 2024 })).toBeNull();
    expect(findSpecForMoto(specs, { model_id: 10, year: 2018 })).toBeNull();
  });
});

describe("buildSuggestedSchedules", () => {
  const types = [mType(1, "Vidange moteur"), mType(2, "Piston"), mType(3, "Ancienne opération", false)];

  it("crée les échéances des opérations connues sans échéance existante", () => {
    const result = buildSuggestedSchedules(
      [
        { type_name: "Vidange moteur", hours: 10, months: null },
        { type_name: "Piston", hours: 50, months: null },
      ],
      types, [], "moto-1",
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ motorcycle_id: "moto-1", maintenance_type_id: 1, interval_hours: 10, interval_months: null });
  });

  it("ne remplace jamais une échéance déjà définie par l'utilisateur", () => {
    const existing: MaintenanceSchedule[] = [{
      id: "s1", user_id: "u", motorcycle_id: "moto-1", maintenance_type_id: 1,
      interval_hours: 5, interval_months: null,
      alert_enabled: true, alert_before_hours: null, alert_before_months: null,
    }];
    const result = buildSuggestedSchedules(
      [{ type_name: "Vidange moteur", hours: 10, months: null }],
      types, existing, "moto-1",
    );
    expect(result).toHaveLength(0);
  });

  it("ignore les types inconnus, inactifs ou sans intervalle", () => {
    const result = buildSuggestedSchedules(
      [
        { type_name: "Opération inexistante", hours: 10, months: null },
        { type_name: "Ancienne opération", hours: 10, months: null },
        { type_name: "Piston", hours: null, months: null },
      ],
      types, [], "moto-1",
    );
    expect(result).toHaveLength(0);
  });
});
