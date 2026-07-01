/**
 * Email fallback façade — dev/test mode (logs only, no real send).
 *
 * Activé en l'absence de Mailgun ACTIVE. Permet aux flows comms de fonctionner
 * en dev local sans config externe — les "envois" sont juste loggés (le caller
 * doit activer un Mailgun credential pour envoyer en réel).
 *
 * Credentials attendues : aucune (fonctionne sans config). Pour l'activer
 * comme provider explicite, créer un ExternalConnector avec connectorType
 * "email-fallback" status ACTIVE.
 */

import { createProviderFaçade } from "./_factory";

export const emailFallbackProvider = createProviderFaçade({
  connectorType: "email-fallback",
  displayName: "Email Fallback (dev mode — logs only)",
});
