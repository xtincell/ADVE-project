import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the CRM engine
vi.mock("@/lib/db", () => ({
  db: {
    quickIntake: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    funnelMapping: {
      create: vi.fn().mockReturnValue(Promise.resolve({})),
      findFirst: vi.fn().mockReturnValue(Promise.resolve(null)),
      update: vi.fn().mockReturnValue(Promise.resolve({})),
      updateMany: vi.fn(),
    },
    strategy: {
      create: vi.fn(),
    },
    cRMActivity: {
      create: vi.fn().mockReturnValue(Promise.resolve({})),
    },
  },
}));

// ============================================================
// Progression des etapes de Deal
// ============================================================
describe("CRM Engine — Progression des Etapes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit avancer un deal de LEAD a QUALIFIED", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-1",
      stage: "LEAD",
      notes: null,
    });

    const result = await advanceDeal("deal-1");
    expect(result.success).toBe(true);
    expect(result.stage).toBe("QUALIFIED");
  });

  it("doit avancer un deal de QUALIFIED a PROPOSAL", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-2",
      stage: "QUALIFIED",
      notes: null,
    });

    const result = await advanceDeal("deal-2");
    expect(result.success).toBe(true);
    expect(result.stage).toBe("PROPOSAL");
  });

  it("doit avancer un deal de PROPOSAL a NEGOTIATION", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-3",
      stage: "PROPOSAL",
      notes: null,
    });

    const result = await advanceDeal("deal-3");
    expect(result.success).toBe(true);
    expect(result.stage).toBe("NEGOTIATION");
  });

  it("doit avancer un deal de NEGOTIATION a WON", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-4",
      stage: "NEGOTIATION",
      notes: null,
    });

    const result = await advanceDeal("deal-4");
    expect(result.success).toBe(true);
    expect(result.stage).toBe("WON");
  });

  it("ne doit pas avancer un deal deja en phase WON", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-5",
      stage: "WON",
      notes: null,
    });

    const result = await advanceDeal("deal-5");
    expect(result.success).toBe(false);
    expect(result.stage).toBe("WON");
  });

  it("ne doit pas avancer un deal en phase LOST", async () => {
    const { advanceDeal } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-6",
      stage: "LOST",
      notes: null,
    });

    const result = await advanceDeal("deal-6");
    expect(result.success).toBe(false);
    expect(result.stage).toBe("LOST");
  });
});

// ============================================================
// Estimation de la valeur du Deal par secteur/modele
// ============================================================
describe("CRM Engine — Estimation de la Valeur du Deal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit estimer la valeur pour le secteur FMCG en B2C", async () => {
    const { createDealFromIntake } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.quickIntake.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "intake-1",
      contactName: "Test",
      contactEmail: "test@test.com",
      companyName: "FMCG Corp",
      sector: "FMCG",
      businessModel: "B2C",
    });
    (db.deal.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => Promise.resolve({ id: "deal-new", ...data }));

    await createDealFromIntake("intake-1");

    expect(db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 5000000, // FMCG * B2C(1.0)
          currency: "XAF",
        }),
      })
    );
  });

  it("doit estimer la valeur pour le secteur BANQUE en B2B", async () => {
    const { createDealFromIntake } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.quickIntake.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "intake-2",
      contactName: "Banker",
      contactEmail: "bank@test.com",
      companyName: "Big Bank",
      sector: "BANQUE",
      businessModel: "B2B",
    });
    (db.deal.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => Promise.resolve({ id: "deal-new-2", ...data }));

    await createDealFromIntake("intake-2");

    expect(db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 22500000, // BANQUE(15M) * B2B(1.5)
        }),
      })
    );
  });

  it("doit estimer la valeur pour le secteur STARTUP en D2C", async () => {
    const { createDealFromIntake } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.quickIntake.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "intake-3",
      contactName: "Founder",
      contactEmail: "founder@startup.com",
      companyName: "NewStartup",
      sector: "STARTUP",
      businessModel: "D2C",
    });
    (db.deal.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => Promise.resolve({ id: "deal-new-3", ...data }));

    await createDealFromIntake("intake-3");

    expect(db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 1600000, // STARTUP(2M) * D2C(0.8)
        }),
      })
    );
  });

  it("doit utiliser la valeur par defaut pour un secteur inconnu", async () => {
    const { createDealFromIntake } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.quickIntake.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "intake-4",
      contactName: "Unknown",
      contactEmail: "u@test.com",
      companyName: "Unknown Co",
      sector: "UNKNOWN_SECTOR",
      businessModel: "UNKNOWN_MODEL",
    });
    (db.deal.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => Promise.resolve({ id: "deal-new-4", ...data }));

    await createDealFromIntake("intake-4");

    expect(db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 5000000, // default(5M) * default(1.0)
        }),
      })
    );
  });

  it("doit gerer le cas ou secteur et modele sont null", async () => {
    const { createDealFromIntake } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.quickIntake.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "intake-5",
      contactName: "Null",
      contactEmail: "null@test.com",
      companyName: "Null Co",
      sector: null,
      businessModel: null,
    });
    (db.deal.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => Promise.resolve({ id: "deal-new-5", ...data }));

    await createDealFromIntake("intake-5");

    expect(db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 5000000, // default(5M) * default(1.0)
        }),
      })
    );
  });
});

// ============================================================
// Vue d'ensemble du Pipeline
// ============================================================
describe("CRM Engine — Vue d'Ensemble du Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit retourner un pipeline avec toutes les etapes", async () => {
    const { getPipelineOverview } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { stage: "LEAD", value: 1000000 },
      { stage: "LEAD", value: 2000000 },
      { stage: "QUALIFIED", value: 5000000 },
      { stage: "PROPOSAL", value: 8000000 },
      { stage: "WON", value: 15000000 },
    ]);

    const pipeline = await getPipelineOverview();

    expect(pipeline.LEAD.count).toBe(2);
    expect(pipeline.LEAD.totalValue).toBe(3000000);
    expect(pipeline.QUALIFIED.count).toBe(1);
    expect(pipeline.QUALIFIED.totalValue).toBe(5000000);
    expect(pipeline.PROPOSAL.count).toBe(1);
    expect(pipeline.WON.count).toBe(1);
    expect(pipeline.WON.totalValue).toBe(15000000);
  });

  it("doit retourner un pipeline vide quand il n'y a pas de deals", async () => {
    const { getPipelineOverview } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const pipeline = await getPipelineOverview();

    expect(pipeline.LEAD.count).toBe(0);
    expect(pipeline.QUALIFIED.count).toBe(0);
    expect(pipeline.PROPOSAL.count).toBe(0);
    expect(pipeline.NEGOTIATION.count).toBe(0);
    expect(pipeline.WON.count).toBe(0);
  });

  it("doit gerer les deals avec valeur nulle", async () => {
    const { getPipelineOverview } = await import("@/server/services/crm-engine/index");
    const { db } = await import("@/lib/db");

    (db.deal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { stage: "LEAD", value: null },
      { stage: "LEAD", value: 3000000 },
    ]);

    const pipeline = await getPipelineOverview();
    expect(pipeline.LEAD.count).toBe(2);
    expect(pipeline.LEAD.totalValue).toBe(3000000);
  });
});
