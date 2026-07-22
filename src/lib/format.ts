// ============================================================
// Formatage : heures moteur, durées, dates, montants, CSV
// ============================================================

/** 7.5 → « 7h30 » ; 0.25 → « 0h15 » */
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** 95 minutes → « 1h35 » */
export function formatMinutes(minutes: number): string {
  return formatHours(minutes / 60);
}

/** « 2026-07-16 » → « 16 juil. 2026 » */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** « aujourd'hui », « hier », « il y a 3 j », sinon date courte */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 14) return "il y a 1 sem.";
  if (days < 31) return `il y a ${Math.floor(days / 7)} sem.`;
  return formatDate(iso.slice(0, 10));
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

/** Date du jour au format YYYY-MM-DD (fuseau local) */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Différence en mois (approximative, à 30,44 jours par mois) */
export function monthsBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return (to - from) / (1000 * 60 * 60 * 24 * 30.44);
}

/** Construit un CSV téléchargeable (séparateur « ; » pour Excel FR) */
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  // BOM pour qu'Excel reconnaisse l'UTF-8
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
