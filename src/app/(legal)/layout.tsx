import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

// Pages légales : mise en page sobre et lisible, publique (voir middleware).
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/"><Wordmark /></Link>
          <Link href="/" className="text-sm font-semibold text-accent-strong">Retour au site</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">{children}</main>
    </div>
  );
}
