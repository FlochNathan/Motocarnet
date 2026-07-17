"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, ErrorText, Field, Input, Spinner } from "@/components/ui";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ConnexionForm />
    </Suspense>
  );
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkError = searchParams.get("erreur"); // lien-expire | lien-invalide

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(linkError === "lien-expire");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("E-mail ou mot de passe incorrect. Pas encore de compte ? Créez-en un ci-dessous.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Votre e-mail n'est pas encore confirmé.");
        setNeedsConfirmation(true);
      } else if (error.message.includes("fetch") || error.message.includes("Failed")) {
        setError("Impossible de joindre le serveur. Vérifiez votre connexion et la configuration Supabase (.env.local).");
      } else {
        setError(`Connexion impossible : ${error.message}`);
      }
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function resendConfirmation() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Saisissez d'abord votre adresse e-mail ci-dessus.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(`Envoi impossible : ${error.message}`);
      return;
    }
    setInfo("Nouvel e-mail de confirmation envoyé. Ouvrez le lien rapidement (il expire vite), puis reconnectez-vous.");
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {linkError && (
          <p className="rounded-xl bg-warn/10 px-4 py-3 text-sm font-medium text-warn">
            {linkError === "lien-expire"
              ? "Le lien de confirmation a expiré ou a déjà été utilisé. Saisissez votre e-mail puis demandez un nouveau lien ci-dessous."
              : "Ce lien n'est pas valide. Demandez un nouveau lien ci-dessous."}
          </p>
        )}
        <Field label="Adresse e-mail">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pilote@exemple.fr" />
        </Field>
        <Field label="Mot de passe">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <ErrorText>{error}</ErrorText>
        {info && <p className="rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">{info}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
        {needsConfirmation && (
          <Button type="button" variant="secondary" onClick={resendConfirmation} disabled={busy}>
            📧 Renvoyer l'e-mail de confirmation
          </Button>
        )}
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link href="/mot-de-passe-oublie" className="font-semibold text-accent">
            Mot de passe oublié ?
          </Link>
          <p className="text-ink-dim">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-semibold text-accent">
              Créer un compte
            </Link>
          </p>
        </div>
      </form>
    </Card>
  );
}
