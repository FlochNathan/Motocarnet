// ============================================================
// Types de données — miroir du schéma Supabase
// ============================================================

export type RiderLevel = "debutant" | "loisir" | "confirme" | "competition";
export type MotoStatus = "active" | "sold" | "repair";
export type Conditions = "sec" | "humide" | "boueux" | "poussiereux" | "gele" | "variable";
export type MaintenanceCategory = "moteur" | "partie_cycle" | "suspensions";
export type Stroke = 2 | 4;

export interface Profile {
  id: string;
  display_name: string | null;
  rider_weight_kg: number | null;
  rider_level: RiderLevel | null;
  is_admin: boolean;
  apify_token: string | null;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  active: boolean;
}

export interface MotorcycleModel {
  id: number;
  brand_id: number;
  name: string;
  version: string | null;
  displacement_label: string;
  displacement_cc: number;
  stroke: Stroke;
  year_from: number;
  year_to: number;
  active: boolean;
}

export interface ModelWithBrand extends MotorcycleModel {
  motorcycle_brands: Brand;
}

export interface Motorcycle {
  id: string;
  user_id: string;
  model_id: number;
  year: number;
  photo_url: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_hours: number;
  current_hours: number;
  notes: string | null;
  status: MotoStatus;
  is_primary: boolean;
  created_at: string;
}

export interface MotorcycleWithModel extends Motorcycle {
  motorcycle_models: ModelWithBrand;
}

export interface TerrainType {
  id: number;
  name: string;
  sort: number;
  active: boolean;
}

export interface RidingSession {
  id: string;
  user_id: string;
  motorcycle_id: string;
  session_date: string;
  duration_minutes: number;
  terrain_type_id: number | null;
  track_name: string | null;
  conditions: Conditions | null;
  comment: string | null;
  created_at: string;
}

export interface MaintenanceType {
  id: number;
  category: MaintenanceCategory;
  name: string;
  default_interval_hours: number | null;
  default_interval_months: number | null;
  applies_to_stroke: Stroke | null;
  sort: number;
  active: boolean;
}

export interface MaintenanceRecord {
  id: string;
  user_id: string;
  motorcycle_id: string;
  maintenance_type_id: number;
  record_date: string;
  hours_at: number;
  parts_replaced: string | null;
  cost: number | null;
  workshop: string | null;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  user_id: string;
  motorcycle_id: string;
  maintenance_type_id: number;
  interval_hours: number | null;
  interval_months: number | null;
  /** false : ne remonte plus dans les urgences (statut visible sur la fiche moto) */
  alert_enabled: boolean;
  /** Seuil « bientôt » en heures restantes (null = 20 % de l'intervalle) */
  alert_before_hours: number | null;
  /** Seuil « bientôt » en mois restants (null = 20 % de l'intervalle) */
  alert_before_months: number | null;
}

export interface CustomReminder {
  id: string;
  user_id: string;
  motorcycle_id: string;
  title: string;
  due_date: string | null;
  due_hours: number | null;
  note: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

export interface SuspensionSetup {
  id: string;
  user_id: string;
  motorcycle_id: string;
  name: string;
  rider_weight_kg: number | null;
  rider_level: RiderLevel | null;
  terrain_type_id: number | null;
  terrain_conditions: Conditions | null;
  temperature_c: number | null;
  tire_type: string | null;
  tire_pressure_front_bar: number | null;
  tire_pressure_rear_bar: number | null;
  fork_compression_clicks: number | null;
  fork_rebound_clicks: number | null;
  fork_preload_turns: number | null;
  fork_height_mm: number | null;
  fork_air_pressure_bar: number | null;
  fork_spring_rate: string | null;
  shock_lsc_clicks: number | null;
  shock_hsc_turns: number | null;
  shock_rebound_clicks: number | null;
  shock_preload_mm: number | null;
  shock_sag_static_mm: number | null;
  shock_sag_rider_mm: number | null;
  shock_spring_rate: string | null;
  is_favorite: boolean;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupRevision {
  id: string;
  setup_id: string;
  user_id: string;
  snapshot: Partial<SuspensionSetup>;
  created_at: string;
}

export interface SuspensionFeedback {
  id: string;
  user_id: string;
  setup_id: string;
  session_id: string | null;
  feedback_date: string;
  symptoms: string[];
  comfort: number | null;
  confidence: number | null;
  comment: string | null;
  created_at: string;
}

export interface SetupRecommendation {
  id: number;
  symptom_key: string;
  title: string;
  advice: string;
  active: boolean;
}

export interface TorqueSpec {
  name: string;
  value: string;
}

export interface SuggestedInterval {
  type_name: string;
  hours: number | null;
  months: number | null;
}

export interface ModelSpec {
  id: number;
  model_id: number;
  year_from: number;
  year_to: number;
  oil_qty: string | null;
  oil_type: string | null;
  coolant_qty: string | null;
  premix_ratio: string | null;
  valve_intake: string | null;
  valve_exhaust: string | null;
  spark_plug: string | null;
  fork_info: string | null;
  fork_clicks: string | null;
  shock_clicks: string | null;
  sag_recommended: string | null;
  torques: TorqueSpec[];
  suggested_intervals: SuggestedInterval[];
  notes: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  user_id: string;
  motorcycle_id: string;
  maintenance_record_id: string | null;
  name: string;
  reference: string | null;
  installed_date: string | null;
  installed_at_hours: number | null;
  notes: string | null;
  created_at: string;
}

/** Terrain du catalogue commun (géré en admin, organisé par région) */
export interface CatalogTrack {
  id: string;
  region: string;
  name: string;
  city: string | null;
  facebook_url: string | null;
  terrain_type_id: number | null;
  active: boolean;
  created_at: string;
}

export interface TrackScrape {
  catalog_id: string;
  last_fetched_at: string | null;
  scrape_run_id: string | null;
  scrape_started_at: string | null;
}

export interface TrackPost {
  id: string;
  catalog_id: string;
  title: string | null;
  content: string | null;
  link: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  motorcycle_id: string;
  maintenance_record_id: string | null;
  expense_date: string;
  category: "entretien" | "piece" | "essence" | "transport" | "equipement" | "inscription" | "autre";
  label: string;
  amount: number;
  created_at: string;
}
