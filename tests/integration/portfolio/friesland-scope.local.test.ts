/** Run only against a purpose-built disposable Unix-socket database. */
import { vi, beforeAll, expect, it, describe, afterAll } from "vitest";
// createCaller supplies the authenticated session. The Next HTTP adapter is outside this DB test.
vi.mock("@/lib/auth/types", () => ({}));
import { db } from "@/lib/db";
import { writeClientOrganization } from "@/server/services/client-organization";
import { seedStrategy } from "@/server/services/strategy-bootstrap";
import { ensureNodePlatform } from "@/server/services/brand-node/ensure-platform";
import { clientRouter } from "@/server/trpc/routers/client";
import { canAccessClient } from "@/server/services/operator-isolation";

const target = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/stub");
const localFixture =
  /^postgresql:\/\/f550@localhost:55491\/fr550\?host=\/tmp\/fr550\.[A-Za-z0-9]+$/.test(target.href) &&
  process.env.FR550_DISPOSABLE === "1";
const disposableVerify = ["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/shinkiro_verify";
describe.skipIf(!localFixture && !disposableVerify)(
  "native CRM + strategy bootstrap on a disposable PostgreSQL",
  () => {
    let op: string,
      other: string,
      group: string,
      wca: string,
      ng: string,
      actor: { id: string; operatorId: string; role: string },
      foreignParent: string;
    const proof = [
      {
        id: "source-a",
        type: "USER_DECLARATION",
        statement: "Groupe et deux entités de travail.",
        scope: "Structure uniquement.",
      },
    ];
    const key = `fixture-${Date.now()}`;
    beforeAll(async () => {
      const opData = (suffix: string) => ({
        name: key + suffix,
        slug: key + suffix,
        status: "ACTIVE" as const,
        licenseType: "TRIAL" as const,
        licensedAt: new Date(),
        licenseExpiry: new Date(),
      });
      op = (await db.operator.create({ data: opData("-a") })).id;
      other = (await db.operator.create({ data: opData("-b") })).id;
      actor = {
        id: (
          await db.user.create({
            data: {
              email: `${key}@example.invalid`,
              operatorId: op,
              role: "OPERATOR",
            },
          })
        ).id,
        operatorId: op,
        role: "OPERATOR",
      };
      const spec = {
        operatorId: op,
        data: {
          name: "Groupe de référence",
          status: "REFERENCE",
          organizationKind: "INTERNATIONAL_GROUP" as const,
          organizationKey: "group",
          organizationSourceRefs: proof,
        },
      };
      group = (await writeClientOrganization(db, actor, spec)).id;
      expect((await writeClientOrganization(db, actor, spec)).id).toBe(group);
      wca = (
        await writeClientOrganization(db, actor, {
          operatorId: op,
          data: {
            name: "Bureau régional",
            parentClientId: group,
            organizationKind: "REGIONAL_OFFICE",
            organizationSourceRefs: proof,
            country: "CI",
            notes: "Texte historique",
          },
        })
      ).id;
      ng = (
        await writeClientOrganization(db, actor, {
          operatorId: op,
          data: {
            name: "Filiale Nigeria",
            parentClientId: group,
            organizationKind: "GROUP_SUBSIDIARY",
            organizationSourceRefs: proof,
            country: "NG",
          },
        })
      ).id;
      foreignParent = (
        await db.client.create({
          data: { name: "Autre opérateur", operatorId: other },
        })
      ).id;
    });
    afterAll(() => db.$disconnect());
    it("keeps both siblings scoped and excludes the reference group from commercial totals", async () => {
      expect(
        await db.client.count({
          where: { operatorId: op, status: { not: "REFERENCE" } },
        }),
      ).toBe(2);
      expect(
        await db.client.count({
          where: { parentClientId: group, operatorId: op },
        }),
      ).toBe(2);
      expect(await db.client.count({ where: { parentClientId: wca } })).toBe(0);
      expect(
        await canAccessClient(group, {
          role: "USER",
          operatorId: null,
          userId: "collaborator",
        }),
      ).toBe(false);
      expect(
        await canAccessClient(ng, {
          role: "USER",
          operatorId: null,
          userId: "collaborator",
        }),
      ).toBe(false);
    });
    it("rejects cross-team and cyclic ancestry, obsolescence and archiving a live parent", async () => {
      const row = await db.client.findUniqueOrThrow({ where: { id: group } });
      for (const parentClientId of [ng, group, foreignParent]) {
        await expect(
          writeClientOrganization(db, actor, {
            operatorId: op,
            id: group,
            expectedUpdatedAt: row.updatedAt.toISOString(),
            data: { parentClientId, organizationSourceRefs: proof },
          }),
        ).rejects.toThrow();
      }
      await expect(
        writeClientOrganization(db, actor, {
          operatorId: op,
          id: group,
          expectedUpdatedAt: row.updatedAt.toISOString(),
          data: { status: "ARCHIVED" },
        }),
      ).rejects.toThrow();
      const child = await db.client.findUniqueOrThrow({ where: { id: wca } });
      await expect(
        writeClientOrganization(db, actor, {
          operatorId: op,
          id: wca,
          data: { organizationKey: "wca" },
          expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
        }),
      ).rejects.toThrow();
      const changed = await writeClientOrganization(db, actor, {
        operatorId: op,
        id: wca,
        data: { organizationKey: "wca" },
        expectedUpdatedAt: child.updatedAt.toISOString(),
      });
      expect(changed.notes).toBe("Texte historique");
      expect(changed.contactName).toBeNull();
      const archived = await db.client.create({
        data: { name: "Historique", operatorId: op, status: "ARCHIVED" },
      });
      await expect(
        writeClientOrganization(db, actor, {
          operatorId: op,
          id: wca,
          data: { parentClientId: archived.id, organizationSourceRefs: proof },
          expectedUpdatedAt: changed.updatedAt.toISOString(),
        }),
      ).rejects.toThrow();
    });
    it("does not infer Côte d’Ivoire from a regional office's headquarters", async () => {
      const ctx = {
        db,
        session: {
          expires: new Date(Date.now() + 3600000).toISOString(),
          user: actor,
        },
      };
      const s = await clientRouter
        .createCaller(ctx as any)
        .addBrand({
          name: "Dossier régional",
          clientId: wca,
          marketScale: "REGION",
          businessContext: { marketRegion: "Afrique de l’Ouest et du Centre" },
        });
      const regionClient = await clientRouter
        .createCaller(ctx as any)
        .get({ id: wca });
      expect(regionClient.parentClient).toMatchObject({
        id: group,
        organizationKind: "INTERNATIONAL_GROUP",
      });
      expect(s.countryCode).toBeNull();
      expect(s.currencyCode).toBeNull();
      expect(
        (
          await db.pillar.findFirstOrThrow({
            where: { strategyId: s.id, key: "a" },
          })
        ).content,
      ).toMatchObject({ pays: "" });
    });
    it("a founder's client list exposes only their own strategy and never sibling platforms or group references", async () => {
      const founder = await db.user.create({
        data: { email: `${key}-founder@example.invalid`, role: "USER" },
      });
      const ctx = {
        db,
        session: {
          expires: new Date(Date.now() + 3600000).toISOString(),
          user: { id: founder.id, role: "USER", operatorId: null },
        },
      };
      await db.$transaction((tx) =>
        seedStrategy(
          tx,
          { name: "Founder-specific", operatorId: op, clientId: wca },
          { id: founder.id },
        ),
      );
      const own = await clientRouter.createCaller(ctx as any).list({});
      expect(own.items).toHaveLength(1);
      expect(own.items[0]).toMatchObject({
        id: wca,
        parentClientId: null,
        organizationSourceRefs: null,
        notes: null,
      });
      expect(own.items[0]!.strategies.map((s) => s.name)).toEqual([
        "Founder-specific",
      ]);
      await expect(
        clientRouter.createCaller(ctx as any).get({ id: group }),
      ).rejects.toThrow();
      await expect(
        clientRouter.createCaller(ctx as any).get({ id: ng }),
      ).rejects.toThrow();
    });
    it("parallel requests converge on exactly one Nigerian dossier with its own intake and 8 pillars", async () => {
      const node = await db.brandNode.create({
        data: {
          name: "Peak Nigeria",
          slug: "peak-ng",
          nodeKind: "REGIONAL_BRAND",
          operatorId: op,
          clientId: ng,
          countryCode: "NG",
          lifecycle: "DRAFT",
        },
      });
      const input = {
        nodeId: node.id,
        operatorId: op,
        expectedUpdatedAt: node.updatedAt.toISOString(),
      };
      const attempts = await Promise.allSettled(
        [1, 2].map(() => ensureNodePlatform(db, input, actor, seedStrategy)),
      );
      expect(attempts.some((r) => r.status === "fulfilled")).toBe(true);
      const found = await ensureNodePlatform(db, input, actor, seedStrategy);
      expect(found).toMatchObject({
        countryCode: "NG",
        currencyCode: "NGN",
        clientId: ng,
      });
      expect(
        (
          await db.pillar.findFirstOrThrow({
            where: { strategyId: found.id, key: "a" },
          })
        ).content,
      ).toMatchObject({ pays: "NG" });
      expect(await db.strategy.count({ where: { clientId: ng } })).toBe(1);
      expect(await db.pillar.count({ where: { strategyId: found.id } })).toBe(
        8,
      );
      expect(
        await db.quickIntake.count({ where: { convertedToId: found.id } }),
      ).toBe(1);
    });
  },
);
