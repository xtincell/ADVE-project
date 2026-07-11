"use client";

/**
 * /cockpit/operate/calendar — LE calendrier du founder (lot 13, audit UX
 * 2026-07-11 [M01-02]/[M07-05]). Fusionne les deux surfaces temporelles qui
 * se concurrençaient dans la nav : le calendrier de lancement (prélancement
 * digital) et le plan d'actions (ex-/operate/roadmap, désormais redirect
 * 308 vers ?vue=actions). Un seul item « Calendrier », deux vues.
 */

import { useState, useEffect } from "react";
import { Tabs } from "@/components/shared/tabs";
import { LaunchCalendarPanel } from "@/components/cockpit/launch-calendar-panel";
import { RoadmapCalendarPanel } from "@/components/cockpit/roadmap-calendar-panel";

export default function LaunchCalendarRoute() {
  const [vue, setVue] = useState<"lancement" | "actions">("lancement");

  // Vue initiale depuis l'URL (?vue=actions — cible du redirect legacy).
  // Lu au montage côté client, pas de useSearchParams (évite le bail-out
  // CSR/Suspense au prerender — même pattern que strategy-context).
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("vue");
    if (fromUrl === "actions") setVue("actions");
  }, []);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "lancement", label: "Lancement" },
          { key: "actions", label: "Plan d'actions" },
        ]}
        activeTab={vue}
        onChange={(key) => setVue(key as "lancement" | "actions")}
      />
      {vue === "lancement" ? <LaunchCalendarPanel /> : <RoadmapCalendarPanel />}
    </div>
  );
}
