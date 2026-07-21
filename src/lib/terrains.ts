// ============================================================
// Terrains : classification automatique ouvert/fermé du week-end
// à partir des posts Facebook (récupérés via Apify).
// ============================================================

/** Samedi et dimanche du week-end à venir (ou en cours) */
export function nextWeekend(today: Date): { saturday: string; sunday: string } {
  const d = new Date(today);
  const day = d.getDay(); // 0 = dimanche
  const toSaturday = day === 0 ? -1 : 6 - day; // un dimanche reste sur son week-end
  const sat = new Date(d);
  sat.setDate(d.getDate() + toSaturday);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { saturday: iso(sat), sunday: iso(sun) };
}

export type TrackStatus = "ouvert" | "ferme" | "inconnu";

// NB : « \b » ne marche pas après une lettre accentuée en JS → lookahead explicite
const CLOSED_PATTERNS = [
  /\bpas\s+ouvert/i,
  /\bferm(e|é|ée|és|ées|eture)(?![a-zà-ÿ])/i,
  /\bannul(é|ée|és|ées|ation)(?![a-zà-ÿ])/i,
  /\bclosed\b/i,
];

const OPEN_PATTERNS = [
  /\bouvert(e|s|es)?\b/i,
  /\bouverture\b/i,
  /\bouvre(nt)?\b/i,
  /\bopen\b/i,
  /\broulage\b/i,
];

/** Classe un texte de post : fermé prioritaire (les négations l'emportent) */
export function classifyText(text: string): TrackStatus {
  if (CLOSED_PATTERNS.some((p) => p.test(text))) return "ferme";
  if (OPEN_PATTERNS.some((p) => p.test(text))) return "ouvert";
  return "inconnu";
}

export interface WeekendVerdict<P> {
  status: TrackStatus;
  post: P | null;
}

/**
 * Statut du week-end : parmi les posts publiés du lundi précédent au dimanche
 * du week-end, le post concluant le plus récent l'emporte.
 */
export function classifyWeekend<P extends { content: string | null; title: string | null; published_at: string }>(
  posts: P[],
  weekend: { saturday: string; sunday: string },
): WeekendVerdict<P> {
  const sunday = new Date(weekend.sunday + "T23:59:59");
  const monday = new Date(weekend.saturday + "T00:00:00");
  monday.setDate(monday.getDate() - 5); // lundi précédant le samedi

  const relevant = posts
    .filter((p) => {
      const d = new Date(p.published_at);
      return d >= monday && d <= sunday;
    })
    .sort((a, b) => b.published_at.localeCompare(a.published_at));

  for (const post of relevant) {
    const status = classifyText(`${post.title ?? ""} ${post.content ?? ""}`);
    if (status !== "inconnu") return { status, post };
  }
  return { status: "inconnu", post: null };
}
