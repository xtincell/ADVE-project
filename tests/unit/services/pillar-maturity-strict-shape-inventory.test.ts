/**
 * Inventaire en lecture seule des formes ADVE refusées par le schéma strict
 * (RESIDUAL-DEBT « Formats ADVE legacy », étape 1). Fixtures synthétiques et canons
 * du dépôt chargés en mémoire ; aucune base, aucun modèle.
 */
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";
import { SPAWT_CANON_PILLARS } from "@/server/services/canon/spawt-canon";
import { MOTION19_CANON_PILLARS, MOTION19_FIELD_CERTAINTY } from "@/server/services/canon/motion19-canon";
import { LAFUSEE_CANON_PILLARS } from "@/server/services/canon/lafusee-canon";
import { classifyConformanceError, classifyPillarConformance } from "@/lib/types/pillar-conformance";
import { createCheckpoint, pillarMetadata } from "@/server/services/pillar-versioning/checkpoint";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import {
  assembleInventory,
  comparePaths,
  inventoryCanons,
  inventoryPillarContent,
  readAdveStrictShapeInventory,
  shortExcerpt,
  summarizeInventory,
  toPillarPath,
  type PillarArchive,
  type SourceRow,
} from "@/server/services/pillar-maturity/strict-shape-inventory";

const canon = (pillars: typeof UPGRADERS_CANON_PILLARS, key: string) =>
  structuredClone(pillars.find(p => p.key === key)!.content) as Record<string, any>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** V du canon UPgraders mis aux valeurs canoniques sur ses sept chemins refusés — fixture de test seulement. */
function validV() {
  const v = canon(UPGRADERS_CANON_PILLARS, "v");
  v.mvp.stage = "PRODUCT";
  v.packagingExperience.deliveryMode = "standard";
  v.packagingExperience.packagingMaterial = "premium";
  v.personaSegmentMap[0].devotionLevel = "ENGAGE";
  v.personaSegmentMap[1].devotionLevel = "PARTICIPANT";
  v.personaSegmentMap[2].devotionLevel = "INTERESSE";
  v.salesChannel = "DIRECT";
  return v;
}

/** Forme déclarée du corpus admis (valeurs/équipe), cf. pillar-a-source-shapes.test.ts. */
const LEGACY_VALUES = [
  { valeur: "Communauté avant funnel", rang: 3, justification: "La communauté produit la donnée." },
  { valeur: "Instinct avant formulaire", rang: 1, justification: "Observer les comportements réels." },
];

describe("forme valide → aucun chemin", () => {
  it("un V conforme au schéma strict ne produit aucun chemin refusé", () => {
    const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "v", content: validV() });
    expect(inv.contentState).toBe("PRESENT");
    expect(inv.findings).toEqual([]);
    expect(inv.maturity).not.toBeNull();
  });

  it("un pilier sans contenu n'est pas inventé en chemins absents", () => {
    for (const content of [null, undefined, "texte", []]) {
      const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "a", content });
      expect(inv.contentState).toBe("ABSENT");
      expect(inv.findings).toEqual([]);
    }
  });
});

describe("formes incompatibles connues → chemins exacts", () => {
  it("valeurs {valeur, rang, justification} : champs canoniques absents à côté de clés hors schéma, sans correspondance devinée", () => {
    const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "a", content: { valeurs: LEGACY_VALUES } });
    const valeurs = inv.findings.filter(f => f.topKey === "valeurs");
    expect(valeurs.map(f => f.path)).toEqual([
      "valeurs.0.costOfHolding", "valeurs.0.customName", "valeurs.0.rank", "valeurs.0.value",
      "valeurs.1.costOfHolding", "valeurs.1.customName", "valeurs.1.rank", "valeurs.1.value",
    ]);
    for (const f of valeurs) {
      expect(f.kind).toBe("MISSING");
      expect(f.situation).toBe("ABSENT_BESIDE_UNDECLARED_KEYS");
      expect(f.undeclaredSiblingKeys).toEqual(["rang", "valeur"]);
      expect(f.found).toBe("undefined");
      expect(f.excerpt).toBeNull();
      expect(f.pillarPath).toBe(f.path.replace(/\.(\d+)\./, "[$1]."));
    }
    // Un enum absent (`value`) est un champ manquant, pas une valeur hors énumération.
    expect(classifyConformanceError({ path: "x", message: "Invalid option", code: "invalid_value", received: "undefined" })).toBe("MISSING");
    expect(classifyConformanceError({ path: "x", message: "Invalid option", code: "invalid_value", received: "string" })).toBe("ENUM");
    // La justification est au bon endroit : rien à signaler, aucune suggestion de renommage.
    expect(valeurs.some(f => f.path.endsWith("justification"))).toBe(false);
    expect(JSON.stringify(inv)).not.toMatch(/suggest|rename|renomm/i);
  });

  it("énumération en français : refusée telle que stockée, alors que le normaliseur du gate l'absorbe", () => {
    const a = canon(UPGRADERS_CANON_PILLARS, "a");
    const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "a", content: a });
    const archetype = inv.findings.find(f => f.path === "archetype")!;
    expect(archetype).toMatchObject({
      kind: "ENUM", situation: "PRESENT_REFUSED", code: "invalid_value", found: "string",
      excerpt: JSON.stringify(a.archetype), countedPresentBy: ["archetype"],
    });
    // Contre-épreuve : la classification normalisée du gate ne voit plus ce chemin.
    expect(classifyPillarConformance("A", a).all.some(e => e.path === "archetype")).toBe(false);
  });

  it("scalaire à la place d'un objet (SHAPE) et prose à la place d'un booléen (TYPE)", () => {
    const a = { ...canon(UPGRADERS_CANON_PILLARS, "a"), ikigai: "pas un objet" };
    const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "a", content: a });
    expect(inv.findings.find(f => f.path === "ikigai")).toMatchObject({
      kind: "SHAPE", situation: "PRESENT_REFUSED", expected: "object", found: "string",
    });
    expect(inv.findings.find(f => f.path === "equipeComplementarite.couvertureTechnique")).toMatchObject({
      kind: "TYPE", situation: "PRESENT_REFUSED", expected: "boolean", found: "string",
    });
  });

  it("clés de premier niveau hors schéma signalées, métadonnées `_…` exclues", () => {
    const inv = inventoryPillarContent({ strategyId: "s1", pillarKey: "a",
      content: { valeurs: LEGACY_VALUES, ancienneCle: "x", _fieldProvenance: {} } });
    expect(inv.undeclaredTopKeys).toEqual(["ancienneCle"]);
  });
});

describe("origine, version, source et édition", () => {
  const brand = "strategy-1";
  const before = { archetype: "Sage", valeurs: LEGACY_VALUES };
  const middle = { archetype: "Créateur", valeurs: LEGACY_VALUES };
  const receipt = { sourceId: "src-1", contentHash: "" };
  const sourceRow: SourceRow = {
    id: "src-1", strategyId: brand, sourceType: "FILE", certainty: "OFFICIAL",
    rawContent: "Brand book", rawData: { _document: {
      schema: "document-edition-v1", edition: 2, status: "REFERENCE", family: "Brand book", kind: "BRAND_GUIDE",
      label: "v2", changeSummary: "Édition de référence", recordedAt: "2026-10-01T00:00:00.000Z",
    } }, extractedFields: null, fileName: "brandbook.pdf", fileType: "PDF",
  };
  receipt.contentHash = sourceFingerprint(sourceRow);
  const meta = pillarMetadata({ sources: null, fieldCertainty: null, confidence: null, validationStatus: "DRAFT", staleAt: null });
  const archives: PillarArchive[] = [
    { id: "pv1", version: 1, content: before, author: "seed", reason: "seed", intentId: null, createdAt: "2026-09-01T00:00:00.000Z" },
    { id: "pv2", version: 2, content: middle, author: "MESTOR", reason: "amend", intentId: "intent-2",
      createdAt: "2026-10-02T00:00:00.000Z",
      checkpoint: createCheckpoint(middle, { ...middle, archetype: "Créateur" }, meta, meta, 3, [receipt]) },
  ];

  it("retrouve la dernière écriture conservée, son intention et ses reçus documentaires", () => {
    const inv = inventoryPillarContent({
      strategyId: brand, pillarKey: "a", content: middle, currentVersion: 3, archives,
      intentKinds: new Map([["intent-2", "OPERATOR_AMEND_PILLAR"]]),
      sources: [receipt], sourceRows: new Map([["src-1", sourceRow]]),
    });
    const archetype = inv.findings.find(f => f.path === "archetype")!;
    expect(archetype.lastRetainedChange).toEqual({
      status: "CHANGED", fromVersion: 1, producedVersion: 2, at: "2026-09-01T00:00:00.000Z",
      author: "seed", reason: "seed", intentId: null, intentKind: null, sourceReceiptsUsed: null,
    });
    // Valeur inchangée dans toute l'histoire conservée.
    expect(inv.findings.find(f => f.path === "valeurs.0.value")!.lastRetainedChange)
      .toEqual({ status: "UNCHANGED_IN_RETAINED_HISTORY", oldestRetainedVersion: 1, retainedArchives: 2 });
    expect(inv.currentVersion).toBe(3);
    expect(inv.sources).toEqual([{
      sourceId: "src-1", receiptHash: receipt.contentHash, attachedToPillar: true, citedByFindings: 0,
      lookup: "FOUND", sameStrategy: true, sourceType: "FILE", certainty: "OFFICIAL", receiptMatchesCurrent: true,
      edition: { family: "Brand book", kind: "BRAND_GUIDE", label: "v2", edition: 2, status: "REFERENCE" },
    }]);
  });

  it("une écriture avec point de contrôle rattache ses sources au chemin qu'elle a introduit", () => {
    const current = { archetype: "Magicien", valeurs: LEGACY_VALUES };
    const inv = inventoryPillarContent({
      strategyId: brand, pillarKey: "a", content: current, currentVersion: 3, archives,
      intentKinds: new Map([["intent-2", "OPERATOR_AMEND_PILLAR"]]), sourceRows: new Map([["src-1", sourceRow]]),
    });
    const archetype = inv.findings.find(f => f.path === "archetype")!;
    expect(archetype.lastRetainedChange).toMatchObject({
      status: "CHANGED", fromVersion: 2, producedVersion: 3, intentId: "intent-2", intentKind: "OPERATOR_AMEND_PILLAR",
      sourceReceiptsUsed: [receipt],
    });
    expect(archetype.sourceIds).toEqual(["src-1"]);
    expect(inv.sources[0]).toMatchObject({ sourceId: "src-1", attachedToPillar: false, citedByFindings: 1, lookup: "FOUND" });
  });

  it("deux éditions d'un même document restent deux entrées : l'écriture a lu une édition, le pilier en cite une autre", () => {
    const later = { sourceId: "src-1", contentHash: "f".repeat(64) };
    const inv = inventoryPillarContent({
      strategyId: brand, pillarKey: "a", content: { archetype: "Magicien", valeurs: LEGACY_VALUES }, archives,
      sources: [later], sourceRows: new Map([["src-1", sourceRow]]),
    });
    expect(inv.sources.map(s => [s.receiptHash, s.attachedToPillar, s.citedByFindings, s.receiptMatchesCurrent])).toEqual([
      [receipt.contentHash, false, 1, true],
      [later.contentHash, true, 0, false],
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  });

  it("sans archive : NO_RETAINED_HISTORY, source non lue rapportée comme telle", () => {
    const inv = inventoryPillarContent({ strategyId: brand, pillarKey: "a", content: middle, sources: [receipt] });
    expect(inv.findings.every(f => f.lastRetainedChange.status === "NO_RETAINED_HISTORY")).toBe(true);
    expect(inv.sources[0]).toMatchObject({ lookup: "NOT_READ", receiptMatchesCurrent: null });
  });

  it("origine : la provenance canonique de feuille prime sur la certitude legacy préfixée", () => {
    const content = { archetype: "Créateur", archetypeSecondary: "Magicien", valeurs: LEGACY_VALUES, _fieldProvenance: { archetype: "HUMAN" } };
    const inv = inventoryPillarContent({ strategyId: brand, pillarKey: "a", content,
      fieldCertainty: { "a.archetype": "INFERRED", "a.archetypeSecondary": "INFERRED", "a.valeurs": "OFFICIAL" } });
    expect(inv.findings.find(f => f.path === "archetype")!.provenance).toBe("HUMAN");
    expect(inv.findings.find(f => f.path === "archetypeSecondary")!.provenance).toBe("INFERRED");
    expect(inv.findings.find(f => f.path === "valeurs.1.value")!.provenance).toBe("OFFICIAL");
    // Sans origine connue : null, jamais une origine supposée.
    const bare = inventoryPillarContent({ strategyId: brand, pillarKey: "a", content: middle });
    expect(bare.findings.every(f => f.provenance === null)).toBe(true);
  });
});

describe("extraits, ordre et stabilité", () => {
  it("extraits courts : courriels et numéros masqués, conteneurs résumés à leur forme", () => {
    expect(shortExcerpt("Écrire à contact@marque.example ou au +237 656 99 99 89")).toBe("\"Écrire à [courriel] ou au [numéro]\"");
    expect(shortExcerpt("x".repeat(80))).toBe(JSON.stringify(`${"x".repeat(47)}…`));
    expect(shortExcerpt([1, 2, 3])).toBe("[tableau de 3 éléments]");
    expect(shortExcerpt({ a: 1, b: 2 })).toBe("{objet : a, b}");
    expect(shortExcerpt(undefined)).toBeNull();
    const off = inventoryPillarContent({ strategyId: "s", pillarKey: "a", content: canon(UPGRADERS_CANON_PILLARS, "a"), includeExcerpts: false });
    expect(off.findings.every(f => f.excerpt === null)).toBe(true);
  });

  it("chemins en ordre naturel et notation pilier suivant les tableaux réellement stockés", () => {
    expect(["v.10.x", "v.2.x", "a", "v.2"].sort(comparePaths)).toEqual(["a", "v.2", "v.2.x", "v.10.x"]);
    expect(toPillarPath({ m: { "0": { k: 1 } }, l: [{ k: 1 }] }, "m.0.k")).toBe("m.0.k");
    expect(toPillarPath({ l: [{ k: 1 }] }, "l.0.k")).toBe("l[0].k");
  });

  it("même entrée dans un autre ordre → même JSON", () => {
    const one = inventoryPillarContent({ strategyId: "b", pillarKey: "e", content: canon(SPAWT_CANON_PILLARS, "e") });
    const two = inventoryPillarContent({ strategyId: "a", pillarKey: "v", content: canon(SPAWT_CANON_PILLARS, "v") });
    const three = inventoryPillarContent({ strategyId: "a", pillarKey: "a", content: canon(SPAWT_CANON_PILLARS, "a") });
    const meta = { mode: "CANONS" as const, pillars: ["a", "d", "v", "e"] as ("a" | "d" | "v" | "e")[], strategyFilter: null, snapshot: null };
    expect(JSON.stringify(assembleInventory([one, two, three], meta))).toBe(JSON.stringify(assembleInventory([three, one, two], meta)));
    expect(assembleInventory([one, two, three], meta).entries.map(e => `${e.strategyId}/${e.pillarKey}`)).toEqual(["a/a", "a/v", "b/e"]);
  });
});

describe("aucune écriture", () => {
  it("la lecture pure ne modifie pas les objets reçus", () => {
    const input = deepFreeze({
      strategyId: "s", pillarKey: "v" as const, content: canon(MOTION19_CANON_PILLARS, "v"),
      fieldCertainty: structuredClone(MOTION19_FIELD_CERTAINTY.v), sources: [{ sourceId: "legacy", field: "salesChannel" }],
    });
    const before = JSON.stringify(input);
    expect(() => inventoryPillarContent(input)).not.toThrow();
    expect(JSON.stringify(input)).toBe(before);
  });

  it("la lecture en base n'emploie que des lectures, dans une transaction READ ONLY en REPEATABLE READ", async () => {
    const calls: string[] = [];
    const reads = new Set(["findMany"]);
    const model = (name: string) => new Proxy({}, { get: (_t, method: string) => {
      if (!reads.has(method)) return () => { calls.push(`WRITE ${name}.${method}`); throw new Error(`écriture interdite ${name}.${method}`); };
      return async (args: any) => {
        calls.push(`${name}.${method}`);
        if (name === "pillar") return [{ id: "p1", strategyId: "s1", key: "a", content: { archetype: "Créateur", valeurs: LEGACY_VALUES },
          fieldCertainty: null, currentVersion: 2, validationStatus: "DRAFT", sources: null }];
        if (name === "strategy") return [{ id: "s1", name: "Marque synthétique", status: "ACTIVE" }];
        if (name === "pillarVersion") return [{ id: "pv1", pillarId: "p1", version: 1, content: { archetype: "Sage" },
          author: "seed", reason: null, intentId: null, createdAt: new Date("2026-09-01T00:00:00.000Z"), checkpoint: null }];
        void args;
        return [];
      };
    } });
    const tx = new Proxy({}, { get: (_t, prop: string) => {
      if (prop === "$executeRaw") return async (strings: TemplateStringsArray) => { calls.push(`EXEC ${strings.join("?")}`); return 0; };
      if (prop === "$queryRaw") return async (strings: TemplateStringsArray) => {
        const sql = strings.join("?");
        calls.push(`QUERY ${sql}`);
        return sql.includes("transaction_read_only") ? [{ transaction_read_only: "on" }] : [{ transaction_isolation: "repeatable read" }];
      };
      if (prop.startsWith("$")) return () => { calls.push(`WRITE ${prop}`); throw new Error(`appel interdit ${prop}`); };
      return model(prop);
    } });
    let txOptions: any;
    const client = { $transaction: async (fn: (t: unknown) => unknown, opts: unknown) => { txOptions = opts; return fn(tx); } };
    const inv = await readAdveStrictShapeInventory({ strategyIds: ["s1"] }, client as never);
    expect(calls[0]).toBe("EXEC SET TRANSACTION READ ONLY");
    expect(calls.filter(c => c.startsWith("WRITE"))).toEqual([]);
    expect(calls.filter(c => c.startsWith("EXEC"))).toEqual(["EXEC SET TRANSACTION READ ONLY"]);
    expect(txOptions.isolationLevel).toBe(Prisma.TransactionIsolationLevel.RepeatableRead);
    expect(inv.snapshot).toEqual({ readOnly: true, isolation: "REPEATABLE READ" });
    expect(inv.strategyFilter).toEqual(["s1"]);
    expect(inv.entries[0]!.findings.find(f => f.path === "archetype")!.lastRetainedChange)
      .toMatchObject({ status: "CHANGED", fromVersion: 1, producedVersion: 2 });
  });
});

describe("canons du dépôt chargés en mémoire", () => {
  const inv = inventoryCanons([
    { name: "spawt", pillars: SPAWT_CANON_PILLARS },
    { name: "motion19", pillars: MOTION19_CANON_PILLARS, fieldCertainty: MOTION19_FIELD_CERTAINTY },
    { name: "upgraders", pillars: UPGRADERS_CANON_PILLARS },
    { name: "lafusee", pillars: LAFUSEE_CANON_PILLARS },
  ]);

  it("seize piliers ADVE lus, totaux cohérents, aucune corruption de forme (cohérent avec canon-conformance)", () => {
    const t = inv.totals;
    expect(t.pillarsRead).toBe(16);
    expect(t.byKind.SHAPE).toBe(0);
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    expect(sum(t.byKind)).toBe(t.findings);
    expect(sum(t.bySituation)).toBe(t.findings);
    expect(sum(t.byPillar)).toBe(t.findings);
    expect(inv.entries.flatMap(e => e.findings).length).toBe(t.findings);
  });

  it("un pilier compté COMPLETE à 100 % peut porter des chemins refusés : la contradiction est rendue visible", () => {
    const complete = inv.entries.filter(e => e.maturity?.stage === "COMPLETE" && e.findings.length > 0);
    expect(complete.length).toBeGreaterThan(0);
    expect(complete.every(e => e.maturity!.completionPct === 100)).toBe(true);
  });

  it("Motion19 : les certitudes du seed sont reprises comme origine", () => {
    const a = inv.entries.find(e => e.strategyId === "canon:motion19" && e.pillarKey === "a")!;
    expect(a.findings.find(f => f.path === "archetype")?.provenance).toBe("INFERRED");
  });

  it("résumé lisible : en-tête lecture seule, chemins présents détaillés, absents seulement comptés", () => {
    const text = summarizeInventory(inv);
    expect(text).toContain("lecture seule");
    expect(text).toContain("canons du dépôt chargés en mémoire");
    expect(text).toMatch(/- archetype \[ENUM\]/);
    const absent = inv.entries.flatMap(e => e.findings).find(f => f.situation === "ABSENT");
    if (absent) expect(text).not.toContain(`- ${absent.path} [`);
  });
});
