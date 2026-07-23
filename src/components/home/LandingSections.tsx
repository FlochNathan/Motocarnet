import Link from "next/link";
import { BRAND, BUDGET, BENEFITS, FINAL_CTA, FOOTER, HISTORY, MAINTENANCE, PREVIEW, TIMING } from "@/lib/landing";
import Reveal from "./Reveal";
import ThreeFallback from "./ThreeFallback";

const accent = BRAND.accent;

function SectionHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-white/60">{text}</p>}
    </div>
  );
}

const cardCls = "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm";

// ------------------------------------------------------------
// 3. Aperçu du produit — tableau de bord premium (données fictives)
// ------------------------------------------------------------
export function ProductPreview() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <SectionHeading eyebrow="Aperçu" title="Ton tableau de bord, en un coup d'œil" text="Un aperçu de démonstration — chiffres fictifs." />
      </Reveal>
      <Reveal delay={100} variant="scale">
        <div className={`mt-10 ${cardCls} p-5 sm:p-8`}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Heures moteur" value={PREVIEW.engineHours} />
            <Stat label="Prochaine vidange" value={`dans ${PREVIEW.nextOil}`} accent />
            <Stat label="Budget du mois" value={PREVIEW.monthBudget} />
            <Stat label="Meilleur tour" value={PREVIEW.bestLap} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
              <span className="text-sm text-white/60">État de la chaîne</span>
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {PREVIEW.chain}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border px-5 py-4" style={{ borderColor: `${accent}55`, background: `${accent}12` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              <span className="text-sm font-medium text-white/90">{PREVIEW.notification}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Stat({ label, value, accent: isAccent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: isAccent ? accent : "#fff" }}>{value}</p>
    </div>
  );
}

// ------------------------------------------------------------
// 4. Entretien
// ------------------------------------------------------------
export function MaintenanceSection() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal variant="left">
          <SectionHeading eyebrow="Entretien" title={MAINTENANCE.title} text={MAINTENANCE.text} />
        </Reveal>
        <Reveal delay={100} variant="right">
          <ul className={`${cardCls} divide-y divide-white/10 p-2`}>
            {MAINTENANCE.timeline.map((item) => (
              <li key={item.label} className="flex items-center gap-4 px-4 py-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs"
                  style={item.done ? { background: accent, borderColor: accent, color: "#000" } : { borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.4)" }}
                  aria-hidden
                >
                  {item.done ? "✓" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-sm text-white/50">{item.meta}</p>
                </div>
                {!item.done && <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>Rappel</span>}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 5. Budget — graphique en barres accessible (valeurs textuelles)
// ------------------------------------------------------------
export function BudgetSection() {
  const total = BUDGET.categories.reduce((s, c) => s + c.value, 0);
  const max = Math.max(...BUDGET.categories.map((c) => c.value));
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal delay={100} variant="left" className="order-2 lg:order-1">
          <div className={`${cardCls} p-6 sm:p-8`}>
            <div className="mb-6 flex items-baseline justify-between">
              <span className="text-sm text-white/50">Total saison</span>
              <span className="text-2xl font-bold text-white">{total} €</span>
            </div>
            <ul className="flex flex-col gap-4">
              {BUDGET.categories.map((c) => (
                <li key={c.label}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-white/80">{c.label}</span>
                    <span className="font-semibold text-white">{c.value} €</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${c.label} : ${c.value} euros`}>
                    <div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: accent }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal variant="right" className="order-1 lg:order-2">
          <SectionHeading eyebrow="Budget" title={BUDGET.title} text={BUDGET.text} />
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 6. Chronos
// ------------------------------------------------------------
export function TimingSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <SectionHeading eyebrow="Chronos" title={TIMING.title} text={TIMING.text} />
          <div className="mt-8 grid grid-cols-3 gap-3">
            {TIMING.stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-white/45">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={100} variant="right">
          <div className={`${cardCls} p-2`}>
            <ul className="divide-y divide-white/10">
              {TIMING.laps.map((lap) => {
                const isBest = lap.time === TIMING.stats[0].value;
                return (
                  <li key={lap.n} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-white/50">Tour {lap.n}</span>
                    <span className="font-mono text-base font-semibold" style={{ color: isBest ? accent : "#fff" }}>
                      {lap.time}
                      {isBest && <span className="ml-2 text-[11px] uppercase tracking-wide">meilleur</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 7. Historique — chronologie verticale
// ------------------------------------------------------------
export function HistorySection() {
  return (
    <section id="comment" className="mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <SectionHeading eyebrow="Historique" title={HISTORY.title} text={HISTORY.text} />
      </Reveal>
      <ol className="mt-10 border-l border-white/10 pl-6">
        {HISTORY.events.map((e, i) => (
          <Reveal as="li" key={i} delay={i * 60} variant="left" className="relative pb-8 last:pb-0">
            <span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2" style={{ borderColor: accent, background: "#0b0b0d" }} aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{e.date}</p>
            <p className="mt-1 font-semibold text-white">{e.label}</p>
            <p className="text-sm text-white/50">{e.meta}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

// ------------------------------------------------------------
// 8. Avantages — 4 cartes
// ------------------------------------------------------------
const BENEFIT_ICONS = [
  <path key="1" d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  <path key="2" d="M4 4h16v16H4zM4 9h16M9 20V9" />,
  <path key="3" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  <path key="4" d="M12 2a10 10 0 1 0 10 10M12 6v6l4 2" />,
];

export function BenefitsSection() {
  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <SectionHeading eyebrow="Avantages" title="Pensé pour les pilotes exigeants" />
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 80} variant="scale">
            <div className={`group h-full ${cardCls} p-6 transition-transform duration-200 hover:-translate-y-1`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${accent}1a` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {BENEFIT_ICONS[i]}
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{b.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 9. Appel à l'action final
// ------------------------------------------------------------
export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full blur-[100px]" style={{ background: `${accent}30` }} aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-40 w-full max-w-md opacity-40" aria-hidden>
            <ThreeFallback />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{FINAL_CTA.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">{FINAL_CTA.text}</p>
            <Link
              href={BRAND.links.signup}
              className="mt-8 inline-block rounded-full px-8 py-4 text-base font-semibold text-black transition-transform duration-200 hover:scale-[1.03]"
              style={{ background: accent }}
            >
              {FINAL_CTA.cta}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ------------------------------------------------------------
// 10. Pied de page
// ------------------------------------------------------------
export function HomeFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          <p className="text-lg font-extrabold text-white">
            M<span style={{ color: accent }}>X</span>
            <span className="ml-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Vision</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/50">{BRAND.tagline}.</p>
        </div>
        {FOOTER.columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-white">{col.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-white/50 transition-colors hover:text-white">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
        <p className="text-xs text-white/40">© {new Date().getFullYear()} {BRAND.name}. Produit de démonstration.</p>
        <div className="flex gap-4">
          {FOOTER.social.map((s) => (
            <a key={s.label} href={s.href} className="text-xs text-white/40 transition-colors hover:text-white" title="Lien temporaire">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
