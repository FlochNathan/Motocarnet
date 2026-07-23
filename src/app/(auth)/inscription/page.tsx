"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, Input } from "@/components/ui";

export default function InscriptionPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("already registered")) {
        setError("Un compte existe déjà avec cette adresse e-mail.");
      } else if (error.message.includes("fetch") || error.message.includes("Failed")) {
        setError("Impossible de joindre le serveur. Vérifiez votre connexion et la configuration Supabase (.env.local).");
      } else {
        setError(`Inscription impossible : ${error.message}`);
      }
      return;
    }
    // Si la confirmation par e-mail est désactivée, la session est ouverte directement
    if (data.session) {
      window.location.href = "/accueil";
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>📬</p>
        <p className="mt-3 text-lg font-bold">Vérifiez votre boîte mail</p>
        <p className="mt-2 text-sm text-ink-dim">
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte, puis connectez-vous.
        </p>
        <Link href="/connexion" className="mt-4 inline-block font-semibold text-accent">
          Retour à la connexion
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nom de pilote">
          <Input autoComplete="nickname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Nathan #94" />
        </Field>
        <Field label="Adresse e-mail">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pilote@exemple.fr" />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum">
          <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? "Création…" : "Créer mon compte"}
        </Button>
        <p className="text-center text-sm text-ink-dim">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-accent">
            Se connecter
          </Link>
        </p>
      </form>
    </Card>
  );
}
