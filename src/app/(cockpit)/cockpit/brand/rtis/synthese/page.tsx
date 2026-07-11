/**
 * /cockpit/brand/rtis/synthese → redirect /cockpit/brand/strategie
 *
 * Dette (c) audit UX 2026-07-11 : la synthèse S legacy (lecture pilier S +
 * métriques d'engagement) est couverte par le hub Stratégie (pilier S /
 * « Plan ») et le portail communauté (`/cockpit/intelligence/community`).
 * URL préservée par redirect (canon nav ADR-0122).
 */

import { redirect } from "next/navigation";

export default function RtisSyntheseLegacyRedirectPage() {
  redirect("/cockpit/brand/strategie");
}
