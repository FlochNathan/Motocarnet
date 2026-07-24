"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Card, ChipGroup, EmptyState, ErrorText, PageHeader, Spinner, StatusPill } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { classifyWeekend, nextWeekend } from "@/lib/terrains";
import { formatDate, formatRelativeDate } from "@/lib/format";
import type { CatalogTrack, TerrainType, TrackPost, TrackScrape } from "@/lib/types";

interface RefreshResult {
  needsSetup: boolean;
  pending: number;
  ingested: number;
  errors: { track: string; message: string }[];
}

export default function TerrainsPage() {
  const [region, setRegion] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const retryRef = useRef(0);

  // Région mémorisée
  useEffect(() => {
    const saved = localStorage.getItem("mc-region");
    if (saved) setRegion(saved);
  }, []);

  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    let refresh: RefreshResult = { needsSetup: false, pending: 0, ingested: 0, errors: [] };
    if (region) {
      try {
        const res = await fetch(`/api/terrains/refresh?region=${encodeURIComponent(region)}`, { method: "POST" });
        if (res.ok) refresh = await res.json();
      } catch {
        /* hors ligne : dernières annonces connues */
      }
    }
    const [catalog, posts, scrape, terrains] = await Promise.all([
      sb.from("track_catalog").select("*").eq("active", true).order("region").order("name"),
      sb.from("track_posts").select("*").order("published_at", { ascending: false }),
      sb.from("track_scrape").select("*"),
      sb.from("terrain_types").select("*"),
    ]);
    return {
      catalog: must(catalog) as CatalogTrack[],
      posts: must(posts) as TrackPost[],
      scrape: must(scrape) as TrackScrape[],
      terrains: must(terrains) as TerrainType[],
      refresh,
    };
  }, [region]);

  // Rechargement auto tant que des annonces se récupèrent
  useEffect(() => {
    if (!data) return;
    if (data.refresh.pending > 0 && retryRef.current < 6) {
      retryRef.current += 1;
      const t = setTimeout(() => reload(), 12000);
      return () => clearTimeout(t);
    }
    if (data.refresh.pending === 0) retryRef.current = 0;
  }, [data, reload]);

  if (loading && !data) return (<><PageHeader title="Terrains" /><Spinner /></>);
  if (!data) return (<><PageHeader title="Terrains" /><Spinner /></>);

  const regionsPresent = [...new Set(data.catalog.map((t) => t.region))].sort();
  const effectiveRegion = region ?? regionsPresent[0] ?? null;
  const weekend = nextWeekend(new Date());
  const weekendLabel = `${formatDate(weekend.saturday)} – ${formatDate(weekend.sunday)}`;
  const terrainName = (id: number | null) => data.terrains.find((t) => t.id === id)?.name;
  const scrapeOf = (id: string) => data.scrape.find((s) => s.catalog_id === id);

  function pickRegion(r: string) {
    setRegion(r);
    localStorage.setItem("mc-region", r);
    retryRef.current = 0;
  }

  if (data.catalog.length === 0) {
    return (
      <>
        <PageHeader title="Terrains" />
        <EmptyState
          icon="🚩"
          title="Le catalogue est vide"
          text="Les terrains sont ajoutés par région depuis l'administration. Une fois ajoutés, choisissez votre région pour voir lesquels sont ouverts ce week-end."
        />
      </>
    );
  }

  const tracks = data.catalog.filter((t) => t.region === effectiveRegion);

  return (
    <>
      <PageHeader title="Terrains" />

      {/* Sélecteur de région */}
      <div className="mb-3">
        <ChipGroup
          options={regionsPresent.map((r) => ({ value: r, label: r }))}
          value={effectiveRegion}
          onChange={(v) => v && pickRegion(v as string)}
        />
      </div>

      <p className="mb-1 text-sm font-bold text-ink-dim">Week-end du {weekendLabel}</p>
      <p className="mb-4 text-xs text-ink-dim">
        Statut déduit automatiquement des annonces Facebook — vérifiez le post avant de prendre la route.
      </p>

      {data.refresh.needsSetup && (
        <ErrorText>
          La récupération automatique n&apos;est pas encore activée (clé Apify serveur manquante). Contactez l&apos;administrateur.
        </ErrorText>
      )}
      {data.refresh.pending > 0 && (
        <Card className="mb-3 flex items-center gap-3">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm font-semibold text-ink-dim">Récupération des annonces en cours… (30 à 60 s)</p>
        </Card>
      )}

      {tracks.length === 0 ? (
        <EmptyState icon="🏁" title="Aucun terrain dans cette région" text="Choisissez une autre région, ou demandez l'ajout de vos terrains à l'administrateur." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {tracks.map((track) => {
            const posts = data.posts.filter((p) => p.catalog_id === track.id);
            const verdict = classifyWeekend(posts, weekend);
            const isScraping = Boolean(scrapeOf(track.id)?.scrape_run_id);
            const isOpen = expandedId === track.id;

            return (
              <Card key={track.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{track.name}</p>
                    <p className="truncate text-xs text-ink-dim">
                      {[track.city, terrainName(track.terrain_type_id)].filter(Boolean).join(" • ") || track.region}
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

                {verdict.post && <HeroAnnouncement post={verdict.post} />}

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {posts.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isOpen ? null : track.id)}
                      className="inline-flex min-h-11 items-center rounded-2xl bg-surface-2 px-4 text-sm font-semibold"
                    >
                      {isOpen ? "Masquer" : `Annonces (${posts.length})`}
                    </button>
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
                </div>

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                    {posts.slice(0, 10).map((post) => (
                      <CompactAnnouncement key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-dim">
        Un terrain manque ?{" "}
        <Link href="/admin" className="font-semibold text-accent-strong">Ajoutez-le dans l&apos;administration</Link>.
      </p>
    </>
  );
}

// ------------------------------------------------------------
// Annonces (posts Facebook) — cartes illustrées
// ------------------------------------------------------------

/** Image de post qui se masque toute seule si l'URL Facebook a expiré */
function PostImage({ src, className }: { src: string; className: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setOk(false)} className={className} />;
}

function HeroAnnouncement({ post }: { post: TrackPost }) {
  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 block overflow-hidden rounded-2xl border border-border bg-surface-2"
    >
      {post.image_url && <PostImage src={post.image_url} className="h-36 w-full object-cover" />}
      <div className="p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink-dim">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1877f2] text-[9px] text-white" aria-hidden>f</span>
          Annonce Facebook • {formatRelativeDate(post.published_at)}
          <span className="ml-auto">Ouvrir ↗</span>
        </div>
        {(post.content || post.title) && (
          <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{post.content ?? post.title}</p>
        )}
      </div>
    </a>
  );
}

function CompactAnnouncement({ post }: { post: TrackPost }) {
  return (
    <a href={post.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-xl p-1.5 hover:bg-surface-2">
      {post.image_url ? (
        <PostImage src={post.image_url} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg" aria-hidden>📝</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-ink-dim">{formatRelativeDate(post.published_at)} ↗</p>
        <p className="line-clamp-2 text-sm leading-snug">{post.content ?? post.title ?? "(sans texte)"}</p>
      </div>
    </a>
  );
}
