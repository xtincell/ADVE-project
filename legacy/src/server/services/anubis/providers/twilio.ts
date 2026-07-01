/**
 * Twilio façade (SMS + Voice). Phase 15 stub.
 *
 * Credentials : { accountSid: string, authToken: string, fromNumber: string }
 * Config via : /console/anubis/credentials?type=twilio
 */

import { createProviderFaçade } from "./_factory";

export const twilioProvider = createProviderFaçade({
  connectorType: "twilio",
  displayName: "Twilio",
});
