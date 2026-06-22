"use client";

/**
 * /tarifs — page tarifs UPgraders (chrome UPgraders : SiteNav + SiteFooter).
 * UPgraders vend La Fusée : l'offre (audit / Oracle à l'acte + Cockpit/Retainer
 * en abonnement) est la même que /pricing, surfacée ici sous le site UPgraders.
 * Contenu partagé via <PricingGrid> (prix résolus par zone, déterministe).
 */

import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { PricingGrid } from "@/components/marketing/pricing-grid";

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="pt-16">
        <PricingGrid callbackPath="/tarifs" />
      </div>
      <SiteFooter />
    </div>
  );
}
