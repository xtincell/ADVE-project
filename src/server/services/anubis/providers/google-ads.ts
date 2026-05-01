/**
 * Google Ads façade. Phase 15 stub — vrai SDK ajouté par PR dédiée.
 *
 * Credentials attendues dans ExternalConnector.config :
 *   { developerToken: string, customerId: string, refreshToken: string }
 *
 * Configuration via Credentials Center : /console/anubis/credentials?type=google-ads
 */

import { createProviderFaçade } from "./_factory";

export const googleAdsProvider = createProviderFaçade({
  connectorType: "google-ads",
  displayName: "Google Ads",
  mockEstimatedReach: "100K-500K",
});
