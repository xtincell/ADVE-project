/**
 * Meta Ads façade (Facebook + Instagram). Phase 15 stub — vrai SDK ajouté par PR dédiée.
 *
 * Credentials attendues dans ExternalConnector.config :
 *   { accessToken: string, businessAccountId: string, adAccountId: string }
 *
 * Configuration via Credentials Center : /console/anubis/credentials?type=meta-ads
 */

import { createProviderFaçade } from "./_factory";

export const metaAdsProvider = createProviderFaçade({
  connectorType: "meta-ads",
  displayName: "Meta Ads (Facebook + Instagram)",
  mockEstimatedReach: "50K-200K",
});
