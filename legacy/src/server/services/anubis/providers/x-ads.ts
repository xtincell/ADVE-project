/**
 * X (Twitter) Ads façade. Phase 15 stub.
 *
 * Credentials : { apiKey: string, apiSecret: string, accountId: string }
 * Config via : /console/anubis/credentials?type=x-ads
 */

import { createProviderFaçade } from "./_factory";

export const xAdsProvider = createProviderFaçade({
  connectorType: "x-ads",
  displayName: "X Ads (Twitter)",
  mockEstimatedReach: "10K-80K",
});
