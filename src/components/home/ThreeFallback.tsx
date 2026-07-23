// Visuel de secours du hero : affiché quand le modèle GLB est absent,
// que WebGL n'est pas disponible, ou que le chargement échoue.
// Élégant, léger, décoratif (ignoré par les lecteurs d'écran).

import { BRAND } from "@/lib/landing";

export default function ThreeFallback({ label }: { label?: string }) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[24px]"
      role="img"
      aria-label={label ?? "Illustration d'une moto de cross"}
    >
      {/* Halo ambré */}
      <div
        className="pointer-events-none absolute h-[70%] w-[70%] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.accent}55, transparent 70%)` }}
        aria-hidden
      />
      {/* Silhouette moto (line-art générique, aucune marque) */}
      <svg viewBox="0 0 400 240" className="relative w-[85%] max-w-md" fill="none" aria-hidden>
        <defs>
          <linearGradient id="mxStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BRAND.accentSoft} />
            <stop offset="100%" stopColor={BRAND.accent} />
          </linearGradient>
        </defs>
        <g stroke="url(#mxStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="86" cy="176" r="44" />
          <circle cx="314" cy="176" r="44" />
          <path d="M86 176 L150 120 L232 120 L268 150 M314 176 L268 150 L236 96 L200 96" />
          <path d="M150 120 L120 120 M124 108 L156 108" />
          <path d="M236 96 L272 70 L300 74" />
          <path d="M150 120 C 176 150, 210 152, 232 120" />
          <path d="M120 120 L100 150" />
        </g>
        <g stroke="#3a3a3e" strokeWidth="2">
          <circle cx="86" cy="176" r="20" />
          <circle cx="314" cy="176" r="20" />
        </g>
      </svg>
    </div>
  );
}
