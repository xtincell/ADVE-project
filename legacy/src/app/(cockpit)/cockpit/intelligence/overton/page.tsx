"use client";

/**
 * Cockpit route — `/cockpit/intelligence/overton` (Phase 23 Epic 7 Story 7.5,
 * FR30 + FR32 + UX-DR11).
 *
 * A durable, deliberate path to the founder's sectoral Overton state (not just
 * the dashboard teaser). The route file owns presentation framing only — auth is
 * handled by the `(cockpit)` segment layout, the paid-tier gate (FR32) is
 * server-enforced inside `cockpitDashboard.overtonSignal` (a read-only `.query`
 * — the route exposes no mutation), and `<OvertonPanel>` owns the data fetch +
 * boundary. Non-paid tiers see the upgrade CTA, never a blank page.
 */

import { Radar } from "lucide-react";
import { OvertonPanel } from "@/components/cockpit/intelligence/overton-panel";

export default function CockpitOvertonPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Radar className="h-5 w-5 text-accent" aria-hidden />
          Overton sectoriel
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
          Voyez votre secteur se redéfinir autour de votre marque : qui reprend votre langage,
          qui vous cite sans payer, et comment le centre culturel de votre secteur se déplace.
        </p>
      </header>

      <OvertonPanel />
    </section>
  );
}
