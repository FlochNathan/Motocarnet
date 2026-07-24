"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BRAND, HERO, PREVIEW } from "@/lib/landing";
import Moto3DStage from "./Moto3DStage";
import { scrollState } from "./scrollState";

export default function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Suivi du défilement du hero → pilote la scène 3D + le fondu du texte
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      scrollState.heroProgress = p;
      setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => (scrollState.heroVisible = e.isIntersecting), { threshold: 0 });
    io.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const base = `transition-all duration-700 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;
  const d = (delay: number) => ({ transitionDelay: `${mounted ? delay : 0}ms` });

  // Le texte s'efface doucement au fur et à mesure du défilement
  const textFade = reduced ? 1 : Math.max(0, 1 - progress * 1.6);
  // La légende « vue éclatée » apparaît quand les pièces s'écartent
  const captionOpacity = reduced ? 0 : Math.max(0, Math.min(1, (progress - 0.3) / 0.22)) * Math.max(0, Math.min(1, (0.98 - progress) / 0.1));
  const tall = reduced ? "" : "h-[200vh]"; // hauteur de défilement pour l'effet épinglé

  return (
    <section ref={sectionRef} className={`relative ${tall}`} aria-labelledby="hero-title">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        {/* Moto 3D plein écran (décorative, ne bloque pas le défilement) */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="pointer-events-none absolute right-[-20%] top-1/2 h-[80vh] w-[80vh] -translate-y-1/2 rounded-full blur-[130px]"
            style={{ background: `radial-gradient(circle, ${BRAND.accent}33, transparent 65%)` }}
            aria-hidden
          />
          <div className={`h-full w-full transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
            <Moto3DStage />
          </div>
        </div>

        {/* Voiles pour la lisibilité du texte */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#f4f3f1] via-[#f4f3f1]/70 to-transparent md:via-[#f4f3f1]/40" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f4f3f1] to-transparent" aria-hidden />

        {/* Contenu commercial */}
        <div className="relative mx-auto w-full max-w-6xl px-5" style={{ opacity: textFade }}>
          <div className="max-w-xl">
            <span className={`inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.035] px-3 py-1 text-xs font-semibold text-black/60 ${base}`} style={d(0)}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} />
              {BRAND.name} — carnet numérique moto
            </span>

            <h1 id="hero-title" className={`mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#141414] sm:text-6xl md:text-7xl ${base}`} style={d(80)}>
              {HERO.title[0]}
              <br />
              <span style={{ color: "#a86400" }}>{HERO.title[1]}</span>
            </h1>

            <p className={`mt-6 max-w-lg text-lg leading-relaxed text-black/60 ${base}`} style={d(160)}>{HERO.subtitle}</p>

            <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${base}`} style={d(240)}>
              <Link
                href={BRAND.links.signup}
                className="rounded-full px-7 py-4 text-center text-base font-semibold text-black shadow-lg transition-transform duration-200 hover:scale-[1.03]"
                style={{ background: BRAND.accent, boxShadow: `0 10px 40px ${BRAND.accent}40` }}
              >
                {HERO.primaryCta}
              </Link>
              <a
                href={BRAND.links.features}
                className="rounded-full border border-black/10 bg-black/[0.035] px-7 py-4 text-center text-base font-semibold text-[#141414] backdrop-blur-sm transition-colors duration-200 hover:bg-black/[0.05]"
              >
                {HERO.secondaryCta}
              </a>
            </div>

            <p className={`mt-4 flex items-center gap-2 text-sm text-black/45 ${base}`} style={d(300)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              {HERO.reassurance}
            </p>

            <ul className={`mt-8 flex flex-wrap gap-x-6 gap-y-2 ${base}`} style={d(360)}>
              {HERO.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm font-medium text-black/60">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Cartes flottantes (données fictives) */}
          <FloatingCard className="right-5 top-[18%] hidden lg:block" label="Heures moteur" value={PREVIEW.engineHours} />
          <FloatingCard className="bottom-[22%] right-[12%] hidden lg:block" label="Prochaine vidange" value={`dans ${PREVIEW.nextOil}`} accent />
        </div>

        {/* Légende de la vue éclatée */}
        {!reduced && (
          <div
            className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 px-5 text-center"
            style={{ opacity: captionOpacity }}
            aria-hidden
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#a86400" }}>Anatomie complète</p>
            <p className="mt-2 text-lg font-semibold text-[#141414] sm:text-xl">
              Roues · Fourche · Échappement · Chaîne · Bras oscillant
            </p>
            <p className="mt-1 text-sm text-black/55">Chaque pièce suivie, entretenue, historisée.</p>
          </div>
        )}

        {/* Indicateur de défilement */}
        {!reduced && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2" style={{ opacity: textFade }} aria-hidden>
            <div className="flex h-9 w-6 items-start justify-center rounded-full border border-black/15 p-1.5">
              <span className="h-2 w-1 animate-bounce rounded-full bg-black/40" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FloatingCard({ className, label, value, accent }: { className?: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`absolute rounded-2xl border border-black/[0.08] bg-white px-4 py-3 backdrop-blur-md ${className ?? ""}`} aria-hidden>
      <p className="text-[11px] font-medium uppercase tracking-wide text-black/45">{label}</p>
      <p className="mt-0.5 text-lg font-bold" style={{ color: accent ? "#a86400" : "#141414" }}>{value}</p>
    </div>
  );
}
