// ============================================================
// Apify — récupération des posts d'une page Facebook publique.
// Le scraping tourne sur les serveurs Apify (compte de l'utilisateur,
// son jeton API). Ici : uniquement des fonctions pures (URLs, entrée
// de l'acteur, normalisation des résultats) — les appels réseau sont
// dans la route serveur.
// ============================================================

/** Acteur Apify « Facebook Posts Scraper » (id avec ~ dans les URLs) */
export const APIFY_ACTOR = "apify~facebook-posts-scraper";
export const APIFY_BASE = "https://api.apify.com/v2";

export interface NormalizedPost {
  title: string | null;
  content: string | null;
  link: string;
  published_at: string; // ISO
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

/** Convertit une date Apify (ISO, ou timestamp Unix en s/ms) en ISO */
export function toIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // secondes vs millisecondes
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Entrée de l'acteur Apify pour une ou plusieurs pages Facebook */
export function apifyInput(urls: string[], resultsLimit = 20) {
  return {
    startUrls: urls.map((url) => ({ url })),
    resultsLimit,
  };
}

/** Normalise les items renvoyés par le dataset Apify en posts exploitables */
export function normalizeApifyPosts(items: unknown[]): NormalizedPost[] {
  const out: NormalizedPost[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const link = firstString(o.url, o.postUrl, o.link, o.facebookUrl, o.permalink, o.topLevelUrl);
    if (!link) continue;
    const published = toIso(o.time ?? o.date ?? o.publishedTime ?? o.timestamp ?? o.pubDate ?? o.creation_time);
    if (!published) continue;
    const content = firstString(o.text, o.message, o.postText, o.content, o.caption, o.title);
    const title = firstString(o.title);
    out.push({ title, content, link, published_at: published });
  }
  return out;
}
