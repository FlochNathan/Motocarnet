"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND, HERO, PREVIEW } from "@/lib/landing";
import Moto3DStage from "./Moto3DStage";

export default function HomeHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const base = `transition-all duration-700 ease-out ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;
  const d = (delay: number) => ({ transitionDelay: `${mounted ? delay : 0}ms` });

  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:min-h-[92vh] md:pt-32" aria-labelledby="hero-title">
      {/* Halo ambré derrière la moto */}
      <div
        className="pointer-events-none absolute right-[-10%] top-[10%] h-[70vh] w-[70vh] rounded-full blur-[120px] md:right-0"
        style={{ background: `radial-gradient(circle, ${BRAND.accent}33, transparent 65%)` }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 md:grid-cols-2">
        {/* Colonne commerciale — s'affiche immédiatement (SEO + perf) */}
        <div className="order-1">
          <div className={base} style={d(0)}>
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} />
              {BRAND.name} — carnet numérique moto
            </span>
          </div>

          <h1 id="hero-title" className={`mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl ${base}`} style={d(80)}>
            {HERO.title[0]}
            <br />
            <span style={{ color: BRAND.accent }}>{HERO.title[1]}</span>
          </h1>

          <p className={`mt-6 max-w-lg text-lg leading-relaxed text-white/70 ${base}`} style={d(160)}>{HERO.subtitle}</p>

          <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${base}`} style={d(240)}>
            <Link
              href={BRAND.links.signup}
              className="rounded-full px-7 py-4 text-center text-base font-semibold text-black transition-transform duration-200 hover:scale-[1.03]"
              style={{ background: BRAND.accent }}
            >
              {HERO.primaryCta}
            </Link>
            <a
              href={BRAND.links.features}
              className="rounded-full border border-white/15 bg-white/5 px-7 py-4 text-center text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              {HERO.secondaryCta}
            </a>
          </div>

          <p className={`mt-4 flex items-center gap-2 text-sm text-white/50 ${base}`} style={d(300)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            {HERO.reassurance}
          </p>

          <ul className={`mt-8 flex flex-wrap gap-x-6 gap-y-2 ${base}`} style={d(360)}>
            {HERO.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm font-medium text-white/70">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 3D — décorative, sous le texte sur mobile */}
        <div className="relative order-2 h-[46vh] min-h-[320px] w-full md:h-[68vh]">
          <div className={`h-full w-full ${mounted ? "opacity-100" : "opacity-0"} transition-opacity duration-1000`}>
            <Moto3DStage />
          </div>

          {/* Éléments d'interface flottants (données fictives) */}
          <FloatingCard className="left-2 top-4 md:left-0" label="Heures moteur" value={PREVIEW.engineHours} />
          <FloatingCard className="bottom-6 right-2 md:right-0" label="Prochaine vidange" value={`dans ${PREVIEW.nextOil}`} accent />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({ className, label, value, accent }: { className?: string; label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`absolute hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md sm:block ${className ?? ""}`}
      aria-hidden
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-0.5 text-lg font-bold" style={{ color: accent ? BRAND.accent : "#fff" }}>{value}</p>
    </div>
  );
}
