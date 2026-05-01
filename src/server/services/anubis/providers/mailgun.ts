/**
 * Mailgun façade (transactional email). Phase 15 stub.
 *
 * Credentials : { apiKey: string, domain: string, region: "us" | "eu" }
 * Config via : /console/anubis/credentials?type=mailgun
 */

import { createProviderFaçade } from "./_factory";

export const mailgunProvider = createProviderFaçade({
  connectorType: "mailgun",
  displayName: "Mailgun",
});
