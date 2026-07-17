// ============================================================
// Assistant de réglage suspensions : propose des BASES DE DÉPART
// (SAG cible, dureté de ressorts selon le poids, ajustements de
// clics selon le terrain et les conditions).
//
// Ces valeurs sont des repères génériques pour une moto de cross
// adulte (125 à 450). Elles ne remplacent jamais le manuel
// constructeur ni un professionnel : l'avertissement RECO_WARNING
// doit toujours accompagner leur affichage.
// ============================================================

import type { Conditions, RiderLevel } from "./types";

export interface SagAdvice {
  /** SAG statique cible en mm (moto seule) */
  staticMin: number;
  staticMax: number;
  /** SAG avec pilote cible en mm */
  riderMin: number;
  riderMax: number;
  note: string;
}

/** SAG cible selon le terrain (base 100–105 mm, ajustée pour la stabilité ou l'agilité) */
export function sagAdvice(terrainName: string | null, level: RiderLevel | null): SagAdvice {
  const n = (terrainName ?? "").toLowerCase();
  let riderMin = 102;
  let riderMax = 105;
  let note = "Base polyvalente : mesurez le SAG avec votre équipement complet.";

  if (n.includes("sable") || n.includes("rapide")) {
    riderMin = 100;
    riderMax = 103;
    note = "Sable / terrain rapide : un SAG légèrement réduit assied l'arrière et stabilise la moto à haute vitesse.";
  } else if (n.includes("dure") || n.includes("cailloux") || n.includes("sec")) {
    riderMin = 104;
    riderMax = 107;
    note = "Terrain dur / cassant : un peu plus de SAG apporte du confort et de la motricité sur les petits chocs.";
  } else if (n.includes("technique") || n.includes("supercross")) {
    riderMin = 100;
    riderMax = 104;
    note = "Terrain technique : un SAG plutôt court garde la moto vive et précise dans les enchaînements.";
  } else if (n.includes("boue") || n.includes("humide") || n.includes("défoncé") || n.includes("defonce")) {
    riderMin = 103;
    riderMax = 106;
    note = "Terrain gras / défoncé : un SAG légèrement augmenté aide la roue arrière à suivre le sol.";
  }

  if (level === "debutant" || level === "loisir") {
    note += " Pour un pilotage loisir, restez dans le haut de la fourchette (plus de confort).";
  }

  return { staticMin: 33, staticMax: 38, riderMin, riderMax, note };
}

export interface SpringAdvice {
  fork: string;
  shock: string;
  note: string;
}

/** Dureté de ressorts indicative selon le poids équipé (moto adulte 125–450) */
export function springAdvice(weightKg: number | null): SpringAdvice | null {
  if (weightKg === null || weightKg < 40 || weightKg > 150) return null;
  const table: { max: number; fork: string; shock: string }[] = [
    { max: 65, fork: "4,0 N/mm", shock: "40–42 N/mm" },
    { max: 72, fork: "4,2 N/mm", shock: "42–45 N/mm" },
    { max: 79, fork: "4,4 N/mm", shock: "45–48 N/mm" },
    { max: 86, fork: "4,6 N/mm", shock: "48–51 N/mm" },
    { max: 93, fork: "4,8 N/mm", shock: "51–54 N/mm" },
    { max: 150, fork: "5,0 N/mm ou +", shock: "54 N/mm ou +" },
  ];
  const row = table.find((r) => weightKg <= r.max)!;
  return {
    fork: row.fork,
    shock: row.shock,
    note:
      "Repères pour une moto de cross adulte (125–450). Les minicross (50–85) et certains modèles utilisent d'autres gammes : " +
      "vérifiez impérativement le tableau du constructeur avant tout achat de ressort.",
  };
}

export interface ClickerTip {
  area: "Fourche" | "Amortisseur" | "Général";
  tip: string;
}

/** Ajustements de clics par rapport à votre base, selon terrain et conditions */
export function clickerAdvice(terrainName: string | null, conditions: Conditions | null): ClickerTip[] {
  const n = (terrainName ?? "").toLowerCase();
  const tips: ClickerTip[] = [];

  if (n.includes("sable")) {
    tips.push(
      { area: "Fourche", tip: "Fermez la compression de 2 à 4 clics et descendez les tubes dans les tés (0 à 2 mm dépassants) pour éviter de plonger dans le sable." },
      { area: "Amortisseur", tip: "Ralentissez la détente de 1 à 2 clics et fermez légèrement la basse vitesse : l'arrière reste assis et motrice dans les bosses de sable." },
    );
  } else if (n.includes("dure") || n.includes("cailloux") || n.includes("sec")) {
    tips.push(
      { area: "Fourche", tip: "Ouvrez la compression de 1 à 3 clics pour absorber les petits chocs et les trous d'accélération." },
      { area: "Amortisseur", tip: "Ouvrez la compression basse vitesse de 1 à 2 clics et accélérez légèrement la détente pour garder le contact avec le sol." },
    );
  } else if (n.includes("boue") || n.includes("défoncé") || n.includes("defonce")) {
    tips.push(
      { area: "Fourche", tip: "Base légèrement plus ferme (1 à 2 clics de compression) : les trous profonds sollicitent fort la fourche." },
      { area: "Amortisseur", tip: "Ouvrez la basse vitesse d'un clic pour la motricité, mais surveillez le talonnage dans les gros appels." },
    );
  } else if (n.includes("rapide")) {
    tips.push(
      { area: "Fourche", tip: "Descendez les tubes dans les tés (1 à 2 mm) et ralentissez légèrement la détente : priorité à la stabilité." },
      { area: "Amortisseur", tip: "Vérifiez le SAG puis ralentissez la détente d'un clic si la moto louvoie à haute vitesse." },
    );
  } else if (n.includes("technique") || n.includes("supercross")) {
    tips.push(
      { area: "Fourche", tip: "Remontez légèrement les tubes (2–3 mm) pour une moto qui tourne plus facilement dans les sections lentes." },
      { area: "Amortisseur", tip: "Base plutôt ferme en compression pour encaisser les réceptions, détente assez rapide pour les enchaînements." },
    );
  } else if (n.includes("meuble") || n.includes("prairie")) {
    tips.push(
      { area: "Général", tip: "Terrain souple : partez de vos réglages standard constructeur, le terrain absorbe une partie du travail des suspensions." },
    );
  }

  if (conditions === "boueux" || conditions === "humide") {
    tips.push({
      area: "Général",
      tip: "Conditions grasses : la moto s'alourdit (boue collée) et le terrain se creuse — attendez-vous à re-fermer légèrement la compression en fin de journée.",
    });
  }
  if (conditions === "sec" || conditions === "poussiereux") {
    tips.push({
      area: "Général",
      tip: "Terrain qui sèche et durcit au fil de la journée : prévoyez d'ouvrir la compression d'un clic ou deux l'après-midi pour garder du confort.",
    });
  }
  if (conditions === "gele") {
    tips.push({
      area: "Général",
      tip: "Sol gelé : suspensions plus raides à froid — laissez-les monter en température sur 1 à 2 tours avant de juger un réglage.",
    });
  }

  if (tips.length === 0) {
    tips.push({ area: "Général", tip: "Choisissez un type de terrain pour obtenir des ajustements adaptés, ou partez des réglages standard du constructeur." });
  }
  return tips;
}
