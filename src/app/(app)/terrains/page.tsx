"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, StatusPill } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { classifyWeekend, nextWeekend } from "@/lib/terrains";
import { formatDate } from "@/lib/format";
import type { TerrainType, Track, TrackPost } from "@/lib/types";

interface RefreshResult {
  needsToken: boolean;
  pending: number;
  ingested: number;
  errors: { track: string; message: string }[];
}

export default function TerrainsPage() {
  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    let refresh: RefreshResult = { needsToken: false, pending: 0, ingested: 0, errors: [] };
    try {
      const res = await fetch("/api/terrains/refresh", { method: "POST" });
      if (res.ok) refresh = await res.json();
    } catch {
      // hors ligne : on affiche les dernières annonces connues
    }
    const { data: userData } = await sb.auth.getUser();
    const [profile, tracks, posts, terrains] = await Promise.all([
      sb.from("profiles").select("apify_token").eq("id", userData.user!.id).single(),
      sb.from("tracks").select("*").order("created_at"),
      sb.from("track_posts").select("*").order("published_at", { ascending: false }),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      hasToken: Boolean((profile.data as { apify_token: string | null } | null)?.apify_token),
      tracks: must(tracks) as Track[],
      posts: must(posts) as TrackPost[],
      terrains: must(terrains) as TerrainType[],
      refresh,
    };
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);
  const [editToken, setEditToken] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const retryRef = useRef(0);

  // Le scraping Facebook est asynchrone : si des annonces sont en cours de
  // récupération, on recharge automatiquement quelques fois.
  useEffect(() => {
    if (!data) return;
    if (data.refresh.pending > 0 && retryRef.current < 5) {
      retryRef.current += 1;
      const t = setTimeout(() => reload(), 12000);
      return () => clearTimeout(t);
    }
    if (data.refresh.pending === 0) retryRef.current = 0;
  }, [data, reload]);

  if (loading || !data) return (<><PageHeader title="Terrains" /><Spinner /></>);

  const weekend = nextWeekend(new Date());
  const weekendLabel = `${formatDate(weekend.saturday)} – ${formatDate(weekend.sunday)}`;
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name;

  async function removeTrack(track: Track) {
    const supabase = createClient();
    await supabase.from("tracks").delete().eq("id", track.id);
    reload();
  }

  // Connexion Apify absente : on n'affiche que la configuration
  if (!data.hasToken || editToken) {
    return (
      <>
        <PageHeader title="Terrains" />
        <ApifySetup
          onDone={() => { setEditToken(false); reload(); }}
          onCancel={data.hasToken ? () => setEditToken(false) : undefined}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Terrains"
        action={
          <button
            onClick={() => setEditToken(true)}
            aria-label="Connexion Facebook"
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-surface-2"
          >
            ⚙️
          </button>
        }
      />
      <p className="mb-1 text-sm font-bold text-ink-dim">Week-end du {weekendLabel}</p>
      <p className="mb-4 text-xs text-ink-dim">
        Statut déduit automatiquement des annonces Facebook — vérifiez le post avant de prendre la route.
      </p>

      {data.refresh.pending > 0 && (
        <Card className="mb-3 flex items-center gap-3">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm font-semibold text-ink-dim">Récupération des annonces Facebook en cours… (30 à 60 s)</p>
        </Card>
      )}
      {data.refresh.errors.length > 0 && (
        <ErrorText>
          {data.refresh.errors[0].message.includes("Jeton")
            ? "Jeton Apify invalide — vérifiez-le via ⚙️."
            : `Souci de récupération : ${data.refresh.errors[0].message}`}
        </ErrorText>
      )}

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
          text="Ajoutez un terrain avec l'adresse de sa page Facebook : PitLog lira ses annonces et affichera OUVERT ou FERMÉ automatiquement chaque week-end."
          action={<Button onClick={() => setShowForm(true)}>Suivre mon premier terrain</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.tracks.map((track) => {
            const posts = data.posts.filter((p) => p.track_id === track.id);
            const verdict = classifyWeekend(posts, weekend);
            const isScraping = Boolean(track.scrape_run_id);
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
                  {isScraping && posts.length === 0 ? (
                    <Badge>⏳ …</Badge>
                  ) : (
                    <StatusPill
                      status={verdict.status === "ouvert" ? "ok" : verdict.status === "ferme" ? "overdue" : "none"}
                      label={verdict.status === "ouvert" ? "OUVERT" : verdict.status === "ferme" ? "FERMÉ" : "Pas d'annonce"}
                    />
                  )}
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
                  <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
                    {posts.slice(0, 8).map((post) => (
                      <a key={post.id} href={post.link} target="_blank" rel="noopener noreferrer" className="block">
                        <p className="text-xs font-bold text-ink-dim">{formatDate(post.published_at.slice(0, 10))} ↗</p>
                        <p className="line-clamp-3 text-sm">{post.content ?? post.title ?? "(sans texte)"}</p>
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
// Configuration de la connexion Facebook (jeton Apify)
// ------------------------------------------------------------
function ApifySetup({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    if (token.trim().length < 20) {
      setError("Le jeton semble incomplet. Copiez-le en entier depuis Apify.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ apify_token: token.trim() })
      .eq("id", userData.user!.id);
    setBusy(false);
    if (saveError) {
      setError("Enregistrement impossible. Avez-vous exécuté la migration 0007_apify.sql ?");
      return;
    }
    onDone();
  }

  async function disconnect() {
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ apify_token: null }).eq("id", userData.user!.id);
    setBusy(false);
    onDone();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🔌</span>
        <h2 className="text-lg font-extrabold">Connexion Facebook</h2>
      </div>
      <p className="text-sm leading-relaxed text-ink-dim">
        Pour lire automatiquement les annonces des terrains, PitLog utilise Apify (gratuit pour un usage perso).
        Une seule configuration, puis chaque terrain fonctionne avec juste son adresse Facebook.
      </p>
      <ol className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-4 py-3 text-sm">
        <li>1. Créez un compte gratuit sur <a href="https://console.apify.com/sign-up" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">apify.com</a></li>
        <li>2. Ouvrez <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">Settings → Integrations</a></li>
        <li>3. Copiez votre <strong>Personal API token</strong> et collez-le ci-dessous.</li>
      </ol>
      <Field label="Jeton API Apify">
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="apify_api_xxxxxxxxxxxxxxxxxxxx"
          autoComplete="off"
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Connecter"}</Button>
      {onCancel && (
        <>
          <Button variant="secondary" onClick={onCancel}>Annuler</Button>
          <button onClick={disconnect} disabled={busy} className="min-h-11 text-sm font-semibold text-danger">
            Déconnecter Apify
          </button>
        </>
      )}
    </Card>
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
  const [terrainId, setTerrainId] = useState(initial?.terrain_type_id != null ? String(initial.terrain_type_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function isFacebookUrl(url: string): boolean {
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      return /(^|\.)facebook\.com$|(^|\.)fb\.com$/i.test(u.hostname) && u.pathname.length > 1;
    } catch {
      return false;
    }
  }

  async function save() {
    setError("");
    if (!name.trim()) {
      setError("Donnez un nom au terrain.");
      return;
    }
    if (!facebookUrl.trim() || !isFacebookUrl(facebookUrl.trim())) {
      setError("Indiquez l'adresse de la page Facebook (ex : facebook.com/nom-du-terrain).");
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(facebookUrl.trim()) ? facebookUrl.trim() : `https://${facebookUrl.trim()}`;
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      name: name.trim(),
      city: city.trim() || null,
      facebook_url: normalizedUrl,
      terrain_type_id: terrainId ? Number(terrainId) : null,
      // Nouvelle URL → re-scraping au prochain chargement
      last_fetched_at: null,
      scrape_run_id: null,
    };
    const { error: saveError } = initial
      ? await supabase.from("tracks").update(payload).eq("id", initial.id)
      : await supabase.from("tracks").insert({ ...payload, user_id: userData.user!.id });
    setBusy(false);
    if (saveError) {
      setError("Enregistrement impossible. Avez-vous exécuté les migrations 0006 et 0007 ?");
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
      <Field label="Page Facebook du terrain" hint="Ses annonces seront lues automatiquement.">
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
      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>
        {busy ? "Enregistrement…" : initial ? "Enregistrer" : "Suivre ce terrain"}
      </Button>
      <Button size="md" variant="secondary" onClick={onCancel}>Annuler</Button>
    </Card>
  );
}
