"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/",
    label: "Accueil",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
    ),
  },
  {
    href: "/garage",
    label: "Garage",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M5.5 17l3-7h4l3 7M12.5 10l2-4h3" /><path d="M9 6h4" /></svg>
    ),
  },
  {
    href: "/entretiens",
    label: "Entretiens",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.7L3 17.7V21h3.3l5.7-5.7a4.5 4.5 0 0 0 5.7-6l-3 3-2.5-.5-.5-2.5 3-3z" /></svg>
    ),
  },
  {
    href: "/suspensions",
    label: "Suspensions",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2M12 19v2" /><path d="M8 7h8M8 10h8M8 13h8M8 16h8" /><path d="M8 7l8 3M8 10l8 3M8 13l8 3" /></svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>
    ),
  },
];

/** Le bouton flottant est masqué sur les écrans de saisie pour ne rien recouvrir */
const HIDE_FAB = ["nouvelle", "nouveau", "modifier", "echeances", "comparer"];

export default function BottomNav() {
  const pathname = usePathname();
  const showFab = !HIDE_FAB.some((p) => pathname.includes(p));

  return (
    <>
      {showFab && (
        <Link
          href="/sessions/nouvelle"
          aria-label="Ajouter une session"
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-violet-deep text-white shadow-[var(--shadow-fab)] active:scale-95"
          style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
      )}

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 bg-surface/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgb(120_72_45/0.08)]"
      >
        <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch px-3">
          {ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex flex-1 flex-col items-center justify-center ${
                  active ? "text-accent-strong" : "text-ink-dim/70 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-0 h-[3px] w-7 rounded-full bg-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                />
                {item.icon}
                <span className="mt-0.5 text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
