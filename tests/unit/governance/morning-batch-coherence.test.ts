/**
 * Anti-drift CI test — Phase 18-A1-β/γ/δ schema cohérence avec ADRs.
 *
 * Vérifie que les modèles Prisma reflètent bien :
 *  - β : CampaignChangeRequest avec ticketCode unique + 4 enums (ChangeRequestImpact, ChangeRequestStatus)
 *  - γ : OperatorAction avec 6 indexes + 2 enums (OperatorActionCategory, OperatorActionSource)
 *  - δ : IngestedSource + MorningBriefBatch + BriefIngestionDraft + 4 enums + provenance chain CampaignBrief.sourceIngestedId
 *
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(__dirname, "../../../prisma/schema.prisma");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

function extractModelBlock(schema: string, modelName: string): string {
  const re = new RegExp(`^model ${modelName} \\{([\\s\\S]*?)^\\}`, "m");
  const match = schema.match(re);
  if (!match) throw new Error(`Model ${modelName} introuvable`);
  return match[1] ?? "";
}

function extractEnumBlock(schema: string, enumName: string): string {
  const re = new RegExp(`^enum ${enumName} \\{([\\s\\S]*?)^\\}`, "m");
  const match = schema.match(re);
  if (!match) throw new Error(`Enum ${enumName} introuvable`);
  return match[1] ?? "";
}

describe("morning-batch-coherence — Phase 18-A1-β CampaignChangeRequest (TICKETS MODIFS)", () => {
  const schema = readSchema();

  it("model CampaignChangeRequest existe avec ticketCode unique", () => {
    expect(schema).toMatch(/^model CampaignChangeRequest \{/m);
    const block = extractModelBlock(schema, "CampaignChangeRequest");
    expect(block).toMatch(/ticketCode\s+String\s+@unique/);
  });

  it("CampaignChangeRequest a tous les champs ADR-0052 §audit V4 TICKETS MODIFS", () => {
    const block = extractModelBlock(schema, "CampaignChangeRequest");
    const required = [
      "ticketCode",
      "campaignDeliverableId",
      "requestedByName",
      "requestedAt",
      "description",
      "impact",
      "status",
      "assignedToUserId",
      "resolvedAt",
      "resolutionNotes",
      "newBriefVersionId",
    ];
    for (const f of required) {
      expect(block, `champ manquant: ${f}`).toMatch(new RegExp(`\\b${f}\\b`));
    }
  });

  it("enum ChangeRequestImpact a 4 valeurs canoniques", () => {
    const block = extractEnumBlock(schema, "ChangeRequestImpact");
    for (const v of ["COSMETIC", "MINOR", "MAJOR", "OUT_OF_SCOPE"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });

  it("enum ChangeRequestStatus a 5 états workflow", () => {
    const block = extractEnumBlock(schema, "ChangeRequestStatus");
    for (const v of ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", "ESCALATED"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });
});

describe("morning-batch-coherence — Phase 18-A1-γ OperatorAction (ACTIONS V4)", () => {
  const schema = readSchema();

  it("model OperatorAction existe", () => {
    expect(schema).toMatch(/^model OperatorAction \{/m);
  });

  it("OperatorAction a tous les champs ADR-0052 §audit V4 ACTIONS", () => {
    const block = extractModelBlock(schema, "OperatorAction");
    const required = [
      "operatorId", "label", "context", "priority", "category", "source",
      "campaignId", "deliverableIds", "assigneeUserId", "done", "doneAt", "dueDate",
    ];
    for (const f of required) {
      expect(block, `champ manquant: ${f}`).toMatch(new RegExp(`\\b${f}\\b`));
    }
  });

  it("OperatorAction a 6 indexes pour filtres dashboard", () => {
    const block = extractModelBlock(schema, "OperatorAction");
    expect(block).toContain("@@index([operatorId, done])");
    expect(block).toContain("@@index([priority])");
    expect(block).toContain("@@index([category])");
    expect(block).toContain("@@index([campaignId])");
    expect(block).toContain("@@index([assigneeUserId])");
    expect(block).toContain("@@index([dueDate])");
  });

  it("enum OperatorActionCategory aligné V4 (5 valeurs)", () => {
    const block = extractEnumBlock(schema, "OperatorActionCategory");
    for (const v of ["BEFORE_DEPARTURE", "SYSTEM", "FOLLOWUPS", "PRODUCTION", "OTHER"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });

  it("enum OperatorActionSource aligné V4 (7 valeurs)", () => {
    const block = extractEnumBlock(schema, "OperatorActionSource");
    for (const v of ["GMAIL", "SLACK", "WHATSAPP", "VERBAL", "BRIEF", "SYSTEM", "OTHER"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });
});

describe("morning-batch-coherence — Phase 18-A1-δ Morning Brief Batch (SIGNAUX V4)", () => {
  const schema = readSchema();

  it("3 models morning-batch existent", () => {
    expect(schema).toMatch(/^model IngestedSource \{/m);
    expect(schema).toMatch(/^model MorningBriefBatch \{/m);
    expect(schema).toMatch(/^model BriefIngestionDraft \{/m);
  });

  it("IngestedSource a rawSnippet @db.Text + threadKey + redactedFields", () => {
    const block = extractModelBlock(schema, "IngestedSource");
    expect(block).toMatch(/rawSnippet\s+String\s+@db\.Text/);
    expect(block).toContain("threadKey");
    expect(block).toContain("redactedFields");
  });

  it("MorningBriefBatch a stats LLM + state machine", () => {
    const block = extractModelBlock(schema, "MorningBriefBatch");
    for (const f of ["state", "rawInput", "sourceCount", "briefCount", "llmConfidenceMean", "llmTotalTokens", "llmCostUsd"]) {
      expect(block, `champ manquant: ${f}`).toMatch(new RegExp(`\\b${f}\\b`));
    }
  });

  it("BriefIngestionDraft a payload Json + classification + state staging", () => {
    const block = extractModelBlock(schema, "BriefIngestionDraft");
    for (const f of ["batchId", "sourceId", "classification", "resolvedNodeId", "resolvedNodePath", "resolvedCampaignId", "payload", "confidence", "state", "materializedCampaignBriefId"]) {
      expect(block, `champ manquant: ${f}`).toMatch(new RegExp(`\\b${f}\\b`));
    }
  });

  it("CampaignBrief.sourceIngestedId existe pour provenance chain", () => {
    const block = extractModelBlock(schema, "CampaignBrief");
    expect(block).toContain("sourceIngestedId");
    expect(block).toMatch(/sourceIngested\s+IngestedSource\?\s+@relation\("CampaignBriefSource"/);
  });

  it("4 enums morning-batch ADR-0055", () => {
    const kinds = extractEnumBlock(schema, "IngestedSourceKind");
    for (const v of ["EMAIL", "SLACK", "WHATSAPP", "MANUAL_PASTE", "FILE_UPLOAD"]) {
      expect(kinds).toMatch(new RegExp(`\\b${v}\\b`));
    }
    const states = extractEnumBlock(schema, "MorningBriefBatchState");
    for (const v of ["ANALYZING", "READY_FOR_REVIEW", "PARTIAL_VALIDATED", "FULLY_VALIDATED", "DISCARDED"]) {
      expect(states).toMatch(new RegExp(`\\b${v}\\b`));
    }
    const classes = extractEnumBlock(schema, "BriefIngestionClassification");
    for (const v of ["NEW_BRIEF", "UPDATE_OF_BRIEF", "NON_BRIEF", "OPS_ACTION", "AMBIGUOUS"]) {
      expect(classes).toMatch(new RegExp(`\\b${v}\\b`));
    }
    const draftStates = extractEnumBlock(schema, "BriefIngestionDraftState");
    for (const v of ["PENDING_REVIEW", "ACCEPTED", "REJECTED", "EDITED", "MATERIALIZED", "AUTO_MATERIALIZED"]) {
      expect(draftStates).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });
});

describe("morning-batch-coherence — Phase 18-A1-α V4 alignment", () => {
  const schema = readSchema();

  it("Campaign a creativeState/clientState enums + isCritical + priority", () => {
    const block = extractModelBlock(schema, "Campaign");
    expect(block).toMatch(/creativeState\s+CreativeProductionStatus/);
    expect(block).toMatch(/clientState\s+ClientReviewStatus/);
    expect(block).toMatch(/isCritical\s+Boolean\s+@default\(false\)/);
    expect(block).toMatch(/priority\s+OperationalPriority/);
  });

  it("CampaignDeliverable a taskCode (V4 sheet TÂCHES format)", () => {
    const block = extractModelBlock(schema, "CampaignDeliverable");
    expect(block).toMatch(/taskCode\s+String\?/);
    expect(block).toContain("@@index([taskCode])");
  });

  it("enum CreativeProductionStatus aligné V4 (5 valeurs avec emojis officiels)", () => {
    const block = extractEnumBlock(schema, "CreativeProductionStatus");
    for (const v of ["BRIEF_RECU", "BRIEF_QUALIFIE", "EN_PRODUCTION", "BLOQUE", "LIVRE"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });

  it("enum OperationalPriority a 4 valeurs CRITIQUE/HAUTE/MOYENNE/BASSE V4", () => {
    const block = extractEnumBlock(schema, "OperationalPriority");
    for (const v of ["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"]) {
      expect(block).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });
});
