import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRss } from "@/lib/terrains";
import type { Track } from "@/lib/types";

/** Durée de fraîcheur d'un flux avant nouveau téléchargement */
const STALE_MS = 2 * 60 * 60 * 1000;
const MAX_POSTS = 30;

/** Rafraîchit les flux RSS des terrains suivis de l'utilisateur connecté */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "non authentifié" }, { status: 401 });

  const force = new URL(request.url).searchParams.get("force") === "1";

  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("*")
    .not("feed_url", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const stale = (tracks as Track[]).filter(
    (t) => force || !t.last_fetched_at || now - new Date(t.last_fetched_at).getTime() > STALE_MS,
  );

  let refreshed = 0;
  const errors: { track: string; message: string }[] = [];

  for (const track of stale) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(track.feed_url!, {
        signal: controller.signal,
        headers: { "user-agent": "PitLog/1.0 (lecteur RSS)" },
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`flux HTTP ${response.status}`);

      const items = parseRss(await response.text())
        .sort((a, b) => b.published_at.localeCompare(a.published_at))
        .slice(0, MAX_POSTS);

      if (items.length > 0) {
        const { error: upsertError } = await supabase.from("track_posts").upsert(
          items.map((item) => ({
            user_id: user.id,
            track_id: track.id,
            title: item.title,
            content: item.content,
            link: item.link,
            published_at: item.published_at,
          })),
          { onConflict: "track_id,link", ignoreDuplicates: true },
        );
        if (upsertError) throw new Error(upsertError.message);

        // Ne conserve que les MAX_POSTS plus récents
        const { data: old } = await supabase
          .from("track_posts")
          .select("id")
          .eq("track_id", track.id)
          .order("published_at", { ascending: false })
          .range(MAX_POSTS, MAX_POSTS + 100);
        if (old && old.length > 0) {
          await supabase.from("track_posts").delete().in("id", old.map((o) => o.id));
        }
      }

      await supabase.from("tracks").update({ last_fetched_at: new Date().toISOString() }).eq("id", track.id);
      refreshed++;
    } catch (e) {
      errors.push({
        track: track.name,
        message: e instanceof Error ? (e.name === "AbortError" ? "délai dépassé" : e.message) : "erreur inconnue",
      });
    }
  }

  return NextResponse.json({ refreshed, skipped: tracks.length - stale.length, errors });
}
