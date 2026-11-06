import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
// createCaller supplies the authenticated session. The Next HTTP adapter is outside this DB test.
vi.mock("@/lib/auth/types", () => ({}));
import { db } from "@/lib/db";
import { createTRPCRouter } from "@/server/trpc/init";
import { strategyRouter } from "@/server/trpc/routers/strategy";
import { clientRouter } from "@/server/trpc/routers/client";

describe("Cockpit & Client Strategy Creation Alignment", () => {
  let user: any;
  let client: any;
  const strategiesToDelete: string[] = [];

  beforeAll(async () => {
    // 1. Find or create a user & operator to mock session
    user = await db.user.findFirst({
      where: { email: "system@lafusee.io" }
    });
    if (!user) {
      user = await db.user.create({
        data: {
          email: "system@lafusee.io",
          name: "System",
          role: "ADMIN"
        }
      });
    }

    // 2. Find or create a client to test clientRouter.addBrand
    let operator = await db.operator.findUnique({where:{slug:"test-operator"}});
    if (!operator) {
      operator = await db.operator.create({
        data: {
          name: "Test Operator",
          slug: "test-operator",
          status: "ACTIVE",
          licenseType: "OWNER",
          licensedAt: new Date(),
          licenseExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000)
        }
      });
    }
    client = await db.client.findFirst({
      where: { operatorId: operator.id, name:"Test Client Company" }
    });
    if (!client) {
      client = await db.client.create({
        data: {
          name: "Test Client Company",
          contactName: "John Doe",
          contactEmail: "john@example.com",
          sector: "TECH",
          country: "CM",
          operatorId: operator.id
        }
      });
    }
  });

  afterAll(async () => {
    // Clean up created strategies and related data
    for (const stratId of strategiesToDelete) {
      await db.brandDataSource.deleteMany({ where: { strategyId: stratId } });
      await db.quickIntake.deleteMany({ where: { convertedToId: stratId } });
      await db.pillar.deleteMany({ where: { strategyId: stratId } });
      await db.variableStoreConfig.deleteMany({ where: { strategyId: stratId } });
      await db.brandOSConfig.deleteMany({ where: { strategyId: stratId } });
      await db.deal.deleteMany({ where: { strategyId: stratId } });
      await db.strategy.delete({ where: { id: stratId } }).catch(() => {});
    }
  });

  it("strategyRouter.create mutation initializes QuickIntake and BrandDataSource with nested responses", async () => {
    const ctx = {
      db,
      session: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          operatorId: null
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString()
      }
    };

    const router = createTRPCRouter({ strategy: strategyRouter });
    const caller = router.createCaller(ctx as any);

    const testBrandName = `Test Cockpit Brand ${Date.now()}`;
    
    const strategy = await caller.strategy.create({
      name: testBrandName,
      description: "A brand created directly in the cockpit",
      sector: "BTP",
      country: "Cameroun",
      businessContext: {
        businessModel: "PRODUCTION",
        economicModels: ["VOLUME"],
        positioningArchetype: "MAINSTREAM"
      }
    });

    expect(strategy).toBeDefined();
    expect(strategy.id).toBeDefined();
    strategiesToDelete.push(strategy.id);

    // Verify QuickIntake was created
    const quickIntake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id }
    });
    expect(quickIntake).toBeDefined();
    expect(quickIntake!.companyName).toBe(testBrandName);
    expect(quickIntake!.status).toBe("CONVERTED");

    // Check responses are nested
    const responses = quickIntake!.responses as any;
    expect(responses).toBeDefined();
    expect(responses.biz).toBeDefined();
    expect(responses.biz.biz_model).toBe("PRODUCTION");
    expect(responses.a).toBeDefined();
    expect(responses.a).toEqual({});

    // Verify BrandDataSource was created
    const dataSource = await db.brandDataSource.findFirst({
      where: { strategyId: strategy.id, sourceType: "MANUAL_INPUT" }
    });
    expect(dataSource).toBeDefined();
    expect(dataSource!.origin).toBe(`intake:${quickIntake!.id}`);
    expect(dataSource!.rawContent).toContain("=== Fiche d'Intake :");
    expect(dataSource!.rawContent).toContain("Modèle d'affaires: PRODUCTION");
    
    // Check BrandDataSource rawData/extractedFields are nested too
    const rawData = dataSource!.rawData as any;
    expect(rawData).toBeDefined();
    expect(rawData.biz).toBeDefined();
    expect(rawData.biz.biz_model).toBe("PRODUCTION");
  });

  it("clientRouter.addBrand mutation initializes QuickIntake and BrandDataSource with nested responses using declared client sector only", async () => {
    const ctx = {
      db,
      session: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          operatorId: null
        },
        expires: new Date(Date.now() + 3600 * 1000).toISOString()
      }
    };

    const router = createTRPCRouter({ client: clientRouter });
    const caller = router.createCaller(ctx as any);

    const testBrandName = `Test Client Brand ${Date.now()}`;
    
    const strategy = await caller.client.addBrand({
      clientId: client.id,
      name: testBrandName,
      description: "A brand created from client detail screen",
      businessContext: {
        businessModel: "SERVICES",
        economicModels: ["ABONNEMENT"],
        positioningArchetype: "PREMIUM"
      }
    });

    expect(strategy).toBeDefined();
    expect(strategy.id).toBeDefined();
    strategiesToDelete.push(strategy.id);

    // Only the declared sector is inherited. A client headquarters does not declare the market.
    const quickIntake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id }
    });
    expect(quickIntake).toBeDefined();
    expect(quickIntake!.companyName).toBe(testBrandName);
    expect(quickIntake!.sector).toBe("TECH");
    expect(quickIntake!.country).toBeNull();
    expect(quickIntake!.status).toBe("CONVERTED");

    // Check responses are nested
    const responses = quickIntake!.responses as any;
    expect(responses).toBeDefined();
    expect(responses.biz).toBeDefined();
    expect(responses.biz.biz_model).toBe("SERVICES");
    expect(responses.a).toBeDefined();
    expect(responses.a).toEqual({});

    // Verify BrandDataSource was created
    const dataSource = await db.brandDataSource.findFirst({
      where: { strategyId: strategy.id, sourceType: "MANUAL_INPUT" }
    });
    expect(dataSource).toBeDefined();
    expect(dataSource!.origin).toBe(`intake:${quickIntake!.id}`);
    expect(dataSource!.rawContent).toContain("=== Fiche d'Intake :");
    expect(dataSource!.rawContent).toContain("Modèle d'affaires: SERVICES");
  });
});
