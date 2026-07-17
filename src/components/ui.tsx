"use client";

// ============================================================
// Design system MotoCarnet — primitives tactiles raffinées
// (cibles ≥ 44 px, ombres douces, fort contraste).
// ============================================================

import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type ButtonHTMLAttributes, useState } from "react";
import Link from "next/link";

// ------------------------------------------------------------
// Boutons
// ------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold select-none " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const btnVariants: Record<ButtonVariant, string> = {
  primary:
    "text-accent-contrast bg-gradient-to-b from-accent to-accent-strong shadow-[var(--shadow-btn)] hover:brightness-105",
  secondary:
    "bg-surface text-ink border border-border shadow-[var(--shadow-card)] hover:border-ink-dim/40 hover:bg-surface-2/60",
  danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15",
  ghost: "text-accent hover:bg-accent-soft",
};
const btnSizes = {
  lg: "min-h-14 px-6 text-[1.0625rem] w-full",
  md: "min-h-12 px-5 text-base",
  sm: "min-h-11 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof btnSizes }) {
  return <button className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof btnSizes;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------
// Cartes et structure de page
// ------------------------------------------------------------
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-card bg-surface border border-border/80 p-4 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex min-h-[3.75rem] items-center gap-1 border-b border-border/60 bg-bg/85 px-3 backdrop-blur-xl">
      {back && (
        <Link
          href={back}
          aria-label="Retour"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
      )}
      <h1 className={`flex-1 truncate text-xl font-bold tracking-tight ${back ? "" : "pl-1"}`}>{title}</h1>
      {action}
    </header>
  );
}

// ------------------------------------------------------------
// Formulaires
// ------------------------------------------------------------
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-dim">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-dim/80">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-danger">{error}</span>}
    </label>
  );
}

const inputCls =
  "w-full min-h-12 rounded-[var(--radius-field)] border border-border bg-surface px-4 text-base text-ink " +
  "placeholder:text-ink-dim/50 shadow-[0_1px_2px_rgb(16_24_40/0.04)] " +
  "hover:border-ink-dim/35 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} py-3 ${props.className ?? ""}`} />;
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputCls} cursor-pointer appearance-none pr-11 font-medium disabled:cursor-not-allowed disabled:opacity-45 ${props.className ?? ""}`}
      style={{
        backgroundImage: chevron,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.9rem center",
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}

/** Groupe de choix rapides (chips) — évite la saisie au clavier */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: { value: T; label: string }[];
  value: T[] | T | null;
  onChange: (v: T[] | T | null) => void;
  multi?: boolean;
}) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  const isSelected = (v: T) => (multi ? (selected as T[]).includes(v) : selected === v);

  function toggle(v: T) {
    if (multi) {
      const cur = selected as T[];
      onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    } else {
      onChange(selected === v ? null : v);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={isSelected(o.value)}
          onClick={() => toggle(o.value)}
          className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
            isSelected(o.value)
              ? "border-accent/60 bg-accent-soft text-accent-strong shadow-[inset_0_0_0_1px_var(--color-accent)]"
              : "border-border bg-surface text-ink-dim shadow-[0_1px_2px_rgb(16_24_40/0.04)] hover:border-ink-dim/40 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Note sur 5 (étoiles) */
export function Stars({ value, onChange, label }: { value: number | null; onChange?: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          aria-label={`${i} sur 5`}
          className={`text-[1.375rem] leading-none ${onChange ? "flex h-11 w-10 items-center justify-center" : ""} ${
            value !== null && i <= value ? "text-accent drop-shadow-[0_1px_2px_rgb(244_101_12/0.4)]" : "text-ink-dim/25"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Statuts et badges
// ------------------------------------------------------------
export function StatusPill({ status, label }: { status: "ok" | "soon" | "overdue" | "none"; label: string }) {
  const cls = {
    ok: "bg-ok/10 text-ok",
    soon: "bg-warn/10 text-warn",
    overdue: "bg-danger/10 text-danger",
    none: "bg-surface-2 text-ink-dim",
  }[status];
  const dot = { ok: "bg-ok", soon: "bg-warn", overdue: "bg-danger", none: "bg-ink-dim/60" }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-bold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-dim ${className}`}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------
// États vides, chargement, erreurs
// ------------------------------------------------------------
export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-4xl" aria-hidden>{icon}</span>
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-ink-dim">{text}</p>
      {action && <div className="mt-2 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Chargement">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-accent" />
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{children}</p>;
}

// ------------------------------------------------------------
// Confirmation avant suppression
// ------------------------------------------------------------
export function ConfirmButton({
  label,
  confirmTitle,
  confirmText,
  onConfirm,
  variant = "danger",
  size = "md",
}: {
  label: string;
  confirmTitle: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: keyof typeof btnSizes;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-surface p-5 shadow-[var(--shadow-float)]">
            <p className="text-lg font-bold">{confirmTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">{confirmText}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                  } finally {
                    setBusy(false);
                    setOpen(false);
                  }
                }}
              >
                {busy ? "Suppression…" : "Confirmer la suppression"}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
