/** Décor de fond façon dessin à la main (feuilles griffonnées), discret et non interactif */
export default function Doodles() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 overflow-hidden" aria-hidden>
      <svg className="absolute -left-6 top-2 text-accent-strong/25" width="110" height="110" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M20 80 C 25 55, 40 35, 70 22" />
        <path d="M32 63 C 40 60, 46 54, 48 46 M32 63 C 24 62, 18 56, 16 48" />
        <path d="M44 47 C 52 44, 57 38, 59 30 M44 47 C 36 46, 30 40, 28 32" />
        <path d="M57 33 C 64 30, 69 25, 71 18 M57 33 C 50 32, 45 27, 43 20" />
      </svg>
      <svg className="absolute -right-8 top-8 rotate-[24deg] text-violet/30" width="130" height="130" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M15 85 C 30 65, 55 45, 85 35" />
        <path d="M35 66 C 44 64, 51 58, 54 49 M35 66 C 27 64, 21 58, 19 49" />
        <path d="M55 50 C 64 48, 71 42, 74 33 M55 50 C 47 48, 41 42, 39 33" />
      </svg>
    </div>
  );
}

/** Trait de soulignement « dessiné à la main » sous les grands titres */
export function HandUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`block text-accent-strong ${className}`}
      width="190"
      height="14"
      viewBox="0 0 190 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 9 C 50 3, 120 3, 186 6" />
      <path d="M28 12 C 70 8, 110 8, 148 10" opacity="0.55" />
    </svg>
  );
}
