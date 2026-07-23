"use client";

// Apparition au défilement (IntersectionObserver), plusieurs variantes.
// Respecte prefers-reduced-motion : contenu visible immédiatement.

import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "up" | "scale" | "blur" | "left" | "right";

const HIDDEN: Record<Variant, string> = {
  up: "translate-y-8 opacity-0",
  scale: "scale-[0.96] opacity-0",
  blur: "opacity-0 blur-md",
  left: "-translate-x-10 opacity-0",
  right: "translate-x-10 opacity-0",
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: Variant;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Component = Tag as "div";
  return (
    <Component
      ref={ref}
      className={`transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${shown ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0" : HIDDEN[variant]} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Component>
  );
}
