import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

// Inter auto-hébergée (fichier variable, aucune dépendance réseau) —
// rendu identique sur toutes les machines, sans décalage de police.
const inter = localFont({
  src: "./fonts/inter-var.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mxvision.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "MXVision", template: "%s — MXVision" },
  description: "MXVision — l'application premium du pilote motocross : garage, entretiens, réglages, finances et terrains.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MXVision", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "MXVision",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MXVision" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
  ],
};

// Applique le thème avant le premier rendu pour éviter le flash
const themeScript = `
try {
  var t = localStorage.getItem("mc-theme");
  var dark = t === "dark"; // clair par défaut
  document.documentElement.classList.toggle("dark", dark);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
