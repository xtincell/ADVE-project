"use client";

/**
 * Cockpit route — `/cockpit/intelligence/community` (P5).
 *
 * Durable path to the founder's community tracking surface : superfans, devotion
 * ladder, community health, follower totals — unified. Auth is handled by the
 * `(cockpit)` segment layout ; the paid-tier gate (FR32) is server-enforced
 * inside `cockpitDashboard.getCommunityDashboard` (read-only `.query` — no
 * mutation) ; `<CommunityPanel>` owns the data fetch + boundaries.
 */

import { Users } from "lucide-react";
import { CommunityPanel } from "@/components/cockpit/intelligence/community-panel";

export default function CockpitCommunityPage() {
  return (
    <section className="@container space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Users className="h-5 w-5 text-accent" aria-hidden />
          Suivi communauté
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
          Vos superfans, l'échelle de dévotion et la santé de votre communauté, réunis.
          La masse stratégique qui fait basculer votre secteur — suivie au fil du temps.
        </p>
      </header>

      <CommunityPanel />
    </section>
  );
}
