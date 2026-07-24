"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, Input } from "@/components/ui";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser`,
    });
    setBusy(false);
    if (error) {
      setError("Envoi impossible. Vérifiez l'adresse e-mail et réessayez.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>📬</p>
        <p className="mt-3 text-lg font-bold">E-mail envoyé</p>
        <p className="mt-2 text-sm text-ink-dim">
          Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>
        <Link href="/connexion" className="mt-4 inline-block font-semibold text-accent-strong">
          Retour à la connexion
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-dim">
          Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.
        </p>
        <Field label="Adresse e-mail">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pilote@exemple.fr" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? "Envoi…" : "Envoyer le lien"}
        </Button>
        <Link href="/connexion" className="text-center text-sm font-semibold text-accent-strong">
          Retour à la connexion
        </Link>
      </form>
    </Card>
  );
}
