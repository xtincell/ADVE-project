/**
 * Anti-drift CI test — Phase 18 (ADR-0059) Brand Tree cohérence schéma + ADR alignment.
 *
 * Vérifie que le schéma Prisma reflète bien les contraintes ADR-0059 :
 * - Modèle `BrandNode` existe avec tous les champs requis (parent self-ref, nodeKind, nodeNature, etc.)
 * - Modèle `CampaignDeliverable` existe avec tous les champs matrice 6D
 * - Extensions Campaign (creativeState/clientState/healthSignal/manualRagOverride/commentsLatest)
 * - Extension CampaignTeamMember (delegatedToOperatorId)
 * - Extension ClientAllocation (scopeNodeId/scopeMode)
 * - L'enum BrandNature contient les 9 valeurs canoniques
 *
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux. Si quelqu'un retire un champ
 * ou renomme un model sans propager dans 7 sources de vérité, ce test casse en CI.
 *
 * Cf. [docs/governance/adr/0059-brand-tree-multi-archetype.md](../../../docs/governance/adr/0059-brand-tree-multi-archetype.md).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(__dirname, "../../../prisma/schema.prisma");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

describe("brand-tree-coherence — schéma Prisma reflète ADR-0059", () => {
  const schema = readSchema();

  it("model BrandNode est défini", () => {
    expect(schema).toMatch(/^model BrandNode \{/m);
  });

  it("BrandNode a parent self-ref via parentNodeId", () => {
    const block = extractModelBlock(schema, "BrandNode");
    expect(block).toContain("parentNodeId");
    expect(block).toMatch(/parent\s+BrandNode\?\s+@relation\("BrandNodeTree"/);
    expect(block).toMatch(/children\s+BrandNode\[\]\s+@relation\("BrandNodeTree"\)/);
  });

  it("BrandNode a tous les champs ADR-0059 §1.1", () => {
    const block = extractModelBlock(schema, "BrandNode");
    const requiredFields = [
      "name",
      "slug",
      "operatorId",
      "clientId",
      "parentNodeId",
      "nodeKind",
      "nodeNature",
      "nodeRole",
      "pillarOverrides",
      "inheritanceLocked",
      "countryCode",
      "clusterTag",
      "lifecycle",
      "pillarSnapshotAtTransfer",
      "strategyId",
      "createdAt",
      "updatedAt",
      "archivedAt",
    ];
    for (const field of requiredFields) {
      expect(block, `BrandNode champ manquant: ${field}`).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it("BrandNode index sur (operatorId, clientId), parentNodeId, (nodeNature, clusterTag)", () => {
    const block = extractModelBlock(schema, "BrandNode");
    expect(block).toContain("@@index([operatorId, clientId])");
    expect(block).toContain("@@index([parentNodeId])");
    expect(block).toContain("@@index([nodeNature, clusterTag])");
  });

  it("BrandNode unique constraint (operatorId, slug) pour éviter conflits slugs", () => {
    const block = extractModelBlock(schema, "BrandNode");
    expect(block).toContain("@@unique([operatorId, slug])");
  });

  it("model CampaignDeliverable est défini", () => {
    expect(schema).toMatch(/^model CampaignDeliverable \{/m);
  });

  it("CampaignDeliverable a tous les champs matrice 6D ADR-0059 §8", () => {
    const block = extractModelBlock(schema, "CampaignDeliverable");
    const requiredFields = [
      "campaignId",
      "targetNodeId",
      "countryCode",
      "clusterTag",
      "deliverableType",
      "language",
      "promoTag",
      "status",
      "rag",
      "manualRagOverride",
      "brandAssetId",
      "delegatedToOperatorId",
      "dueDate",
      "deliveredAt",
      "validatedAt",
    ];
    for (const field of requiredFields) {
      expect(block, `CampaignDeliverable champ manquant: ${field}`).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it("Campaign a workflow dual + RAG (extension ADR-0059 §9)", () => {
    const block = extractModelBlock(schema, "Campaign");
    expect(block).toContain("creativeState");
    expect(block).toContain("clientState");
    expect(block).toContain("healthSignal");
    expect(block).toContain("manualRagOverride");
    expect(block).toContain("commentsLatest");
    expect(block).toContain("@@index([healthSignal])");
  });

  it("Campaign a relation deliverables vers CampaignDeliverable", () => {
    const block = extractModelBlock(schema, "Campaign");
    expect(block).toMatch(/deliverables\s+CampaignDeliverable\[\]/);
  });

  it("CampaignTeamMember a delegatedToOperatorId (cas sous-trait agence Ghana)", () => {
    const block = extractModelBlock(schema, "CampaignTeamMember");
    expect(block).toContain("delegatedToOperatorId");
    expect(block).toContain("@@index([delegatedToOperatorId])");
  });

  it("ClientAllocation a scopeNodeId + scopeMode (permissions par sous-arbre)", () => {
    const block = extractModelBlock(schema, "ClientAllocation");
    expect(block).toContain("scopeNodeId");
    expect(block).toContain("scopeMode");
    expect(block).toContain("@@index([scopeNodeId])");
  });

  it("Operator a relations brandNodes + delegatedDeliverables", () => {
    const block = extractModelBlock(schema, "Operator");
    expect(block).toMatch(/brandNodes\s+BrandNode\[\]/);
    expect(block).toMatch(/delegatedDeliverables\s+CampaignDeliverable\[\]\s+@relation\("DeliverableDelegate"\)/);
  });

  it("Client a relation brandNodes", () => {
    const block = extractModelBlock(schema, "Client");
    expect(block).toMatch(/brandNodes\s+BrandNode\[\]/);
  });

  it("Strategy a relation brandNodes", () => {
    const block = extractModelBlock(schema, "Strategy");
    expect(block).toMatch(/brandNodes\s+BrandNode\[\]/);
  });

  it("BrandAsset a relation deliverables", () => {
    const block = extractModelBlock(schema, "BrandAsset");
    expect(block).toMatch(/deliverables\s+CampaignDeliverable\[\]/);
  });

  it("enum BrandNature contient les 9 valeurs canoniques (ADR-0061)", () => {
    const enumBlock = extractEnumBlock(schema, "BrandNature");
    const expected = [
      "PRODUCT",
      "SERVICE",
      "CHARACTER_IP",
      "FESTIVAL_IP",
      "MEDIA_IP",
      "RETAIL_SPACE",
      "PLATFORM",
      "INSTITUTION",
      "PERSONAL",
    ];
    for (const value of expected) {
      expect(enumBlock, `BrandNature value missing: ${value}`).toMatch(new RegExp(`\\b${value}\\b`));
    }
  });
});

describe("brand-tree-coherence — ADR-0059 référencé dans NEFER + plan", () => {
  it("ADR-0059 file existe", () => {
    const adrPath = join(__dirname, "../../../docs/governance/adr/0059-brand-tree-multi-archetype.md");
    expect(() => readFileSync(adrPath, "utf-8")).not.toThrow();
  });

  it("plan PHASE-18-MATANGA-FC.md existe", () => {
    const planPath = join(__dirname, "../../../docs/governance/plans/PHASE-18-MATANGA-FC.md");
    expect(() => readFileSync(planPath, "utf-8")).not.toThrow();
  });

  it("ADR-0060 (manual-first) référencé dans ADR-0059", () => {
    const adr0052 = readFileSync(
      join(__dirname, "../../../docs/governance/adr/0059-brand-tree-multi-archetype.md"),
      "utf-8",
    );
    expect(adr0052).toContain("ADR-0060");
    expect(adr0052).toContain("manual-first");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function extractModelBlock(schema: string, modelName: string): string {
  const re = new RegExp(`^model ${modelName} \\{([\\s\\S]*?)^\\}`, "m");
  const match = schema.match(re);
  if (!match) {
    throw new Error(`Model ${modelName} introuvable dans schema.prisma`);
  }
  return match[1] ?? "";
}

function extractEnumBlock(schema: string, enumName: string): string {
  const re = new RegExp(`^enum ${enumName} \\{([\\s\\S]*?)^\\}`, "m");
  const match = schema.match(re);
  if (!match) {
    throw new Error(`Enum ${enumName} introuvable dans schema.prisma`);
  }
  return match[1] ?? "";
}
