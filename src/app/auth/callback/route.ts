import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Échange le code reçu par e-mail (confirmation, réinitialisation) contre une session
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorCode = searchParams.get("error_code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Lien expiré, déjà utilisé ou invalide : on l'explique sur l'écran de connexion
  const reason = errorCode === "otp_expired" ? "lien-expire" : code || errorCode ? "lien-invalide" : "";
  return NextResponse.redirect(`${origin}/connexion${reason ? `?erreur=${reason}` : ""}`);
}
