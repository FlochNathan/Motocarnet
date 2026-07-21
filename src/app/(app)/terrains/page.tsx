"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, StatusPill } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { classifyWeekend, facebookEmbedUrl, nextWeekend } from "@/lib/terrains";
import { formatDate } from "@/lib/format";
import type { TerrainType, Track, TrackPost } from "@/lib/types";

export default function TerrainsPage() {
  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    // Rafraîchit les éventuels flux RSS périmés (badge automatique), puis lit les données
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
      <PageHeader title="Terrains" />
      <p className="mb-1 text-sm font-bold text-ink-dim">Week-end du {weekendLabel}</p>
      <p className="mb-4 text-xs text-ink-dim">
        Les annonces Facebook de vos terrains, directement dans PitLog.
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
          text="Collez simplement l'adresse de la page Facebook de votre terrain : ses annonces d'ouverture s'afficheront ici, chaque week-end, sans quitter l'app."
          action={<Button onClick={() => setShowForm(true)}>Suivre mon premier terrain</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.tracks.map((track) => {
            const posts = data.posts.filter((p) => p.track_id === track.id);
            const hasAutoBadge = Boolean(track.feed_url);
            const verdict = hasAutoBadge ? classifyWeekend(posts, weekend) : null;
            const embedUrl = facebookEmbedUrl(track.facebook_url);
            const isOpen = expanded === track.id;

            return (
              <Card key={track.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{track.name}</p>
                    <p className="truncate text-xs text-ink-dim">
                      {[track.city, terrainName(track.terrain_type_id)].filter(Boolean).join(" • ") || "Page Facebook suivie"}
                    </p>
                  </div>
                  {verdict && (
                    <StatusPill
                      status={verdict.status === "ouvert" ? "ok" : verdict.status === "ferme" ? "overdue" : "none"}
                      label={verdict.status === "ouvert" ? "OUVERT" : verdict.status === "ferme" ? "FERMÉ" : "Pas d'annonce"}
                    />
                  )}
                </div>

                {verdict?.post && (
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
                  {embedUrl && (
                    <Button size="sm" onClick={() => setExpanded(isOpen ? null : track.id)}>
                      {isOpen ? "Masquer les annonces" : "📰 Voir les annonces"}
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
                    confirmText={`« ${track.name} » sera retiré de vos terrains suivis.`}
                    onConfirm={() => removeTrack(track)}
                  />
                </div>

                {/* Fil Facebook intégré (widget officiel — chargé seulement une fois déplié) */}
                {isOpen && embedUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-border">
                    <iframe
                      src={embedUrl}
                      title={`Annonces Facebook — ${track.name}`}
                      className="h-[560px] w-full"
                      style={{ border: "none" }}
                      scrolling="yes"
                      allow="encrypted-media"
                      loading="lazy"
                    />
                    <p className="border-t border-border bg-surface-2 px-3 py-2 text-xs text-ink-dim">
                      Fil affiché par Facebook. S'il reste vide, la page bloque l'intégration — utilisez le bouton « Facebook ↗ ».
                    </p>
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
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initial?.feed_url));
  const [terrainId, setTerrainId] = useState(initial?.terrain_type_id != null ? String(initial.terrain_type_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    if (!name.trim()) {
      setError("Donnez un nom au terrain.");
      return;
    }
    if (facebookUrl.trim() && facebookEmbedUrl(facebookUrl) === null) {
      setError("Cette adresse ne ressemble pas à une page Facebook (attendu : facebook.com/nom-du-terrain).");
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
      <Field label="Page Facebook du terrain" hint="Ses annonces s'afficheront directement dans PitLog.">
        <Input inputMode="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="facebook.com/votre-terrain" />
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

      {!showAdvanced ? (
        <button type="button" onClick={() => setShowAdvanced(true)} className="self-start text-sm font-semibold text-accent">
          ⚙️ Badge OUVERT/FERMÉ automatique (avancé)
        </button>
      ) : (
        <Field
          label="Flux RSS de la page (badge automatique)"
          hint="Facultatif. Créez le flux sur rss.app en collant l'URL Facebook, puis copiez ici l'URL générée : PitLog analysera les posts et affichera OUVERT/FERMÉ tout seul."
        >
          <Input inputMode="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://rss.app/feeds/….xml" />
        </Field>
      )}

      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>
        {busy ? "Enregistrement…" : initial ? "Enregistrer" : "Suivre ce terrain"}
      </Button>
      <Button size="md" variant="secondary" onClick={onCancel}>Annuler</Button>
    </Card>
  );
}
