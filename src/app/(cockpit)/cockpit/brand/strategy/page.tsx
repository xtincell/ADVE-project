/**
 * /cockpit/brand/strategy → redirect /cockpit/brand/roadmap
 *
 * ADR-0030 PR-Fix-3 — incohérence UX historique : la sidebar affiche
 * "Stratégie" comme label, l'URL canonique est `/roadmap` (PILLAR_CONFIG
 * pillar-page.tsx:45). Un opérateur qui type naturellement `/strategy`
 * tombait sur 404. Cette redirect 308 résout sans casser les liens
 * existants vers `/roadmap`.
 */

import { redirect } from "next/navigation";

export default function StrategyRedirectPage() {
  redirect("/cockpit/brand/roadmap");
}
