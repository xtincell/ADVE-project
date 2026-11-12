import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOD_MODE_EMAILS } from "@/lib/auth/god-mode";
import { publicSalesEntry } from "@/server/services/crm-engine/public-entry";

const state = vi.hoisted(() => ({
  author: { id: "founder", role: "FOUNDER", email: "" }, enabled: true,
  profileStatus: "ACTIVE", profileBrand: "brand", userRead: vi.fn(),
}));
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/services/crm-engine/portfolio", () => ({ assertSalesCatalogueOfferIn: vi.fn(), assertSalesPrincipalIn: vi.fn() }));
vi.mock("@/lib/db", () => {
  const database = {
    strategy: { findUnique: vi.fn(async () => ({ id: "brand", userId: "owner", operatorId: null, status: "ACTIVE", client: null })) },
    user: { findUnique: state.userRead },
    salesRepresentative: { findUnique: vi.fn(async () => ({ id: "seller-profile", strategyId: state.profileBrand, status: state.profileStatus, mode: "HUMAN", humanUserId: "seller", conversationId: "conversation" })) },
    intentEmission: { findUnique: vi.fn(async () => ({ strategyId: "brand", caller: "crm:saveSalesPublicEntry" })) },
    salesPublicEntry: { findUnique: vi.fn(async () => ({ publicId: "a".repeat(24), strategyId: "brand", representativeId: "seller-profile", enabled: state.enabled, intentId: "intent", authorizedBy: "founder", config: {
      strategyId: "brand", expectedRevision: 0, representativeId: "seller-profile", enabled: state.enabled, publicBrandName: "Public brand", welcome: "Votre question", market: "CI",
      humanContact: { name: "Équipe approuvée", whatsapp: "2250102030405" }, offers: [{ offerId: "gold", offerName: "Gold", offerVersion: "1", amount: 60000, currency: "XOF", terms: "Conditions approuvées", deliveryOwnerId: "owner", beneficiary: "La marque", paymentInstructions: "Moyen à convenir", expiresAt: "2030-01-01T00:00:00.000Z" }],
    } })) },
    $transaction: vi.fn(async (work: (tx: unknown) => unknown) => work(database)),
  };
  return { db: database };
});

beforeEach(() => {
  vi.clearAllMocks(); state.author = { id: "founder", role: "FOUNDER", email: GOD_MODE_EMAILS[0]! };
  state.enabled = true; state.profileStatus = "ACTIVE"; state.profileBrand = "brand";
  state.userRead.mockImplementation(async () => ({ ...state.author }));
});

describe("Public entry uses the canonical founder policy on fresh DB data", () => {
  it.each(["FOUNDER", "USER"])("accepts an allowlisted email even when the stored role is %s", async role => {
    state.author.role = role; state.author.email = GOD_MODE_EMAILS[0]!.toUpperCase();
    expect(await publicSalesEntry("a".repeat(24))).toMatchObject({ available: true, humanContact: { name: "Équipe approuvée" } });
    expect(state.userRead).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, role: true, email: true } }));
  });

  it("refuses a non-owner USER/FOUNDER without an allowlisted DB email", async () => {
    state.author.email = "not-allowlisted@example.invalid";
    for (const role of ["USER", "FOUNDER"]) {
      state.author.role = role;
      expect(await publicSalesEntry("a".repeat(24))).toMatchObject({ available: false, offers: [], humanContact: null });
    }
  });

  it("keeps the approved human fallback during seller pause, then honors closure and fresh email revocation", async () => {
    state.profileStatus = "PAUSED";
    expect(await publicSalesEntry("a".repeat(24))).toMatchObject({ available: false, humanContact: { whatsappUrl: "https://wa.me/2250102030405" } });
    state.enabled = false; expect((await publicSalesEntry("a".repeat(24))).humanContact).toBeNull();
    state.enabled = true; state.author.email = "revoked@example.invalid";
    expect((await publicSalesEntry("a".repeat(24))).humanContact).toBeNull();
  });

  it("does not let founder privilege admit a seller belonging to another brand", async () => {
    state.profileBrand = "foreign-brand";
    expect(await publicSalesEntry("a".repeat(24))).toMatchObject({ available: false, offers: [] });
  });
});
