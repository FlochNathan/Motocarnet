import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APIFY_ACTOR, APIFY_BASE, apifyInput, normalizeApifyPosts } from "@/lib/apify";
import type { CatalogTrack, TrackScrape } from "@/lib/types";

const STALE_MS = 2 * 60 * 60 * 1000; // re-scrape au plus toutes les 2 h
const STUCK_MS = 6 * 60 * 1000; // un run bloqué > 6 min est abandonné
const MAX_POSTS = 25;
const MAX_STARTS = 8; // limite de runs démarrés par appel (coût Apify)

type Supa = Awaited<ReturnType<typeof createClient>>;

/**
 * Rafraîchit les annonces des terrains du catalogue (par région).
 * Le scraping utilise la clé Apify du serveur (APIFY_TOKEN) : l'utilisateur
 * n'a rien à configurer. Asynchrone (start/poll/ingest), état partagé.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "non authentifié" }, { status: 401 });

  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) return NextResponse.json({ needsSetup: true, pending: 0, ingested: 0, errors: [] });

  const url = new URL(request.url);
  const region = url.searchParams.get("region");
  const force = url.searchParams.get("force") === "1";

  let query = supabase.from("track_catalog").select("*").eq("active", true).not("facebook_url", "is", null);
  if (region) query = query.eq("region", region);
  const { data: catalogRows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const catalog = catalogRows as CatalogTrack[];
  if (catalog.length === 0) return NextResponse.json({ pending: 0, ingested: 0, errors: [] });

  const ids = catalog.map((c) => c.id);
  const { data: stateRows } = await supabase.from("track_scrape").select("*").in("catalog_id", ids);
  const stateMap = new Map((stateRows as TrackScrape[] | null ?? []).map((s) => [s.catalog_id, s]));

  let ingested = 0;
  let pending = 0;
  let started = 0;
  const errors: { track: string; message: string }[] = [];
  const now = Date.now();

  for (const track of catalog) {
    const state = stateMap.get(track.id);
    try {
      // 1) Un run est en cours → on regarde s'il est terminé
      if (state?.scrape_run_id) {
        const startedAt = state.scrape_started_at ? new Date(state.scrape_started_at).getTime() : 0;
        if (now - startedAt > STUCK_MS) {
          await setState(supabase, track.id, { scrape_run_id: null, scrape_started_at: null });
        } else {
          const status = await runStatus(token, state.scrape_run_id);
          if (status.finished && status.datasetId) {
            const items = await fetchDataset(token, status.datasetId);
            await ingestPosts(supabase, track.id, items);
            await setState(supabase, track.id, {
              scrape_run_id: null,
              scrape_started_at: null,
              last_fetched_at: new Date().toISOString(),
            });
            ingested++;
          } else if (status.failed) {
            await setState(supabase, track.id, { scrape_run_id: null, scrape_started_at: null });
          } else {
            pending++;
          }
          continue;
        }
      }

      // 2) Pas de run → on en démarre un si les données sont périmées
      const last = state?.last_fetched_at ? new Date(state.last_fetched_at).getTime() : 0;
      if ((force || now - last > STALE_MS) && started < MAX_STARTS) {
        const runId = await startRun(token, track.facebook_url!);
        await setState(supabase, track.id, { scrape_run_id: runId, scrape_started_at: new Date().toISOString() });
        started++;
        pending++;
      }
    } catch (e) {
      errors.push({ track: track.name, message: e instanceof Error ? e.message : "erreur inconnue" });
    }
  }

  return NextResponse.json({ ingested, pending, errors, needsSetup: false });
}

// ------------------------------------------------------------
// Apify
// ------------------------------------------------------------
async function startRun(token: string, facebookUrl: string): Promise<string> {
  const res = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(apifyInput([facebookUrl], MAX_POSTS)),
  });
  if (res.status === 401) throw new Error("Jeton Apify (serveur) invalide");
  if (!res.ok) throw new Error(`Apify a refusé le démarrage (HTTP ${res.status})`);
  const json = (await res.json()) as { data?: { id?: string } };
  if (!json.data?.id) throw new Error("Réponse Apify inattendue");
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
// Base de données (état partagé + annonces)
// ------------------------------------------------------------
function setState(supabase: Supa, catalogId: string, patch: Partial<TrackScrape>) {
  return supabase.from("track_scrape").upsert({ catalog_id: catalogId, ...patch }, { onConflict: "catalog_id" });
}

async function ingestPosts(supabase: Supa, catalogId: string, rawItems: unknown[]) {
  const posts = normalizeApifyPosts(rawItems)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, MAX_POSTS);
  if (posts.length === 0) return;

  await supabase.from("track_posts").upsert(
    posts.map((p) => ({
      catalog_id: catalogId,
      title: p.title,
      content: p.content,
      link: p.link,
      image_url: p.image_url,
      published_at: p.published_at,
    })),
    { onConflict: "catalog_id,link", ignoreDuplicates: true },
  );

  const { data: old } = await supabase
    .from("track_posts")
    .select("id")
    .eq("catalog_id", catalogId)
    .order("published_at", { ascending: false })
    .range(MAX_POSTS, MAX_POSTS + 200);
  if (old && old.length > 0) {
    await supabase.from("track_posts").delete().in("id", old.map((o) => o.id));
  }
}
