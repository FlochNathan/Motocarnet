// ============================================================
// Contenu et identité de la page d'accueil (landing).
// Tout est centralisé ici pour être modifié facilement.
// ============================================================

export const BRAND = {
  name: "MXVision",
  tagline: "Entretien, budget et chronos de ta moto",
  accent: "#f5a623", // ambre sportif (accent de la landing, indépendant du thème app)
  accentSoft: "#ffb84d",
  // Liens : pointent vers les routes réelles de l'application.
  // Inscription/connexion existent ; le tableau de bord est à /accueil.
  links: {
    signup: "/inscription",
    login: "/connexion",
    features: "#fonctionnalites",
    how: "#comment",
    pricing: "#tarifs",
  },
};

// Décor 3D du hero : "beach" (plage, esprit Le Touquet) ou "track" (terrain de cross)
export const SCENE: "beach" | "track" = "beach";

export const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Comment ça marche", href: "#comment" },
  { label: "Tarifs", href: "#tarifs" },
];

export const HERO = {
  title: ["Toute la vie de ta moto.", "Au même endroit."],
  subtitle:
    "Entretiens, budget, heures moteur, chronos et rappels : garde le contrôle de ta moto à chaque sortie.",
  primaryCta: "Commencer gratuitement",
  secondaryCta: "Voir les fonctionnalités",
  reassurance: "Aucune carte bancaire requise",
  highlights: ["Entretien maîtrisé", "Budget sous contrôle", "Progression mesurée"],
};

// Données de démonstration — clairement fictives (aperçu produit)
export const PREVIEW = {
  engineHours: "42,6 h",
  nextOil: "3,4 h",
  monthBudget: "186 €",
  bestLap: "1:47.328",
  chain: "Bon état",
  notification: "Contrôle du jeu aux soupapes dans 12 h",
};

export const MAINTENANCE = {
  title: "N'oublie plus aucun entretien",
  text:
    "Vidanges, filtres, piston, chaîne et contrôles périodiques : programme chaque intervention et reçois les rappels au bon moment.",
  timeline: [
    { label: "Vidange moteur", meta: "il y a 2 h — 40,2 h", done: true },
    { label: "Filtre à air", meta: "à faire dans 1,4 h", done: false },
    { label: "Contrôle chaîne", meta: "à faire dans 6 h", done: false },
    { label: "Piston", meta: "à faire dans 12 h", done: false },
  ],
};

export const BUDGET = {
  title: "Sais exactement ce que te coûte ta passion",
  text:
    "Enregistre les pièces, le carburant, les équipements et les réparations pour suivre ton budget réel.",
  // Répartition de démonstration (€) — accompagnée de valeurs textuelles (accessibilité)
  categories: [
    { label: "Pièces", value: 320 },
    { label: "Entretien", value: 210 },
    { label: "Carburant", value: 140 },
    { label: "Équipement", value: 180 },
    { label: "Frais de circuit", value: 150 },
  ],
};

export const TIMING = {
  title: "Mesure ta progression à chaque session",
  text:
    "Enregistre tes tours, compare tes chronos et retrouve les réglages utilisés pendant chaque sortie.",
  stats: [
    { label: "Meilleur tour", value: "1:47.328" },
    { label: "Moyenne", value: "1:49.902" },
    { label: "Écart tours", value: "±0.6 s" },
  ],
  laps: [
    { n: 1, time: "1:52.104" },
    { n: 2, time: "1:49.880" },
    { n: 3, time: "1:48.512" },
    { n: 4, time: "1:47.328" },
    { n: 5, time: "1:48.006" },
  ],
};

export const HISTORY = {
  title: "Le carnet numérique complet de ta moto",
  text:
    "Conserve les entretiens, les factures, les réglages, les pièces et les événements importants dans un historique clair.",
  events: [
    { date: "22 juil.", label: "Session circuit — 5 tours", meta: "Meilleur : 1:47.328" },
    { date: "18 juil.", label: "Vidange moteur + filtre à huile", meta: "28,50 € — Moi-même" },
    { date: "10 juil.", label: "Nouveau réglage suspensions", meta: "Base terrain dur" },
    { date: "2 juil.", label: "Remplacement plaquettes arrière", meta: "32 € — Concession" },
    { date: "24 juin", label: "Achat de la moto", meta: "12 h au compteur" },
  ],
};

export const BENEFITS = [
  { title: "Rappels intelligents", text: "Sois prévenu au bon moment, en heures moteur ou en mois." },
  { title: "Historique complet", text: "Chaque entretien, pièce et facture conservé et daté." },
  { title: "Budget détaillé", text: "Vois précisément ce que coûte ta saison, poste par poste." },
  { title: "Chronos et sessions", text: "Suis tes tours et retrouve les réglages de chaque sortie." },
];

export const FINAL_CTA = {
  title: "Ta moto mérite mieux qu'un carnet oublié.",
  text: "Crée ton garage numérique et commence à suivre ta moto dès aujourd'hui.",
  cta: "Créer mon garage gratuitement",
};

export const FOOTER = {
  columns: [
    {
      title: "Produit",
      links: [
        { label: "Fonctionnalités", href: "#fonctionnalites" },
        { label: "Tarifs", href: "#tarifs" },
        { label: "Comment ça marche", href: "#comment" },
      ],
    },
    {
      title: "Assistance",
      links: [
        { label: "Contact", href: "mailto:contact@example.com" }, // lien temporaire
        { label: "Conditions", href: "#" }, // page à créer
        { label: "Confidentialité", href: "#" }, // page à créer
      ],
    },
  ],
  // Réseaux sociaux — liens temporaires, clairement identifiés (à remplacer)
  social: [
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "TikTok", href: "#" },
  ],
};
