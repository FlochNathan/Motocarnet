import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: { default: "MotoCarnet", template: "%s — MotoCarnet" },
  description: "Carnet numérique du pilote motocross : garage, heures moteur, entretiens et réglages de suspensions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MotoCarnet", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171210" },
    { media: "(prefers-color-scheme: light)", color: "#fdf1ea" },
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
    <html lang="fr" suppressHydrationWarning>
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
