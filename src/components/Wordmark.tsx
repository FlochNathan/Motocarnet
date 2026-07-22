// Logo textuel MXVision — « MX » avec le X doré, « VISION » espacé.
// Rendu net à toute taille, fonctionne sur fond clair comme sombre.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 leading-none ${className}`} aria-label="MXVision">
      <span className="text-xl font-extrabold tracking-tight">
        M<span className="text-accent">X</span>
      </span>
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-ink-dim">Vision</span>
    </span>
  );
}

export function WordmarkStacked({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} aria-label="MXVision">
      <span className="text-5xl font-extrabold tracking-tight">
        M<span className="text-accent">X</span>
      </span>
      <span className="mt-2 text-sm font-semibold uppercase tracking-[0.55em] text-ink-dim">
        Vision
      </span>
      <span className="mt-2 h-px w-10 bg-accent" aria-hidden />
    </span>
  );
}
