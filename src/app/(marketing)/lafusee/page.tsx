import type { Metadata } from "next";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingHero } from "@/components/landing/marketing-hero";
import { RevealSections } from "@/components/landing/reveal-sections";
import { MarketingStrip } from "@/components/landing/marketing-strip";
import { MarketingManifesto } from "@/components/landing/marketing-manifesto";
import { MarketingSurveillance } from "@/components/landing/marketing-surveillance";
import { MarketingApogee } from "@/components/landing/marketing-apogee";
import { MarketingAdvertis } from "@/components/landing/marketing-advertis";
import { MarketingDiagnostic } from "@/components/landing/marketing-diagnostic";
import { MarketingGouverneurs } from "@/components/landing/marketing-gouverneurs";
import { MarketingPortails } from "@/components/landing/marketing-portails";
import { MarketingPricing } from "@/components/landing/marketing-pricing";
import { MarketingFaq } from "@/components/landing/marketing-faq";
import { MarketingFinale } from "@/components/landing/marketing-finale";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata: Metadata = {
  title: "La Fusée — Industry OS du marché créatif africain | UPgraders",
  description:
    "La Fusée, le produit d'UPgraders : diagnostic ADVE gratuit en 15 minutes · socle de marque /100 puis score complet /200 · radar 8 piliers · feuille de route stratégique. Gratuit, sans engagement.",
  openGraph: {
    title: "La Fusée — l'OS qui transforme les marques en icônes",
    description: "Diagnostic ADVE gratuit en 15 minutes, verdict immédiat. Socle /100 puis score complet /200.",
  },
};

/* La Fusée — the product sub-site (the Industry OS). UPgraders (the agency) is the
   public homepage at `/`; this is its flagship product surface, kept whole. */
export default function LaFuseePage() {
  return (
    <main>
      <MarketingNav />
      <MarketingHero />
      {/* Scroll-reveal orchestré (audit DS 2026-07-19) — hero et nav restent
          immédiats ; les 11 sections suivantes se révèlent au scroll. */}
      <RevealSections>
        {[
          <MarketingStrip key="strip" />,
          <MarketingManifesto key="manifesto" />,
          <MarketingSurveillance key="surveillance" />,
          <MarketingApogee key="apogee" />,
          <MarketingAdvertis key="advertis" />,
          <MarketingDiagnostic key="diagnostic" />,
          <MarketingGouverneurs key="gouverneurs" />,
          <MarketingPortails key="portails" />,
          <MarketingPricing key="pricing" />,
          <MarketingFaq key="faq" />,
          <MarketingFinale key="finale" />,
        ]}
      </RevealSections>
      <MarketingFooter />
    </main>
  );
}
