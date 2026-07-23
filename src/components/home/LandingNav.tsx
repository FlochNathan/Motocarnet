"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND, NAV_LINKS } from "@/lib/landing";

export default function LandingNav() {
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        compact ? "border-b border-black/[0.08] bg-[#f4f3f1]/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4" aria-label="Navigation principale">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-[#141414]">
          M<span style={{ color: BRAND.accent }}>X</span>
          <span className="ml-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-black/45">Vision</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-black/60 transition-colors hover:text-[#141414]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href={BRAND.links.login} className="text-sm font-semibold text-black/70 transition-colors hover:text-[#141414]">
            Connexion
          </Link>
          <Link
            href={BRAND.links.signup}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-black transition-transform duration-200 hover:scale-[1.03]"
            style={{ background: BRAND.accent }}
          >
            Créer mon garage
          </Link>
        </div>

        {/* Menu mobile */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#141414] md:hidden"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-black/[0.08] bg-[#f4f3f1] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-black/70 hover:bg-black/[0.035]"
              >
                {l.label}
              </a>
            ))}
            <Link href={BRAND.links.login} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium text-black/70 hover:bg-black/[0.035]">
              Connexion
            </Link>
            <Link
              href={BRAND.links.signup}
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-full px-5 py-3 text-center text-base font-semibold text-black"
              style={{ background: BRAND.accent }}
            >
              Créer mon garage
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
