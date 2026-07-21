import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APIFY_ACTOR, APIFY_BASE, apifyInput, normalizeApifyPosts } from "@/lib/apify";
import type { Track } from "@/lib/types";

const STALE_MS = 2 * 60 * 60 * 1000; // re-scrape au plus toutes les 2 h
const STUCK_MS = 6 * 60 * 1000; // un run bloqué > 6 min est abandonné
const MAX_POSTS = 25;

/**
 * Rafraîchit les annonces des terrains via Apify (scraping Facebook).
 * Fonctionne en asynchrone pour rester dans les limites du serverless :
 *  - démarre un run pour les terrains périmés (retour immédiat) ;
 *  - au chargement suivant, ingère les runs terminés.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "non authentifié" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("apify_token").eq("id", user.id).single();
  const token = (profile as { apify_token: string | null } | null)?.apify_token?.trim();
  if (!token) return NextResponse.json({ needsToken: true, ingested: 0, pending: 0, errors: [] });

  const force = new URL(request.url).searchParams.get("force") === "1";

  const { data: rows, error } = await supabase.from("tracks").select("*").not("facebook_url", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tracks = rows as Track[];

  let ingested = 0;
  let pending = 0;
  const errors: { track: string; message: string }[] = [];
  const now = Date.now();

  for (const track of tracks) {
    try {
      // 1) Un run est en cours pour ce terrain → on regarde s'il est fini
      if (track.scrape_run_id) {
        const started = track.scrape_started_at ? new Date(track.scrape_started_at).getTime() : 0;
        if (now - started > STUCK_MS) {
          await clearRun(supabase, track.id);
        } else {
          const status = await runStatus(token, track.scrape_run_id);
          if (status.finished && status.datasetId) {
            const items = await fetchDataset(token, status.datasetId);
            await ingestPosts(supabase, user.id, track.id, items);
            await supabase
              .from("tracks")
              .update({ scrape_run_id: null, scrape_started_at: null, last_fetched_at: new Date().toISOString() })
              .eq("id", track.id);
            ingested++;
          } else if (status.failed) {
            await clearRun(supabase, track.id);
          } else {
            pending++;
          }
          continue;
        }
      }

      // 2) Pas de run en cours → on en démarre un si les données sont périmées
      const last = track.last_fetched_at ? new Date(track.last_fetched_at).getTime() : 0;
      if (force || now - last > STALE_MS) {
        const runId = await startRun(token, track.facebook_url!);
        await supabase
          .from("tracks")
          .update({ scrape_run_id: runId, scrape_started_at: new Date().toISOString() })
          .eq("id", track.id);
        pending++;
      }
    } catch (e) {
      errors.push({ track: track.name, message: e instanceof Error ? e.message : "erreur inconnue" });
    }
  }

  return NextResponse.json({ ingested, pending, errors, needsToken: false });
}

// ------------------------------------------------------------
// Appels Apify
// ------------------------------------------------------------
async function startRun(token: string, facebookUrl: string): Promise<string> {
  const res = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(apifyInput([facebookUrl], MAX_POSTS)),
  });
  if (res.status === 401) throw new Error("Jeton Apify invalide");
  if (!res.ok) throw new Error(`Apify a refusé le démarrage (HTTP ${res.status})`);
  const json = (await res.json()) as { data?: { id?: string } };
  if (!json.data?.id) throw new Error("Réponse Apify inattendue au démarrage");
  return json.data.id;
}

async function runStatus(token: string, runId: string): Promise<{ finished: boolean; failed: boolean; datasetId?: string }> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
  if (!res.ok) return { finished: false, failed: true };
  const json = (await res.json()) as { data?: { status?: string; defaultDatasetId?: string } };
  const status = json.data?.status;
  return {
    finished: status === "SUCCEEDED",
    failed: status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT",
    datasetId: json.data?.defaultDatasetId,
  };
}

async function fetchDataset(token: string, datasetId: string): Promise<unknown[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&clean=true&limit=${MAX_POSTS}`);
  if (!res.ok) throw new Error(`Lecture des résultats impossible (HTTP ${res.status})`);
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

// ------------------------------------------------------------
// Base de données
// ------------------------------------------------------------
async function ingestPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trackId: string,
  rawItems: unknown[],
) {
  const posts = normalizeApifyPosts(rawItems)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, MAX_POSTS);
  if (posts.length === 0) return;

  await supabase.from("track_posts").upsert(
    posts.map((p) => ({
      user_id: userId,
      track_id: trackId,
      title: p.title,
      content: p.content,
      link: p.link,
      published_at: p.published_at,
    })),
    { onConflict: "track_id,link", ignoreDuplicates: true },
  );

  // Ne conserve que les MAX_POSTS plus récents
  const { data: old } = await supabase
    .from("track_posts")
    .select("id")
    .eq("track_id", trackId)
    .order("published_at", { ascending: false })
    .range(MAX_POSTS, MAX_POSTS + 200);
  if (old && old.length > 0) {
    await supabase.from("track_posts").delete().in("id", old.map((o) => o.id));
  }
}

function clearRun(supabase: Awaited<ReturnType<typeof createClient>>, trackId: string) {
  return supabase.from("tracks").update({ scrape_run_id: null, scrape_started_at: null }).eq("id", trackId);
}
