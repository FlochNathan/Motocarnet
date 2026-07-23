import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser", "/auth"];

/** Configuration Supabase absente ou non remplie (.env.local) */
function supabaseNotConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || !key || url.includes("VOTRE-PROJET") || key.includes("votre-cle");
}

const SETUP_PAGE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MXVision — Configuration requise</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0c;color:#f5f5f5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:1rem}
main{max-width:34rem;background:#151517;border:1px solid #2a2a2e;border-radius:18px;padding:2rem}
h1{color:#c9a14a;font-size:1.4rem}code{background:#1f1f22;padding:.15rem .4rem;border-radius:.35rem}
ol{line-height:1.9}a{color:#c9a14a}</style></head>
<body><main>
<h1>MXVision — Supabase n'est pas encore configuré</h1>
<p>L'application a besoin des clés de votre projet Supabase pour démarrer :</p>
<ol>
<li>Créez un projet gratuit sur <a href="https://supabase.com">supabase.com</a></li>
<li>Dans <strong>SQL Editor</strong>, exécutez dans l'ordre : <code>supabase/migrations/0001_schema.sql</code>, <code>0002_rls.sql</code>, puis <code>supabase/seed.sql</code></li>
<li>Ouvrez <code>.env.local</code> à la racine du projet et collez l'URL et la clé <em>anon</em> (Settings → API Keys)</li>
<li>Redémarrez <code>npm run dev</code> et rechargez cette page</li>
</ol>
<p>Le détail complet est dans le <strong>README.md</strong>.</p>
</main></body></html>`;

export async function middleware(request: NextRequest) {
  if (supabaseNotConfigured()) {
    return new NextResponse(SETUP_PAGE, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLanding = path === "/"; // page d'accueil marketing (publique)
  const isPublic = isLanding || PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  if (user && isLanding) {
    // Déjà connecté : on saute la landing pour aller au tableau de bord
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    return NextResponse.redirect(url);
  }
  if (user && isPublic && !isLanding && !path.startsWith("/auth") && !path.startsWith("/reinitialiser")) {
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Tout sauf les fichiers statiques et les modèles 3D
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|hdr|ico)$).*)"],
};
