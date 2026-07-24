import type { Metadata } from "next";
import LandingNav from "@/components/home/LandingNav";
import HomeHero from "@/components/home/HomeHero";
import {
  ProductPreview, MaintenanceSection, BudgetSection, TimingSection,
  HistorySection, BenefitsSection, PricingSection, FinalCTA, HomeFooter,
} from "@/components/home/LandingSections";

export const metadata: Metadata = {
  title: "MXVision — Entretien, budget et chronos de ta moto",
  description:
    "Suis les entretiens, les heures moteur, les dépenses, les chronos et l'historique complet de ta moto depuis une seule application.",
  openGraph: {
    title: "MXVision — Entretien, budget et chronos de ta moto",
    description:
      "Suis les entretiens, les heures moteur, les dépenses, les chronos et l'historique complet de ta moto depuis une seule application.",
    type: "website",
    siteName: "MXVision",
  },
  twitter: {
    card: "summary_large_image",
    title: "MXVision — Entretien, budget et chronos de ta moto",
    description: "Le carnet numérique complet de ta moto : entretien, budget, chronos.",
  },
};

// Page d'accueil publique (marketing). Le tableau de bord de l'application
// est sur /accueil (voir middleware : les utilisateurs connectés y sont redirigés).
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f3f1] text-[#141414] [color-scheme:light]">
      <LandingNav />
      <main>
        <HomeHero />
        <ProductPreview />
        <MaintenanceSection />
        <BudgetSection />
        <TimingSection />
        <HistorySection />
        <BenefitsSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
