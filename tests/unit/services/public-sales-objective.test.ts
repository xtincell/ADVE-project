import { describe, expect, it } from "vitest";
import { publicSalesObjective, saveSalesPublicEntryInput } from "@/server/services/crm-engine/public-entry-contract";

const entry = {
  strategyId: "brand", expectedRevision: 0, representativeId: "seller", enabled: true,
  publicBrandName: "Marque", welcome: "Bienvenue.", market: "Abidjan",
  offers: [{ offerId: "gold", offerVersion: "1", offerName: "Gold", terms: "Conditions approuvées.", deliveryOwnerId: "owner",
    expiresAt: "2030-01-01T00:00:00.000Z", currency: "XOF" }],
};

describe("the seller's objective on a public entry", () => {
  it("defaults to the first payment for a sale and to a qualified contact for an enquiry", () => {
    expect(publicSalesObjective({})).toBe("FIRST_PAYMENT");
    expect(publicSalesObjective({ informationOnly: true })).toBe("QUALIFIED_CONTACT");
    expect(publicSalesObjective({ informationOnly: false, objective: "QUALIFIED_CONTACT" })).toBe("QUALIFIED_CONTACT");
  });

  it("refuses an enquiry that would aim at a payment, and keeps older entries without an objective valid", () => {
    expect(saveSalesPublicEntryInput.safeParse({ ...entry, informationOnly: true, objective: "FIRST_PAYMENT" }).success).toBe(false);
    expect(saveSalesPublicEntryInput.safeParse({ ...entry, informationOnly: true, objective: "QUALIFIED_CONTACT" }).success).toBe(true);
    expect(saveSalesPublicEntryInput.safeParse({ ...entry, informationOnly: true }).success).toBe(true);
    expect(saveSalesPublicEntryInput.safeParse({ ...entry, informationOnly: true, objective: "OTHER" }).success).toBe(false);
  });
});
