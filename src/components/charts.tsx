"use client";

// ============================================================
// Composants graphiques du tableau de bord — SVG/CSS purs.
// Règles : une seule teinte par graphique, textes en encre (jamais
// la couleur seule ne porte l'information), infobulle au toucher.
// ============================================================

import { useRef, useState } from "react";

// ------------------------------------------------------------
// Courbe (aire + ligne) avec curseur tactile
// ------------------------------------------------------------
export function LineChart({
  points,
  color,
  format,
  height = 140,
}: {
  points: { label: string; value: number }[];
  color: string;
  format: (v: number) => string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (points.length === 0) return null;

  const W = 320;
  const H = 110;
  const PAD = 6;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || 1;

  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (points.length - 1));
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  function onMove(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (points.length - 1)));
  }

  const a = active !== null ? points[active] : null;

  return (
    <div ref={ref} className="relative touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
      {a && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-bold text-bg"
          style={{ left: `${(x(active!) / W) * 100}%` }}
        >
          {a.label} — {format(a.value)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full" role="img" aria-label="Évolution">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <>
            <line x1={x(active)} y1={PAD} x2={x(active)} y2={H - PAD} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill={color} stroke="var(--mc-surface)" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-ink-dim">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Calendrier d'activité (échelle séquentielle à une teinte)
// ------------------------------------------------------------
const DAY_LABELS = ["L", "", "M", "", "V", "", "D"];

export function ActivityHeatmap({ days, color }: { days: { date: string; minutes: number }[]; color: string }) {
  const weeks: { date: string; minutes: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const opacity = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes < 60) return 0.3;
    if (minutes < 120) return 0.55;
    if (minutes < 180) return 0.8;
    return 1;
  };
  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-[3px]" aria-hidden>
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="flex h-3.5 items-center text-[9px] font-semibold text-ink-dim">{l}</span>
          ))}
        </div>
        <div className="flex flex-1 justify-between gap-[3px] overflow-hidden">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${fmt(day.date)} : ${day.minutes > 0 ? `${Math.floor(day.minutes / 60)}h${String(day.minutes % 60).padStart(2, "0")}` : "repos"}`}
                  className="h-3.5 w-3.5 rounded-[4px]"
                  style={{
                    background: day.minutes > 0 ? color : "var(--mc-surface-2)",
                    opacity: day.minutes > 0 ? opacity(day.minutes) : 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-semibold text-ink-dim">
        <span>Repos</span>
        {[0.3, 0.55, 0.8, 1].map((o) => (
          <span key={o} className="h-3 w-3 rounded-[3px]" style={{ background: color, opacity: o }} aria-hidden />
        ))}
        <span>3 h +</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Barres horizontales étiquetées (magnitude, une teinte)
// ------------------------------------------------------------
export function HBars({
  rows,
  color,
  format,
}: {
  rows: { label: string; value: number; hint?: string }[];
  color: string;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-semibold">
              {r.label}
              {r.hint && <span className="ml-1 text-xs font-normal text-ink-dim">{r.hint}</span>}
            </span>
            <span className="shrink-0 font-bold">{format(r.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Jauge d'usure (progression vers une durée de vie moyenne)
// ------------------------------------------------------------
export function WearGauge({
  label,
  sinceLast,
  averageLife,
  format,
}: {
  label: string;
  sinceLast: number;
  averageLife: number;
  format: (v: number) => string;
}) {
  const ratio = sinceLast / averageLife;
  const color = ratio >= 1 ? "var(--color-danger)" : ratio >= 0.8 ? "var(--color-warn)" : "var(--color-ok)";
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-semibold">{label}</span>
        <span className="shrink-0 text-xs text-ink-dim">
          <strong className="text-sm text-ink">{format(sinceLast)}</strong> / vie moy. {format(averageLife)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
