// ============================================================
// Seed de démonstration — crée un compte démo avec une moto,
// des sessions, des entretiens et des réglages de suspensions.
//
// Prérequis :
//   1. Les migrations et supabase/seed.sql ont été exécutés.
//   2. .env.local contient NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
//
// Lancement :  npm run seed:demo
//
// Compte créé :  demo@motocarnet.fr  /  demo1234
// ============================================================

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_EMAIL = "demo@motocarnet.fr";
const DEMO_PASSWORD = "demo1234";

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // 1. Compte démo
  let userId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Pilote Démo #27" },
  });
  if (createError) {
    if (!createError.message.includes("already")) throw createError;
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === DEMO_EMAIL)?.id;
    console.log("ℹ️  Compte démo déjà existant, réutilisation.");
  } else {
    userId = created.user.id;
    console.log("✅ Compte démo créé :", DEMO_EMAIL, "/", DEMO_PASSWORD);
  }
  if (!userId) throw new Error("Impossible de déterminer l'utilisateur démo");

  await supabase.from("profiles").update({ rider_weight_kg: 78, rider_level: "loisir" }).eq("id", userId);

  // Nettoyage des anciennes données démo (relances multiples)
  await supabase.from("motorcycles").delete().eq("user_id", userId);

  // 2. Référentiels
  const { data: models } = await supabase.from("motorcycle_models").select("*, motorcycle_brands(*)");
  const { data: types } = await supabase.from("maintenance_types").select("*");
  const { data: terrains } = await supabase.from("terrain_types").select("*");
  if (!models?.length || !types?.length || !terrains?.length) {
    throw new Error("Référentiels vides : exécutez d'abord supabase/seed.sql");
  }

  const findModel = (brand, name) =>
    models.find((m) => m.motorcycle_brands.name === brand && m.name === name && !m.version);
  const typeId = (name) => types.find((t) => t.name === name)?.id;
  const terrainId = (name) => terrains.find((t) => t.name === name)?.id;

  // 3. Motos : une 4 temps et une 2 temps
  const sxf = findModel("KTM", "250 SX-F");
  const yz = findModel("Yamaha", "YZ125");
  if (!sxf || !yz) throw new Error("Modèles KTM 250 SX-F / Yamaha YZ125 introuvables dans le seed");

  const { data: moto1, error: e1 } = await supabase.from("motorcycles").insert({
    user_id: userId, model_id: sxf.id, year: 2024,
    purchase_date: daysAgo(240), purchase_hours: 12, current_hours: 12,
    serial_number: "VBKSXF2024DEMO", notes: "Moto de démonstration — préparée ressorts 4.6 N/mm.",
    status: "active", is_primary: true,
  }).select().single();
  if (e1) throw e1;

  const { data: moto2, error: e2 } = await supabase.from("motorcycles").insert({
    user_id: userId, model_id: yz.id, year: 2022,
    purchase_date: daysAgo(700), purchase_hours: 30, current_hours: 30,
    status: "active", is_primary: false, notes: "125 d'entraînement.",
  }).select().single();
  if (e2) throw e2;

  // 4. Sessions (le trigger met à jour les compteurs)
  const sessions = [
    { d: 120, min: 90, terrain: "Sable", track: "Circuit de Loon-Plage", cond: "sec", com: "Bonnes sensations, sable profond." },
    { d: 90, min: 120, terrain: "Terre dure", track: "MX Park Romagné", cond: "poussiereux", com: null },
    { d: 60, min: 75, terrain: "Terre meuble", track: "Piste locale", cond: "humide", com: "Terrain parfait le matin." },
    { d: 30, min: 105, terrain: "Terrain défoncé", track: "MX Park Romagné", cond: "sec", com: "Gros trous en fin de journée." },
    { d: 14, min: 60, terrain: "Sable", track: "Circuit de Loon-Plage", cond: "variable", com: null },
    { d: 7, min: 90, terrain: "Terre dure", track: "Piste locale", cond: "sec", com: "Test réglages fourche." },
  ];
  for (const s of sessions) {
    const { error } = await supabase.from("riding_sessions").insert({
      user_id: userId, motorcycle_id: moto1.id, session_date: daysAgo(s.d),
      duration_minutes: s.min, terrain_type_id: terrainId(s.terrain),
      track_name: s.track, conditions: s.cond, comment: s.com,
    });
    if (error) throw error;
  }
  await supabase.from("riding_sessions").insert({
    user_id: userId, motorcycle_id: moto2.id, session_date: daysAgo(45),
    duration_minutes: 60, terrain_type_id: terrainId("Prairie"), track_name: "Champ derrière la maison",
    conditions: "sec", comment: "Roulage tranquille.",
  });

  // 5. Entretiens
  const records = [
    { t: "Vidange moteur", d: 60, h: 14.5, parts: "Huile Motorex 10W-40, 0,9 L", cost: 28.5, shop: "Moi-même", com: null },
    { t: "Filtre à air", d: 30, h: 16.75, parts: "Filtre Twin Air", cost: 15, shop: "Moi-même", com: "Graissage complet." },
    { t: "Vidange moteur", d: 14, h: 17.25, parts: "Huile Motorex 10W-40", cost: 28.5, shop: "Moi-même", com: null },
    { t: "Plaquettes arrière", d: 30, h: 16.75, parts: "Plaquettes Brembo", cost: 32, shop: "Concession KTM", com: null },
    { t: "Contrôle du SAG", d: 7, h: 18.5, parts: null, cost: null, shop: null, com: "SAG pilote réglé à 103 mm." },
  ];
  for (const r of records) {
    const tid = typeId(r.t);
    if (!tid) continue;
    const { data: rec, error } = await supabase.from("maintenance_records").insert({
      user_id: userId, motorcycle_id: moto1.id, maintenance_type_id: tid,
      record_date: daysAgo(r.d), hours_at: r.h, parts_replaced: r.parts,
      cost: r.cost, workshop: r.shop, comment: r.com,
    }).select().single();
    if (error) throw error;
    if (r.cost) {
      await supabase.from("expenses").insert({
        user_id: userId, motorcycle_id: moto1.id, maintenance_record_id: rec.id,
        expense_date: daysAgo(r.d), category: "entretien", label: r.t, amount: r.cost,
      });
    }
  }

  // 6. Échéances (fréquences par défaut du référentiel)
  //    Exemple d'alerte personnalisée : vidange signalée 2 h avant l'échéance
  const schedules = types
    .filter((t) => (t.applies_to_stroke === null || t.applies_to_stroke === 4) && (t.default_interval_hours || t.default_interval_months))
    .map((t) => ({
      user_id: userId, motorcycle_id: moto1.id, maintenance_type_id: t.id,
      interval_hours: t.default_interval_hours, interval_months: t.default_interval_months,
      alert_before_hours: t.name === "Vidange moteur" ? 2 : null,
    }));
  await supabase.from("maintenance_schedules").insert(schedules);

  // 6 bis. Rappel libre d'exemple
  await supabase.from("custom_reminders").insert({
    user_id: userId, motorcycle_id: moto1.id,
    title: "Renouveler la licence FFM",
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    note: "Penser au certificat médical.",
  });

  // 7. Réglages de suspensions
  const { data: setup1, error: e3 } = await supabase.from("suspension_setups").insert({
    user_id: userId, motorcycle_id: moto1.id, name: "Base terrain dur",
    rider_weight_kg: 78, rider_level: "loisir",
    terrain_type_id: terrainId("Terre dure"), terrain_conditions: "sec", temperature_c: 22,
    tire_type: "Medium (mixte)", tire_pressure_front_bar: 0.9, tire_pressure_rear_bar: 0.85,
    fork_compression_clicks: 14, fork_rebound_clicks: 12, fork_height_mm: 5, fork_spring_rate: "4.6 N/mm",
    shock_lsc_clicks: 12, shock_hsc_turns: 1.5, shock_rebound_clicks: 11,
    shock_preload_mm: 6, shock_sag_static_mm: 35, shock_sag_rider_mm: 103, shock_spring_rate: "45 N/mm",
    is_favorite: true, rating: 4, notes: "Bonne base polyvalente.",
  }).select().single();
  if (e3) throw e3;

  await supabase.from("suspension_setups").insert({
    user_id: userId, motorcycle_id: moto1.id, name: "Base sable",
    rider_weight_kg: 78, rider_level: "loisir",
    terrain_type_id: terrainId("Sable"), terrain_conditions: "sec",
    tire_type: "Soft (sable/boue)", tire_pressure_front_bar: 0.95, tire_pressure_rear_bar: 0.9,
    fork_compression_clicks: 10, fork_rebound_clicks: 10, fork_height_mm: 2, fork_spring_rate: "4.6 N/mm",
    shock_lsc_clicks: 10, shock_hsc_turns: 1.25, shock_rebound_clicks: 9,
    shock_preload_mm: 7, shock_sag_static_mm: 33, shock_sag_rider_mm: 100, shock_spring_rate: "45 N/mm",
    rating: 3, notes: "Fermé en compression pour le sable, détente ralentie.",
  });

  // 8. Ressenti sur le réglage favori
  await supabase.from("suspension_feedback").insert({
    user_id: userId, setup_id: setup1.id, feedback_date: daysAgo(7),
    symptoms: ["bottoms_out", "lack_traction"], comfort: 3, confidence: 4,
    comment: "Talonne sur la grosse réception après la table.",
  });

  console.log("✅ Données de démonstration créées.");
  console.log("   Connexion :", DEMO_EMAIL, "/", DEMO_PASSWORD);
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
