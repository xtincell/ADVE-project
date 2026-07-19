export const dynamic = "force-dynamic";
/**
 * Cron — la RÉDACTION d'Argos tourne (Phase A état-final, boucle AUDIENCE).
 *
 * L'audit Argos 2026-07-16 : « zéro déclencheur autonome — chaque chasse est
 * un clic console ; le corpus public = données seed ». Ce cron donne la
 * cadence : à chaque passage (hebdo via scheduled-ops), Hunter chasse jusqu'à
 * N sujets RÉELS — les marques du répertoire Seshat (scannées par le /scorer
 * ou la mesure officielle, secteur connu de préférence) qui n'ont pas encore
 * de dossier de référence. Le média couvre le championnat, pas des sujets
 * inventés.
 *
 * Garde-fous inchangés : gated `isTextLLMAvailable` (pas de chasse sans
 * provider), émission via le SPINE (ADR-0124 — même mécanique que
 * governedProcedure, jamais un bypass), quarantaine + verdict de sûreté
 * déterministe d'Argos intouchés (auto-publish seulement sur PASS ; le REJECT
 * et le QUARANTINE attendent la revue opérateur en console).
 */
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";

const HUNTS_PER_RUN = 3;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { isTextLLMAvailable } = await import("@/server/services/llm-gateway");
    if (!isTextLLMAvailable()) {
      return NextResponse.json({ ok: true, deferred: "no_text_llm", hunts: 0 });
    }

    // Sujets : dernières observations du répertoire (distinct par marque),
    // secteur connu d'abord, sans dossier Argos existant sur ce nom.
    const observed = await db.brandFootprintSnapshot.findMany({
      orderBy: { capturedAt: "desc" },
      distinct: ["brandKey"],
      select: { name: true, sectorSlug: true, countryCode: true, total: true },
      take: 60,
    });
    const existing = await db.campaignReferenceDossier.findMany({ select: { brand: true } });
    const covered = new Set(existing.map((d) => d.brand.trim().toLowerCase()));
    const subjects = observed
      .filter((o) => !covered.has(o.name.trim().toLowerCase()))
      .sort((a, b) => (b.sectorSlug ? 1 : 0) - (a.sectorSlug ? 1 : 0) || (b.total ?? 0) - (a.total ?? 0))
      .slice(0, HUNTS_PER_RUN);

    const { openEmission, closeEmission } = await import("@/server/governance/emission-spine");
    const { harvestReference } = await import("@/server/services/seshat/argos");
    const results: Array<{ brand: string; status: string }> = [];
    for (const s of subjects) {
      const payload = {
        brand: s.name,
        sector: s.sectorSlug ?? undefined,
        market: s.countryCode ?? undefined,
      };
      let intentId: string | null = null;
      try {
        intentId = await openEmission({
          kind: "SESHAT_HARVEST_REFERENCE",
          payload,
          caller: "cron:argos-hunt",
        });
        const dossier = await harvestReference({ ...payload, intentEmissionId: intentId });
        await closeEmission({ intentId, status: "OK", result: { ref: dossier.ref, verdict: dossier.safetyVerdict } });
        results.push({ brand: s.name, status: dossier.safetyVerdict });
      } catch (err) {
        if (intentId) {
          await closeEmission({
            intentId,
            status: "FAILED",
            result: { error: err instanceof Error ? err.message : String(err) },
          }).catch(() => {});
        }
        results.push({ brand: s.name, status: "ERROR" });
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: subjects.length,
      hunts: results,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
