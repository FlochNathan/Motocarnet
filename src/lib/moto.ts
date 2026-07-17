import type { MotorcycleWithModel } from "./types";

/** « KTM 250 SX-F Factory Edition 2024 » */
export function motoLabel(m: MotorcycleWithModel): string {
  const model = m.motorcycle_models;
  const version = model.version ? ` ${model.version}` : "";
  return `${model.motorcycle_brands.name} ${model.name}${version} ${m.year}`;
}

/** « 250 4T • 2 temps » etc. */
export function motoSpec(m: MotorcycleWithModel): string {
  const model = m.motorcycle_models;
  return `${model.displacement_cc} cm³ • ${model.stroke === 2 ? "2 temps" : "4 temps"}`;
}

export const MOTO_SELECT = "*, motorcycle_models(*, motorcycle_brands(*))";
