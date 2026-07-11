/**
 * /cockpit/brand/rtis → redirect /cockpit/brand/strategie
 *
 * Dette (c) audit UX 2026-07-11 : le workflow RTIS legacy (triage de
 * recommandations par pilier + actualisation + transitions de statut,
 * ~1 300 l.) était opérateur-gated (lot 12) et en allowlist du test
 * vocabulaire. Ses capacités vivent sur les surfaces maintenues —
 * triage : Recommandations (`notoria-page`) + pages piliers
 * (`pillar-page`) ; recalcul : `recalculate-rtis-button` sur les hubs.
 * L'URL n'est pas supprimée (canon nav ADR-0122) : elle redirige vers le
 * hub Stratégie founder.
 */

import { redirect } from "next/navigation";

export default function RtisLegacyRedirectPage() {
  redirect("/cockpit/brand/strategie");
}
