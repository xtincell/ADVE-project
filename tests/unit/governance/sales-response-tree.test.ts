/**
 * Sales Response Tree — Glory tool commercial (ADR-0104).
 *
 * Garde anti-drift du nouvel outil Artemis `sales-response-tree` :
 *   1. Présent dans EXTENDED, absent de CORE (préserve la cardinalité 56).
 *   2. HYBRID + parité manual-first (outputSchema === manualFormSchema) + natures.
 *   3. inputFields = le contexte de conversation attendu par le caller.
 *   4. Le contrat de sortie sait porter une décision complète (round-trip) et
 *      impose la cible minimale CRM (nom + téléphone) + les 2 déclencheurs
 *      d'escalade obligatoires (scénario non anticipé / demande explicite).
 *
 * Cf. docs/governance/adr/0104-sales-response-tree-glory-tool.md.
 */

import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import {
  ALL_GLORY_TOOLS,
  EXTENDED_GLORY_TOOLS,
  getGloryTool,
} from "@/server/services/artemis/tools/registry";
import { deriveJsonSchemaFromZod } from "@/server/services/utils/zod-to-json-schema";

const SLUG = "sales-response-tree";

describe("Sales Response Tree — Glory tool commercial (HARD)", () => {
  it("est enregistré dans EXTENDED et résoluble par slug", () => {
    const tool = getGloryTool(SLUG);
    expect(tool, `tool ${SLUG} introuvable`).toBeDefined();
    expect(EXTENDED_GLORY_TOOLS.some((t) => t.slug === SLUG)).toBe(true);
  });

  it("n'est PAS dans CORE (préserve la cardinalité 56)", () => {
    expect(ALL_GLORY_TOOLS.some((t) => t.slug === SLUG)).toBe(false);
  });

  it("est HYBRID, layer CR, ACTIVE", () => {
    const tool = getGloryTool(SLUG)!;
    expect(tool.executionType).toBe("HYBRID");
    expect(tool.layer).toBe("CR");
    expect(tool.status).toBe("ACTIVE");
  });

  it("respecte la parité manual-first (outputSchema === manualFormSchema)", () => {
    const tool = getGloryTool(SLUG)!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.manualFormSchema).toBeDefined();
    expect(tool.manualFormSchema).toBe(tool.outputSchema);
    expect(deriveJsonSchemaFromZod(tool.manualFormSchema!)).toEqual(
      deriveJsonSchemaFromZod(tool.outputSchema!),
    );
  });

  it("déclare des applicableNatures non vides (N6-bis)", () => {
    const tool = getGloryTool(SLUG)!;
    expect(Array.isArray(tool.applicableNatures)).toBe(true);
    expect(tool.applicableNatures!.length).toBe(9); // universel : tous les archétypes
  });

  it("attend le contexte de conversation en inputFields", () => {
    const tool = getGloryTool(SLUG)!;
    for (const field of [
      "channel",
      "inbound_message",
      "conversation_history",
      "known_lead",
      "prospect_context",
      "operator_mandate",
    ]) {
      expect(tool.inputFields, `inputField ${field} manquant`).toContain(field);
    }
  });

  it("ne se lie à aucun pilier ADVE (opère sur l'offre UPgraders)", () => {
    const tool = getGloryTool(SLUG)!;
    expect(tool.pillarKeys).toEqual([]);
    expect(tool.pillarBindings).toEqual({});
  });

  it("le contrat de sortie valide une décision commerciale complète (round-trip)", () => {
    const schema = getGloryTool(SLUG)!.outputSchema as ZodType<unknown>;
    const decision = {
      segment: "FOUNDER_BRAND",
      segmentConfidence: 0.82,
      segmentSignals: ["dit « ma marque », veut « passer un cap »"],
      aarrrObjective: "ACTIVATION",
      saleType: "INDIRECT",
      recommendedOffer: {
        primary: "Score ADVE gratuit + Oracle (Audit Express)",
        valueLadderTier: "TRIPWIRE",
        rationale: "Entrée à faible friction pour un fondateur en découverte.",
        nextBestOffer: "Cockpit mensuel",
      },
      channel: "WHATSAPP",
      suggestedReply:
        "Top, on peut diagnostiquer votre marque (score /200) gratuitement. C'est à quel nom, et quel numéro WhatsApp pour vous envoyer le lien ?",
      objectionHandled: null,
      leadCapture: {
        name: null,
        phone: null,
        email: null,
        company: "Matanga",
        missingRequired: ["name", "phone"],
        capturePrompt: "C'est à quel nom, et quel numéro WhatsApp ?",
        crmAction: "UPSERT_CONTACT",
        crmSource: "MANUAL",
        dealStageHint: "LEAD",
        consentToContact: true,
      },
      escalate: false,
      escalationReason: "NONE",
      operatorBrief: null,
      nextStep: "AWAIT_REPLY",
      confidence: 0.78,
    };
    const parsed = schema.safeParse(decision);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
  });

  it("impose la cible minimale CRM {name, phone} et la source MANUAL", () => {
    const schema = getGloryTool(SLUG)!.outputSchema as ZodType<unknown>;
    const json = deriveJsonSchemaFromZod(schema) as Record<string, unknown>;
    // missingRequired n'accepte que name|phone ; crmSource est le littéral MANUAL.
    const props = (json.properties as Record<string, { properties?: Record<string, unknown> }>) ?? {};
    const lead = props.leadCapture?.properties as Record<string, unknown> | undefined;
    expect(lead, "leadCapture absent du schéma").toBeDefined();
    // Round-trip négatif : une source ≠ MANUAL est rejetée.
    const bad = schema.safeParse({ crmSource: "SALESFORCE" });
    expect(bad.success).toBe(false);
  });

  it("accepte les 2 déclencheurs d'escalade obligatoires et rejette un motif inconnu", () => {
    const schema = getGloryTool(SLUG)!.outputSchema as ZodType<unknown>;
    const base = {
      segment: "UNKNOWN",
      segmentConfidence: 0.2,
      segmentSignals: [],
      aarrrObjective: "ACQUISITION",
      saleType: "INDIRECT",
      recommendedOffer: {
        primary: "Qualification",
        valueLadderTier: "FREE",
        rationale: "Signaux insuffisants.",
        nextBestOffer: null,
      },
      channel: "WHATSAPP",
      suggestedReply: "Je vous mets en relation avec un conseiller. Votre nom et numéro ?",
      objectionHandled: null,
      leadCapture: {
        name: null,
        phone: null,
        email: null,
        company: null,
        missingRequired: ["name", "phone"],
        capturePrompt: "Votre nom et numéro ?",
        crmAction: "UPSERT_CONTACT",
        crmSource: "MANUAL",
        dealStageHint: null,
        consentToContact: false,
      },
      escalate: true,
      operatorBrief: "Demande hors-script — à requalifier.",
      nextStep: "HANDOFF_OPERATOR",
      confidence: 0.3,
    } as const;

    for (const reason of ["UNANTICIPATED_SCENARIO", "EXPLICIT_CLIENT_REQUEST"]) {
      const ok = schema.safeParse({ ...base, escalationReason: reason });
      expect(ok.success, `motif ${reason} refusé`).toBe(true);
    }
    const ko = schema.safeParse({ ...base, escalationReason: "BECAUSE_I_SAID_SO" });
    expect(ko.success).toBe(false);
  });
});
