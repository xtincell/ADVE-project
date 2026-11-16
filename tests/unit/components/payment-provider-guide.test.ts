import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentProviderGuide, type PaymentProviderGuideProps } from "@/components/console/payment-provider-guide";

const render = (providerId: PaymentProviderGuideProps["providerId"], configured = true) => renderToStaticMarkup(createElement(PaymentProviderGuide, {
  providerId, configured, enabled: false, onToggleEnabled: () => undefined, baseUrl: "https://example.test",
}));

describe("payment configuration guide follows each provider's credential contract", () => {
  it("directs CinetPay to encrypted admin settings without claiming an env-only contract or verified payments", () => {
    const html = render("CINETPAY");
    expect(html).toContain('href="/console/config/integrations#email-paiement"');
    expect(html).toContain("Configurer CinetPay");
    expect(html).toContain("coffre chiffré");
    expect(html).toContain("configuration du serveur");
    expect(html).toContain("Accès renseignés · non vérifiés");
    expect(html).toContain("ne confirme pas la validation du compte marchand");
    expect(html).not.toMatch(/uniquement en env vars|Jamais en DB|Env vars OK|Vercel/);
    expect(html).toContain("https://example.test/api/payment/webhook/cinetpay");
  });
  it("keeps activation disabled when CinetPay credentials are incomplete", () => {
    const html = render("CINETPAY", false);
    expect(html).toContain("Accès à compléter");
    expect(html).toContain("renseignez d’abord les accès CinetPay");
    expect(html).toMatch(/type="checkbox"[^>]*disabled=""/);
    expect(html).not.toContain("Env vars manquantes");
  });
  it.each(["STRIPE", "PAYPAL"] as const)("preserves %s's environment-only secret instructions", provider => {
    const html = render(provider);
    expect(html).toContain("uniquement en env vars");
    expect(html).toContain("Jamais en DB");
    expect(html).toContain("1. Configurer les env vars (Vercel Dashboard)");
    expect(html).toContain("Env vars OK");
    expect(html).not.toContain("Configurer CinetPay");
  });
});
