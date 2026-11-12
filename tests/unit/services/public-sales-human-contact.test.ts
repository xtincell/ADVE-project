import { afterEach, describe, expect, it, vi } from "vitest";
import { projectPublicSalesHumanContact, publicSalesHumanContactSchema } from "@/server/services/crm-engine/public-entry-contract";

afterEach(() => vi.unstubAllEnvs());
describe("Owner-approved per-brand human contact", () => {
  it("accepts only a named international digit number and builds a safe WhatsApp link", () => {
    expect(projectPublicSalesHumanContact({ name: " Alexandre ", whatsapp: "237694171799" })).toEqual({ name: "Alexandre", whatsapp: "237694171799", whatsappUrl: "https://wa.me/237694171799" });
    for (const whatsapp of ["+237694171799", "237 694 17 17 99", "javascript:alert(1)", "1234567", "1".repeat(16), "0123456789"]) {
      expect(publicSalesHumanContactSchema.safeParse({ name: "Personne approuvée", whatsapp }).success).toBe(false);
    }
    expect(projectPublicSalesHumanContact({ name: "", whatsapp: "237694171799" })).toBeNull();
  });

  it("does not inherit UPgraders or payment defaults for another brand or an old conversation", () => {
    vi.stubEnv("MANUAL_PAYMENT_WHATSAPP_NUMBER", "237694171799");
    expect(projectPublicSalesHumanContact(undefined)).toBeNull(); expect(projectPublicSalesHumanContact(null)).toBeNull();
    expect(projectPublicSalesHumanContact({ name: "Alexandre", whatsapp: "237694171799", privateToken: "secret" })).toBeNull();
  });
});
