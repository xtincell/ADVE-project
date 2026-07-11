/**
 * /cockpit/brand/strategy → redirect /cockpit/brand/strategie
 *
 * ADR-0030 PR-Fix-3 posait l'alias `/strategy` → `/roadmap` (pilier S).
 * Lot 10 (audit UX 2026-07-11 §B) : l'item de nav « Stratégie » est
 * désormais le hub R·T·I·S — l'alias est réaffecté vers ce hub, qui donne
 * accès au pilier S (« Plan », `/roadmap`) sans casser les liens existants.
 */

import { redirect } from "next/navigation";

export default function StrategyRedirectPage() {
  redirect("/cockpit/brand/strategie");
}
