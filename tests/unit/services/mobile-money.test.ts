import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectProvider } from "@/server/services/mobile-money/index";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    paymentOrder: {
      create: vi.fn().mockResolvedValue({ id: "order-1", transactionRef: "ref-123" }),
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
    },
    commission: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// ============================================================
// Detection du fournisseur par numero de telephone
// ============================================================
describe("Mobile Money — Detection du Fournisseur", () => {
  describe("Detection Orange Money", () => {
    it("doit detecter Orange Money pour +237 69x", () => {
      expect(detectProvider("+237 691234567")).toBe("ORANGE");
    });

    it("doit detecter Orange Money pour +237 65x", () => {
      expect(detectProvider("+237 655123456")).toBe("ORANGE");
    });

    it("doit detecter Orange Money pour +237 68x", () => {
      expect(detectProvider("+237 681234567")).toBe("ORANGE");
    });

    it("doit gerer les numeros sans espaces", () => {
      expect(detectProvider("+237691234567")).toBe("ORANGE");
    });
  });

  describe("Detection MTN Mobile Money", () => {
    it("doit detecter MTN pour +237 67x", () => {
      expect(detectProvider("+237 671234567")).toBe("MTN");
    });

    it("doit detecter MTN pour +237 60x", () => {
      expect(detectProvider("+237 601234567")).toBe("MTN");
    });

    it("doit gerer les numeros MTN sans espaces", () => {
      expect(detectProvider("+237671234567")).toBe("MTN");
    });
  });

  describe("Fallback Wave", () => {
    it("doit retourner WAVE par defaut pour un numero non reconnu", () => {
      expect(detectProvider("+221771234567")).toBe("WAVE");
    });

    it("doit retourner WAVE pour un numero invalide", () => {
      expect(detectProvider("+000000000")).toBe("WAVE");
    });
  });

  describe("Gestion des formats de numero", () => {
    it("doit nettoyer les espaces dans le numero", () => {
      expect(detectProvider("+237 69 12 34 567")).toBe("ORANGE");
    });

    it("doit gerer un numero avec beaucoup d'espaces", () => {
      expect(detectProvider("+237   67   12 34 567")).toBe("MTN");
    });
  });
});

// ============================================================
// Initiation de paiement (avec mocks DB)
// ============================================================
describe("Mobile Money — Flux de Paiement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit exister une fonction initiatePayment exportee", async () => {
    const mod = await import("@/server/services/mobile-money/index");
    expect(typeof mod.initiatePayment).toBe("function");
  });

  it("doit exister une fonction handleWebhook exportee", async () => {
    const mod = await import("@/server/services/mobile-money/index");
    expect(typeof mod.handleWebhook).toBe("function");
  });

  it("doit exister une fonction payCommission exportee", async () => {
    const mod = await import("@/server/services/mobile-money/index");
    expect(typeof mod.payCommission).toBe("function");
  });
});

// ============================================================
// Gestion des Webhooks
// ============================================================
describe("Mobile Money — Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit retourner processed: false si pas de reference de transaction", async () => {
    const { handleWebhook } = await import("@/server/services/mobile-money/index");
    const { db } = await import("@/lib/db");

    const result = await handleWebhook("ORANGE", {});
    expect(result.processed).toBe(false);
  });

  it("doit retourner processed: false si l'ordre n'est pas trouve", async () => {
    const { handleWebhook } = await import("@/server/services/mobile-money/index");
    const { db } = await import("@/lib/db");

    (db.paymentOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await handleWebhook("ORANGE", { reference: "REF-UNKNOWN" });
    expect(result.processed).toBe(false);
  });

  it("doit traiter un webhook avec une reference valide", async () => {
    const { handleWebhook } = await import("@/server/services/mobile-money/index");
    const { db } = await import("@/lib/db");

    (db.paymentOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "order-1",
      transactionRef: "REF-123",
    });

    const result = await handleWebhook("ORANGE", {
      reference: "REF-123",
      status: "SUCCESS",
      providerRef: "ORANGE-TXN-456",
    });

    expect(result.processed).toBe(true);
    expect(result.orderId).toBe("order-1");
  });

  it("doit accepter differents noms de champs de reference selon le fournisseur", async () => {
    const { handleWebhook } = await import("@/server/services/mobile-money/index");
    const { db } = await import("@/lib/db");

    (db.paymentOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "order-2",
      transactionRef: "EXT-789",
    });

    // MTN utilise externalId
    const result = await handleWebhook("MTN", {
      externalId: "EXT-789",
      status: "SUCCESSFUL",
    });

    expect(result.processed).toBe(true);
  });

  it("doit accepter le champ transactionId comme reference", async () => {
    const { handleWebhook } = await import("@/server/services/mobile-money/index");
    const { db } = await import("@/lib/db");

    (db.paymentOrder.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "order-3",
      transactionRef: "TXN-999",
    });

    const result = await handleWebhook("WAVE", {
      transactionId: "TXN-999",
      status: "COMPLETED",
    });

    expect(result.processed).toBe(true);
  });
});
