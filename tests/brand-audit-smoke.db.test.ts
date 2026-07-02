import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du WP-016 (cockpit marque, vague 1) : les lectures de
 * profondeur (`getBrandRevisionAudit`, `getBrandScores`, `getBrandDeliverables`)
 * contre des lignes écrites par les VRAIS écrivains du produit — funnel intake
 * (reason "intake"), amendement opérateur, brouillon IA, dérivation RTIS.
 * Puis falsification SQL d'une révision → la rupture de chaîne DOIT se voir.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`) — skippé en CI et en
 * local sans env, la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`).
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

describe.skipIf(!SMOKE_URL)("WP-016 smoke DB — audit de révisions bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, brand, funnel, ai, deliverables] = await Promise.all([
      import("@/lib/db"),
      import("@/server/brand"),
      import("@/server/funnel"),
      import("@/server/ai/apply-draft"),
      import("@/server/deliverables"),
    ]);
    return { getDb, ...brand, ...funnel, ...ai, ...deliverables };
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("écritures réelles (intake→amend→draft IA→RTIS→Oracle) → chaînes OK, puis falsification → RUPTURE", async () => {
    const {
      getDb,
      submitIntake,
      convertLead,
      amendPillarField,
      deriveRtis,
      applyPillarDraft,
      composeOracleDeliverable,
      getBrandRevisionAudit,
      getBrandScores,
      getBrandDeliverables,
      scoreDimensions25,
    } = await services();
    const db = getDb();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ── Décor minimal : user + workspace + brand (comme post-inscription) ──
    const user = await db.user.create({
      data: { email: `smoke-wp016-${stamp}@test.local`, name: "Awa Smoke" },
    });
    const workspace = await db.workspace.create({
      data: { slug: `smoke-wp016-${stamp}`, name: `Smoke ${stamp}`, kind: "BRAND" },
    });
    const brand = await db.brand.create({
      data: {
        workspaceId: workspace.id,
        slug: `smoke-wp016-${stamp}`,
        name: `Marque ${stamp}`,
      },
    });

    // ── 1. Funnel réel : intake → conversion (seed piliers reason "intake") ──
    const { leadId } = await submitIntake({
      email: `smoke-wp016-${stamp}@test.local`,
      brandName: brand.name,
      answers: {
        A: { description: "Marque de boissons artisanales du Sahel." },
        D: { positionnement: "La seule limonade au bissap 100 % locale." },
      },
    });
    const converted = await convertLead(leadId, {
      userId: user.id,
      workspaceId: workspace.id,
    });
    expect(converted).not.toBeNull();

    // ── 2. Amendement opérateur (reason "operator_amend") ──
    await amendPillarField({
      brandId: brand.id,
      pillarKey: "A",
      fieldId: "archetype",
      value: "Créateur",
      actorId: user.id,
    });

    // ── 3. Brouillon IA appliqué (reason "ai_draft" — aucun LLM requis ici) ──
    const draft = await applyPillarDraft({
      brandId: brand.id,
      pillarKey: "E",
      drafts: { promesseExperience: "Chaque bouteille ouvre un moment de partage." },
      actorId: user.id,
    });
    expect(draft.applied).toContain("promesseExperience");

    // ── 4. Dérivation RTIS (reason "rtis_refresh" sur R/T/I/S) ──
    await deriveRtis({ brandId: brand.id, actorId: user.id });

    // ── 5. Oracle (Deliverable kind "oracle") ──
    await composeOracleDeliverable({ brandId: brand.id, actorId: user.id });

    // ── Lectures de profondeur : tout doit se recouper ──
    const audit = await getBrandRevisionAudit({ id: brand.id, workspaceId: workspace.id });

    // Chaque chaîne re-calculée depuis les données stockées est intacte.
    expect(audit.chains.length).toBeGreaterThanOrEqual(6); // A, D (intake) + E + R/T/I/S
    for (const chain of audit.chains) {
      expect(chain.status, `chaîne ${chain.pillarKey} devrait être OK`).toBe("OK");
      expect(chain.firstBreak).toBeNull();
    }
    expect(audit.timeline.every((entry) => entry.check === "ok")).toBe(true);

    // Les 4 formats d'écrivain sont représentés et vérifiés.
    const reasons = new Set(audit.timeline.map((entry) => entry.reason));
    expect(reasons).toEqual(new Set(["intake", "operator_amend", "ai_draft", "rtis_refresh"]));

    // Qui : l'acteur est résolu vers son nom.
    expect(audit.timeline.every((entry) => entry.actorLabel === "Awa Smoke")).toBe(true);

    // Quoi : l'amendement d'archetype est visible comme ajout de champ.
    const amendEntry = audit.timeline.find((entry) => entry.reason === "operator_amend");
    expect(amendEntry?.pillarKey).toBe("A");
    expect(amendEntry?.diff.added).toContain("archetype");

    // Historique des scores : chaque mutation en a persisté un, dimensions lisibles.
    const scores = await getBrandScores(brand.id);
    expect(scores.length).toBeGreaterThanOrEqual(4); // convert + amend + draft + derive
    const dims = scoreDimensions25(scores[0]!.dimensions);
    expect(Object.keys(dims).length).toBe(8);

    // Livrables : l'Oracle composé est listé.
    const deliverablesList = await getBrandDeliverables(brand.id);
    expect(deliverablesList.length).toBe(1);
    expect(deliverablesList[0]!.kind).toBe("oracle");
    expect(deliverablesList[0]!.status).toBe("READY");

    // ── Falsification a posteriori : réécrire le contenu d'une révision ──
    const revA = await db.pillarRevision.findFirst({
      where: { pillar: { brandId: brand.id, key: "A" } },
      orderBy: { version: "asc" },
      select: { id: true, version: true },
    });
    expect(revA).not.toBeNull();
    await db.pillarRevision.update({
      where: { id: revA!.id },
      data: { content: { nomMarque: "FALSIFIÉ A POSTERIORI" } },
    });

    const audit2 = await getBrandRevisionAudit({ id: brand.id, workspaceId: workspace.id });
    const chainA = audit2.chains.find((chain) => chain.pillarKey === "A");
    expect(chainA?.status).toBe("RUPTURE");
    expect(chainA?.firstBreak).toEqual({ version: revA!.version, kind: "hash_mismatch" });
    // Les autres chaînes restent intactes — la rupture est localisée.
    for (const chain of audit2.chains) {
      if (chain.pillarKey !== "A") expect(chain.status).toBe("OK");
    }
  });
});
