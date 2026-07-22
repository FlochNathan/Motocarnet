"use client";

// Administration du catalogue de terrains (par région).

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REGIONS } from "@/lib/regions";
import { Badge, Button, Card, ErrorText, Field, Input, Select } from "@/components/ui";
import type { CatalogTrack, TerrainType } from "@/lib/types";

const EMPTY = { id: "", region: "Hauts-de-France", name: "", city: "", facebook_url: "", terrain_type_id: "" };

export default function CatalogAdmin({
  catalog,
  terrains,
  reload,
}: {
  catalog: CatalogTrack[];
  terrains: TerrainType[];
  reload: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function isFacebookUrl(url: string): boolean {
    if (!url.trim()) return true; // facultatif
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      return /(^|\.)facebook\.com$|(^|\.)fb\.com$/i.test(u.hostname) && u.pathname.length > 1;
    } catch {
      return false;
    }
  }

  async function save() {
    setError("");
    if (!form.name.trim()) {
      setError("Nom du terrain obligatoire.");
      return;
    }
    if (!isFacebookUrl(form.facebook_url)) {
      setError("URL Facebook invalide (ex : facebook.com/nom-du-terrain).");
      return;
    }
    const fb = form.facebook_url.trim();
    const payload = {
      region: form.region,
      name: form.name.trim(),
      city: form.city.trim() || null,
      facebook_url: fb ? (/^https?:\/\//i.test(fb) ? fb : `https://${fb}`) : null,
      terrain_type_id: form.terrain_type_id ? Number(form.terrain_type_id) : null,
    };
    setBusy(true);
    const supabase = createClient();
    const { error: saveError } = form.id
      ? await supabase.from("track_catalog").update(payload).eq("id", form.id)
      : await supabase.from("track_catalog").insert(payload);
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(EMPTY);
    reload();
  }

  async function toggleActive(t: CatalogTrack) {
    const supabase = createClient();
    await supabase.from("track_catalog").update({ active: !t.active }).eq("id", t.id);
    reload();
  }

  function startEdit(t: CatalogTrack) {
    setForm({
      id: t.id, region: t.region, name: t.name, city: t.city ?? "",
      facebook_url: t.facebook_url ?? "", terrain_type_id: t.terrain_type_id != null ? String(t.terrain_type_id) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Groupé par région pour la lecture
  const byRegion = new Map<string, CatalogTrack[]>();
  for (const t of catalog) {
    const list = byRegion.get(t.region) ?? [];
    list.push(t);
    byRegion.set(t.region, list);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-dim">
          {form.id ? "Modifier le terrain" : "Ajouter un terrain au catalogue"}
        </h2>
        <Field label="Région">
          <Select value={form.region} onChange={(e) => set("region", e.target.value)}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Nom du terrain">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex : MX Park Romagné" />
        </Field>
        <Field label="Page Facebook" hint="Ses annonces seront lues automatiquement.">
          <Input inputMode="url" value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} placeholder="facebook.com/le-terrain" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ville"><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="—" /></Field>
          <Field label="Type de sol">
            <Select value={form.terrain_type_id} onChange={(e) => set("terrain_type_id", e.target.value)}>
              <option value="">—</option>
              {terrains.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button size="md" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : form.id ? "Enregistrer" : "Ajouter"}
        </Button>
        {form.id && <Button size="md" variant="secondary" onClick={() => setForm(EMPTY)}>Annuler</Button>}
      </Card>

      {[...byRegion.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([reg, list]) => (
        <div key={reg}>
          <h3 className="mb-1.5 px-1 text-sm font-bold text-ink-dim">{reg} ({list.length})</h3>
          <Card className="divide-y divide-border p-0">
            {list.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name} {!t.active && <Badge>inactif</Badge>}</p>
                  <p className="truncate text-xs text-ink-dim">{t.city || "—"}{t.facebook_url ? " • FB ✓" : " • pas de FB"}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>Modifier</Button>
                  <Button size="sm" variant={t.active ? "secondary" : "primary"} onClick={() => toggleActive(t)}>
                    {t.active ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
