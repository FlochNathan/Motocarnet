"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ChipGroup, ConfirmButton, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { MOTO_SELECT, motoLabel } from "@/lib/moto";
import { formatDate, formatEuro, formatHours, todayISO } from "@/lib/format";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/domain";
import { expensesPerCategory, sumPerMonthOfYear } from "@/lib/stats";
import type { Expense, MotorcycleWithModel, RidingSession } from "@/lib/types";

const CAT = new Map(EXPENSE_CATEGORIES.map((c) => [c.value as string, c]));

export default function FinancesPage() {
  const { data, loading, reload } = useSupabaseQuery(async (sb) => {
    const [motos, expenses, sessions] = await Promise.all([
      sb.from("motorcycles").select(MOTO_SELECT).order("is_primary", { ascending: false }),
      sb.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("riding_sessions").select("*"),
    ]);
    return {
      motos: must(motos) as MotorcycleWithModel[],
      expenses: must(expenses) as Expense[],
      sessions: must(sessions) as RidingSession[],
    };
  });

  const currentYear = Number(todayISO().slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [motoFilter, setMotoFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const e of data?.expenses ?? []) set.add(Number(e.expense_date.slice(0, 4)));
    for (const s of data?.sessions ?? []) set.add(Number(s.session_date.slice(0, 4)));
    return [...set].sort((a, b) => b - a);
  }, [data, currentYear]);

  const filtered = useMemo(() => {
    if (!data) return null;
    const keep = (motoId: string, date: string) =>
      date.startsWith(`${year}-`) && (motoFilter === null || motoId === motoFilter);
    return {
      expenses: data.expenses.filter((e) => keep(e.motorcycle_id, e.expense_date)),
      sessions: data.sessions.filter((s) => keep(s.motorcycle_id, s.session_date)),
    };
  }, [data, year, motoFilter]);

  if (loading || !data || !filtered) return (<><PageHeader title="Finances" /><Spinner /></>);

  if (data.motos.length === 0) {
    return (
      <>
        <PageHeader title="Finances" />
        <EmptyState icon="💶" title="Pas encore de finances" text="Ajoutez d'abord une moto dans le garage, puis enregistrez vos dépenses de saison ici." />
      </>
    );
  }

  const total = filtered.expenses.reduce((s, e) => s + e.amount, 0);
  const ridingHours = filtered.sessions.reduce((s, x) => s + x.duration_minutes / 60, 0);
  const costPerHour = ridingHours > 0 ? total / ridingHours : null;

  const byCategory = expensesPerCategory(filtered.expenses, EXPENSE_CATEGORIES.map((c) => c.value));
  const perMonth = sumPerMonthOfYear(filtered.expenses.map((e) => ({ date: e.expense_date, value: e.amount })), year);
  const hoursMonth = sumPerMonthOfYear(filtered.sessions.map((s) => ({ date: s.session_date, value: s.duration_minutes / 60 })), year);

  const motoName = (id: string) => {
    const m = data.motos.find((x) => x.id === id);
    return m ? motoLabel(m) : "";
  };

  async function deleteExpense(e: Expense) {
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", e.id);
    reload();
  }

  // Dépenses groupées par mois (les plus récentes d'abord)
  const groups: { month: string; rows: Expense[] }[] = [];
  for (const e of filtered.expenses) {
    const month = e.expense_date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.rows.push(e);
    else groups.push({ month, rows: [e] });
  }
  const monthTitle = (key: string) =>
    new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Finances" />

      {/* Filtres saison / moto */}
      <div className="mb-3 flex flex-col gap-2">
        <ChipGroup
          options={years.map((y) => ({ value: y, label: `Saison ${y}` }))}
          value={year}
          onChange={(v) => setYear((v as number | null) ?? currentYear)}
        />
        {data.motos.length > 1 && (
          <ChipGroup
            options={[{ value: "__all__", label: "Toutes les motos" }, ...data.motos.map((m) => ({ value: m.id, label: motoLabel(m) }))]}
            value={motoFilter ?? "__all__"}
            onChange={(v) => setMotoFilter(v === "__all__" || v === null ? null : (v as string))}
          />
        )}
      </div>

      {!showForm && (
        <Button size="md" className="mb-4 w-full" onClick={() => setShowForm(true)}>＋ Ajouter une dépense</Button>
      )}
      {showForm && (
        <ExpenseForm
          motos={data.motos}
          onDone={() => {
            setShowForm(false);
            reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2">
        <Tile label={`Total ${year}`} value={formatEuro(total)} />
        <Tile label="Coût par heure" value={costPerHour !== null ? formatEuro(costPerHour) : "—"} />
        <Tile label="Heures roulées" value={formatHours(ridingHours)} />
        <Tile label="Sessions" value={String(filtered.sessions.length)} />
      </div>

      {/* Répartition par catégorie */}
      {byCategory.length > 0 ? (
        <Card className="mt-3">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">Répartition par catégorie</h2>
          <div className="flex items-center gap-5">
            <Donut data={byCategory.map((r) => ({ value: r.total, color: CAT.get(r.category)!.color }))} centerLabel={formatEuro(total)} />
            <ul className="min-w-0 flex-1">
              {byCategory.map((r) => {
                const c = CAT.get(r.category)!;
                return (
                  <li key={r.category} className="flex items-center gap-2 py-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.label}</span>
                    <span className="text-sm font-bold">{formatEuro(r.total)}</span>
                    <span className="w-9 text-right text-xs text-ink-dim">{Math.round((r.total / total) * 100)} %</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      ) : (
        <Card className="mt-3 text-sm text-ink-dim">Aucune dépense sur la saison {year}. Ajoutez-en une pour voir les graphiques.</Card>
      )}

      {/* Dépenses par mois */}
      <MonthBars title={`Dépenses par mois (${year})`} rows={perMonth} color="var(--color-accent)" format={(v) => formatEuro(v)} />

      {/* Heures par mois */}
      <MonthBars title={`Heures roulées par mois (${year})`} rows={hoursMonth} color="var(--color-violet)" format={(v) => formatHours(v)} />

      {/* Liste des dépenses */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-extrabold">Toutes les dépenses</h2>
        {groups.length === 0 ? (
          <EmptyState icon="🧾" title="Aucune dépense" text="Les coûts saisis dans les entretiens apparaissent ici automatiquement, et vous pouvez tout ajouter à la main : transport, essence, inscriptions…" />
        ) : (
          groups.map((g) => (
            <div key={g.month} className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-sm font-bold capitalize text-ink-dim">{monthTitle(g.month)}</h3>
                <span className="text-sm font-bold">{formatEuro(g.rows.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              <Card className="divide-y divide-border p-0">
                {g.rows.map((e) => {
                  const c = CAT.get(e.category) ?? CAT.get("autre")!;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                        style={{ background: `${c.color}1a` }}
                        aria-hidden
                      >
                        {c.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{e.label}</p>
                        <p className="truncate text-xs text-ink-dim">
                          {c.label} • {formatDate(e.expense_date)}
                          {data.motos.length > 1 && ` • ${motoName(e.motorcycle_id)}`}
                        </p>
                      </div>
                      <span className="shrink-0 font-black">{formatEuro(e.amount)}</span>
                      <ConfirmButton
                        label="✕"
                        size="sm"
                        confirmTitle="Supprimer cette dépense ?"
                        confirmText={`« ${e.label} » (${formatEuro(e.amount)}) sera définitivement supprimée.`}
                        onConfirm={() => deleteExpense(e)}
                      />
                    </div>
                  );
                })}
              </Card>
            </div>
          ))
        )}
      </section>
    </>
  );
}

// ------------------------------------------------------------
// Formulaire d'ajout de dépense
// ------------------------------------------------------------
function ExpenseForm({ motos, onDone, onCancel }: { motos: MotorcycleWithModel[]; onDone: () => void; onCancel: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [motoId, setMotoId] = useState(motos[0]?.id ?? "");
  const [category, setCategory] = useState<ExpenseCategory | null>("piece");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    const value = Number(amount.replace(",", "."));
    if (!label.trim()) {
      setError("Donnez un libellé (ex : « Péage + gasoil Loon-Plage »).");
      return;
    }
    if (!category) {
      setError("Choisissez une catégorie.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Indiquez un montant valide.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("expenses").insert({
      user_id: userData.user!.id,
      motorcycle_id: motoId,
      expense_date: date,
      category,
      label: label.trim(),
      amount: value,
    });
    setBusy(false);
    if (insertError) {
      setError("Enregistrement impossible. Si la catégorie est refusée, exécutez la migration 0004_finances.sql dans Supabase.");
      return;
    }
    onDone();
  }

  return (
    <Card className="mb-4 flex flex-col gap-3">
      <Field label="Catégorie">
        <ChipGroup
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
          value={category}
          onChange={(v) => setCategory(v as ExpenseCategory | null)}
        />
      </Field>
      <Field label="Libellé">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Plaquettes, gasoil aller-retour…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant (€)">
          <Input type="number" min={0} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Date">
          <Input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Moto">
        <Select value={motoId} onChange={(e) => setMotoId(e.target.value)}>
          {motos.map((m) => <option key={m.id} value={m.id}>{motoLabel(m)}</option>)}
        </Select>
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button size="md" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer la dépense"}</Button>
      <Button size="md" variant="secondary" onClick={onCancel}>Annuler</Button>
    </Card>
  );
}

// ------------------------------------------------------------
// Graphiques (SVG/CSS purs, une seule teinte par graphique)
// ------------------------------------------------------------
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-3">
      <p className="text-xs font-semibold text-ink-dim">{label}</p>
      <p className="mt-0.5 text-2xl font-black">{value}</p>
    </Card>
  );
}

/** Donut SVG : segments avec espaces, total au centre. L'identité des parts est
 *  toujours portée par la légende (jamais par la couleur seule). */
function Donut({ data, centerLabel }: { data: { value: number; color: string }[]; centerLabel: string }) {
  const size = 120;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const gap = data.length > 1 ? 2.5 : 0; // espace de séparation entre segments (px d'arc)

  let offset = 0;
  const segments = data.map((d, i) => {
    const len = Math.max(0, (d.value / total) * circ - gap);
    const seg = { key: i, color: d.color, dasharray: `${len} ${circ - len}`, dashoffset: -offset };
    offset += (d.value / total) * circ;
    return seg;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Total : ${centerLabel}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="max-w-[70%] truncate text-sm font-black">{centerLabel}</span>
      </div>
    </div>
  );
}

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Barres mensuelles (12 mois), une seule teinte, valeurs au survol/appui */
function MonthBars({
  title,
  rows,
  color,
  format,
}: {
  title: string;
  rows: { month: string; total: number }[];
  color: string;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (rows.every((r) => r.total === 0)) return null;
  return (
    <Card className="mt-3">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-dim">{title}</h2>
      <div className="flex h-28 items-end gap-1.5" role="img" aria-label={title}>
        {rows.map((r, i) => (
          <div key={r.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${MONTH_LETTERS[i]} : ${format(r.total)}`}>
            <div
              className="w-full rounded-t"
              style={{
                background: color,
                height: `${r.total > 0 ? Math.max(5, (r.total / max) * 100) : 2}%`,
                opacity: r.total > 0 ? 1 : 0.12,
              }}
            />
            <span className="text-[9px] font-semibold text-ink-dim">{MONTH_LETTERS[i]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
