"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery, must } from "@/lib/hooks";
import { RIDER_LEVELS } from "@/lib/domain";
import { downloadFile, todayISO } from "@/lib/format";
import { Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import type { Profile, RiderLevel } from "@/lib/types";

// Tables personnelles incluses dans la sauvegarde / restauration
const BACKUP_TABLES = [
  "motorcycles", "riding_sessions", "maintenance_records", "maintenance_schedules",
  "custom_reminders", "suspension_setups", "suspension_setup_revisions", "suspension_feedback",
  "parts", "expenses", "attachments",
] as const;

export default function ProfilPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, loading, reload } = useSupabaseQuery<Profile & { email: string }>(async (sb) => {
    const { data: userData } = await sb.auth.getUser();
    const p = must(await sb.from("profiles").select("*").eq("id", userData.user!.id).single()) as Profile;
    return { ...p, email: userData.user!.email ?? "" };
  });

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [level, setLevel] = useState<RiderLevel | "">("");
  const [dark, setDark] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setWeight(profile.rider_weight_kg != null ? String(profile.rider_weight_kg) : "");
    setLevel(profile.rider_level ?? "");
  }, [profile]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mc-theme", next ? "dark" : "light");
  }

  async function saveProfile() {
    setError("");
    setMsg("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name || null,
        rider_weight_kg: weight.trim() === "" ? null : Number(weight.replace(",", ".")),
        rider_level: level || null,
      })
      .eq("id", profile!.id);
    setBusy(false);
    if (error) {
      setError("Enregistrement impossible.");
      return;
    }
    setMsg("Profil enregistré ✔");
    reload();
  }

  async function exportBackup() {
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const backup: Record<string, unknown> = { version: 1, exported_at: new Date().toISOString() };
      for (const table of BACKUP_TABLES) {
        backup[table] = must(await supabase.from(table).select("*"));
      }
      downloadFile(`motocarnet-sauvegarde-${todayISO()}.json`, JSON.stringify(backup, null, 2), "application/json");
      setMsg("Sauvegarde téléchargée ✔");
    } catch {
      setError("Export impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(file: File) {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;
      const backup = JSON.parse(await file.text());

      // Restauration dans l'ordre des dépendances ; user_id forcé au compte courant
      for (const table of BACKUP_TABLES) {
        const rows = (backup[table] ?? []) as Record<string, unknown>[];
        if (rows.length === 0) continue;
        const sanitized = rows.map((r) => ({ ...r, user_id: userId }));
        const { error } = await supabase.from(table).upsert(sanitized, { onConflict: "id" });
        if (error) throw new Error(`${table} : ${error.message}`);
      }
      // Le trigger de sessions a pu modifier les compteurs : on réapplique les valeurs sauvegardées
      for (const m of (backup.motorcycles ?? []) as { id: string; current_hours: number }[]) {
        await supabase.from("motorcycles").update({ current_hours: m.current_hours }).eq("id", m.id);
      }
      setMsg("Données restaurées ✔");
    } catch (e) {
      setError(e instanceof Error ? `Restauration impossible — ${e.message}` : "Restauration impossible.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  if (loading || !profile) return (<><PageHeader title="Profil" /><Spinner /></>);

  return (
    <>
      <PageHeader title="Profil" />

      <Card className="flex flex-col gap-4">
        <p className="text-sm text-ink-dim">Connecté en tant que <strong className="text-ink">{profile.email}</strong></p>
        <Field label="Nom de pilote">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poids équipé (kg)" hint="Pré-rempli dans les réglages">
            <Input type="number" inputMode="decimal" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Niveau">
            <Select value={level} onChange={(e) => setLevel(e.target.value as RiderLevel | "")}>
              <option value="">—</option>
              {RIDER_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        {msg && <p className="rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">{msg}</p>}
        <ErrorText>{error}</ErrorText>
        <Button onClick={saveProfile} disabled={busy}>Enregistrer</Button>
      </Card>

      <Card className="mt-3 flex items-center justify-between">
        <div>
          <p className="font-bold">Mode sombre</p>
          <p className="text-xs text-ink-dim">Fort contraste pour l'extérieur</p>
        </div>
        <button
          role="switch"
          aria-checked={dark}
          onClick={toggleTheme}
          className={`relative h-8 w-14 rounded-full transition ${dark ? "bg-accent" : "bg-surface-2 border border-border"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${dark ? "left-7" : "left-1"}`} />
        </button>
      </Card>

      <div className="mt-3 flex flex-col gap-2">
        <Link href="/stats"><Card className="flex items-center justify-between py-3"><span className="font-bold">📊 Analyses</span><span className="text-ink-dim">›</span></Card></Link>
        <Link href="/terrains"><Card className="flex items-center justify-between py-3"><span className="font-bold">🚩 Terrains (ouvert / fermé)</span><span className="text-ink-dim">›</span></Card></Link>
        {profile.is_admin && (
          <Link href="/admin"><Card className="flex items-center justify-between py-3"><span className="font-bold">🛠️ Administration</span><span className="text-ink-dim">›</span></Card></Link>
        )}
      </div>

      <Card className="mt-3 flex flex-col gap-3">
        <p className="font-bold">Sauvegarde des données</p>
        <p className="text-xs text-ink-dim">
          Exportez toutes vos données (motos, sessions, entretiens, réglages) dans un fichier JSON,
          et restaurez-les à tout moment. Les photos ne sont pas incluses.
        </p>
        <Button variant="secondary" size="md" onClick={exportBackup} disabled={busy}>⬇️ Exporter mes données</Button>
        <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()} disabled={busy}>⬆️ Restaurer une sauvegarde</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restoreBackup(f);
          }}
        />
      </Card>

      <div className="mt-6">
        <Button variant="secondary" onClick={signOut}>Se déconnecter</Button>
      </div>
    </>
  );
}
