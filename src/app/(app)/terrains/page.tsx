"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, StatusPill } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { classifyWeekend, nextWeekend } from "@/lib/terrains";
import { formatDate } from "@/lib/format";
import type { TerrainType, Track, TrackPost } from "@/lib/types";

export default function TerrainsPage() {
  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    // Rafraîchit d'abord les flux périmés côté serveur, puis lit les données
    try {
      await fetch("/api/terrains/refresh", { method: "POST" });
    } catch {
      // hors ligne : on affiche les derniers posts connus
    }
    const [tracks, posts, terrains] = await Promise.all([
      sb.from("tracks").select("*").order("created_at"),
      sb.from("track_posts").select("*").order("published_at", { ascending: false }),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      tracks: must(tracks) as Track[],
      posts: must(posts) as TrackPost[],
      terrains: must(terrains) as TerrainType[],
    };
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshNow() {
    setRefreshing(true);
    try {
      await fetch("/api/terrains/refresh?force=1", { method: "POST" });
    } finally {
      setRefreshing(false);
      reload();
    }
  }

  async function removeTrack(track: Track) {
    const supabase = createClient();
    await supabase.from("tracks").delete().eq("id", track.id);
    reload();
  }

  if (loading || !data) return (<><PageHeader title="Terrains" /><Spinner /></>);

  const weekend = nextWeekend(new Date());
  const weekendLabel = `${formatDate(weekend.saturday)} – ${formatDate(weekend.sunday)}`;
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Terrains"
        action={
          data.tracks.length > 0 ? (
            <button
              onClick={refreshNow}
              disabled={refreshing}
              aria-label="Actualiser les annonces"
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl hover:bg-surface-2 disabled:opacity-40"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            </button>
          ) : undefined
        }
      />
      <p className="mb-1 text-sm font-bold text-ink-dim">Week-end du {weekendLabel}</p>
      <p className="mb-4 text-xs text-ink-dim">
        Statut déduit automatiquement des annonces Facebook — vérifiez le post avant de prendre la route.
      </p>

      {!showForm && !editing && (
        <Button className="mb-4" onClick={() => setShowForm(true)}>＋ Suivre un terrain</Button>
      )}
      {(showForm || editing) && (
        <TrackForm
          terrains={data.terrains}
          initial={editing}
          onDone={() => { setShowForm(false); setEditing(null); reload(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {data.tracks.length === 0 && !showForm ? (
        <EmptyState
          icon="🚩"
          title="Aucun terrain suivi"
          text="1. Trouvez la page Facebook de votre terrain. 2. Créez son flux RSS (gratuit, ex : rss.app). 3. Ajoutez le terrain ici : chaque week-end, PitLog lira ses annonces et affichera OUVERT ou FERMÉ automatiquement."
          action={<Button onClick={() => setShowForm(true)}>Suivre mon premier terrain</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.tracks.map((track) => {
            const posts = data.posts.filter((p) => p.track_id === track.id);
            const verdict = classifyWeekend(posts, weekend);
            const pill =
              verdict.status === "ouvert"
                ? { status: "ok" as const, label: "OUVERT" }
                : verdict.status === "ferme"
                  ? { status: "overdue" as const, label: "FERMÉ" }
                  : { status: "none" as const, label: "Pas d'annonce" };
            const isOpen = expanded === track.id;

            return (
              <Card key={track.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{track.name}</p>
                    <p className="truncate text-xs text-ink-dim">
                      {[track.city, terrainName(track.terrain_type_id)].filter(Boolean).join(" • ") || "—"}
                      {!track.feed_url && " • pas de flux RSS"}
                    </p>
                  </div>
                  <StatusPill status={pill.status} label={pill.label} />
                </div>

                {verdict.post && (
                  <a
                    href={verdict.post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <p className="text-xs font-bold text-ink-dim">
                      Annonce du {formatDate(verdict.post.published_at.slice(0, 10))} ↗
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-sm">{verdict.post.content ?? verdict.post.title}</p>
                  </a>
                )}

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {posts.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => setExpanded(isOpen ? null : track.id)}>
                      {isOpen ? "Masquer" : `Annonces (${posts.length})`}
                    </Button>
                  )}
                  {track.facebook_url && (
                    <a
                      href={track.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 text-sm font-semibold shadow-[var(--shadow-card)]"
                    >
                      Facebook ↗
                    </a>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(track); setShowForm(false); }}>
                    Modifier
                  </Button>
                  <ConfirmButton
                    label="✕"
                    size="sm"
                    confirmTitle="Ne plus suivre ce terrain ?"
                    confirmText={`« ${track.name} » et ses annonces enregistrées seront supprimés.`}
                    onConfirm={() => removeTrack(track)}
                  />
                </div>

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                    {posts.slice(0, 8).map((post) => (
                      <a key={post.id} href={post.link} target="_blank" rel="noopener noreferrer" className="block">
                        <p className="text-xs font-bold text-ink-dim">{formatDate(post.published_at.slice(0, 10))} ↗</p>
                        <p className="line-clamp-2 text-sm">{post.content ?? post.title ?? "(sans texte)"}</p>
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Ajout / modification d'un terrain suivi
// ------------------------------------------------------------
function TrackForm({
  terrains,
  initial,
  onDone,
  onCancel,
}: {
  terrains: TerrainType[];
  initial: Track | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [facebookUrl, setFacebookUrl] = useState(initial?.facebook_url ?? "");
  const [feedUrl, setFeedUrl] = useState(initial?.feed_url ?? "");
  const [terrainId, setTerrainId] = useState(initial?.terrain_type_id != null ? String(initial.terrain_type_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    if (!name.trim()) {
      setError("Donnez un nom au terrain.");
      return;
    }
    if (feedUrl.trim() && !/^https?:\/\//i.test(feedUrl.trim())) {
      setError("L'URL du flux RSS doit commencer par https://");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      name: name.trim(),
      city: city.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      feed_url: feedUrl.trim() || null,
      terrain_type_id: terrainId ? Number(terrainId) : null,
      // Nouveau flux : re-téléchargement immédiat au prochain chargement
      last_fetched_at: null,
    };
    const { error: saveError } = initial
      ? await supabase.from("tracks").update(payload).eq("id", initial.id)
      : await supabase.from("tracks").insert({ ...payload, user_id: userData.user!.id });
    setBusy(false);
    if (saveError) {
      setError("Enregistrement impossible. Avez-vous exécuté la migration 0006_terrains.sql ?");
      return;
    }
    onDone();
  }

  return (
    <Card className="mb-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">
        {initial ? `Modifier — ${initial.name}` : "Suivre un terrain"}
      </h2>
      <Field label="Nom du terrain">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : MX Park Romagné" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville (facultatif)">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="—" />
        </Field>
        <Field label="Type de terrain">
          <Select value={terrainId} onChange={(e) => setTerrainId(e.target.value)}>
            <option value="">—</option>
            {terrains.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Page Facebook (facultatif)">
        <Input inputMode="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/votreterrain" />
      </Field>
      <Field
        label="Flux RSS de la page (pour le statut automatique)"
        hint="Créez-le en 2 min sur rss.app : collez l'URL de la page Facebook, puis copiez ici l'URL du flux généré (…/feed.xml)."
      >
        <Input inputMode="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://rss.app/feeds/….xml" />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>
        {busy ? "Enregistrement…" : initial ? "Enregistrer" : "Suivre ce terrain"}
      </Button>
      <Button size="md" variant="secondary" onClick={onCancel}>Annuler</Button>
    </Card>
  );
}
