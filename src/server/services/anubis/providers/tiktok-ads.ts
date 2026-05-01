/**
 * TikTok Ads façade. Phase 15 stub.
 *
 * Credentials : { advertiserId: string, accessToken: string }
 * Config via : /console/anubis/credentials?type=tiktok-ads
 */

import { createProviderFaçade } from "./_factory";

export const tiktokAdsProvider = createProviderFaçade({
  connectorType: "tiktok-ads",
  displayName: "TikTok Ads",
  mockEstimatedReach: "30K-150K",
});
