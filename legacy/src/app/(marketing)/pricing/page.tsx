"use client";

/**
 * /pricing — grille tarifaire publique localisée (chrome La Fusée).
 * Le contenu est partagé avec /tarifs (chrome UPgraders) via <PricingGrid> —
 * même source de vérité (prix résolus par zone, déterministe), deux habillages.
 */

import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { PricingGrid } from "@/components/marketing/pricing-grid";

export default function PricingPage() {
  return (
    <div data-theme="bone" className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <PricingGrid callbackPath="/pricing" />
      <MarketingFooter />
    </div>
  );
}
