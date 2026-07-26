/**
 * Vérifie l'intégration CinetPay « Aurore » v1 de bout en bout, SANS mouvement
 * d'argent (créer une session de paiement ≠ encaisser). Exerce le VRAI code du
 * provider (login OAuth → POST /v1/payment).
 *
 *   npx tsx scripts/verify-cinetpay.ts
 *
 * Lit CINETPAY_API_KEY / CINETPAY_API_PASSWORD / CINETPAY_BASE_URL depuis
 * l'environnement (.env.local chargé automatiquement si dotenv est présent).
 * N'affiche JAMAIS la valeur des secrets.
 *
 * ⚠️ À lancer depuis une machine dont l'IP publique est dans la « Liste Blanche
 * IP » du panel CinetPay (Ressources > API & sécurité). Sinon chaque appel est
 * rejeté (HTTP 401/403) quels que soient les identifiants — c'est le piège n°1.
 */
try {
  // Chargement best-effort de .env.local (no-op si dotenv absent ou env déjà exporté).
  const dotenv = (await import("dotenv")) as { config: (o: { path: string }) => void };
  dotenv.config({ path: ".env.local" });
} catch {
  /* env supposé déjà exporté dans le shell */
}

const { cinetpayProvider } = await import("../src/server/services/payment-providers/cinetpay");

function mask(name: string): string {
  const v = process.env[name];
  if (!v) return `${name} = ✗ ABSENT`;
  return `${name} = ✓ présent (${v.length} car)`;
}

async function main() {
  console.log("=== Vérification CinetPay Aurore v1 ===\n");
  console.log(mask("CINETPAY_API_KEY"));
  console.log(mask("CINETPAY_API_PASSWORD"));
  console.log(`CINETPAY_BASE_URL = ${process.env.CINETPAY_BASE_URL ?? "(défaut) https://api.cinetpay.net"}\n`);

  if (!cinetpayProvider.isConfigured()) {
    console.error("✗ Provider non configuré : CINETPAY_API_KEY + CINETPAY_API_PASSWORD requis dans .env.local.");
    process.exit(1);
  }

  console.log("→ Login + init d'une session de paiement TEST (100 XAF, référence jetable)…\n");
  try {
    const res = await cinetpayProvider.initPayment({
      reference: `verify-${Date.now()}`,
      amount: 100,
      currency: "XAF",
      description: "Verification integration Aurore (aucun encaissement)",
      returnUrl: "https://example.com/return",
      notifyUrl: "https://example.com/api/payment/webhook/cinetpay",
      customer: { name: "Test Verify", email: "test@example.com" },
    });
    console.log("✓ SUCCÈS — login OAuth + POST /v1/payment OK.");
    console.log(`  paymentUrl reçu : ${res.paymentUrl}`);
    if (res.providerRef) console.log(`  transactionId  : ${res.providerRef}`);
    console.log("\nL'intégration répond. (Session sandbox créée, aucun débit.)");
  } catch (err) {
    console.error("✗ ÉCHEC —", err instanceof Error ? err.message : err);
    console.error(
      "\nPistes : (1) IP publique non whitelistée → 401/403 ; " +
        "(2) champ requis manquant sur /v1/payment → ajuster le body du provider ; " +
        "(3) identifiants api_key/api_password erronés → 422 sur /v1/oauth/login.",
    );
    process.exit(1);
  }
}

void main();
