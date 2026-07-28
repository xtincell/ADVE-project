export const dynamic = "force-dynamic";
/**
 * État complet d'une marque, lisible serveur-à-serveur (opérateur, CRON_SECRET).
 *
 * LECTURE SEULE. `brand-scan` répond « où cette chaîne apparaît-elle ? » ;
 * il ne répond pas « que contient CETTE marque, exactement ? ». Or c'est la
 * question qu'il faut pouvoir poser avant toute consolidation : on ne fusionne
 * pas deux fiches sans avoir lu les deux, et on ne décide pas de ce qu'on garde
 * en devinant ce qui s'y trouve.
 *
 * Le besoin est né d'un cas réel : deux fiches SPAWT coexistent, l'une désignée
 * canonique par l'opérateur mais plus pauvre, l'autre riche d'informations
 * vraies que personne n'a inventées. Archiver l'une ou l'autre perd de la
 * vérité — encore faut-il pouvoir constater laquelle porte quoi.
 *
 *   GET /api/admin/brand-dump?strategyId=…            (ou ?name=SPAWT)
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Rend : les piliers (contenu intégral + provenance par champ), les sources
 * (avec le compte réel de fragments indexés — « déposé » ≠ « exploitable »),
 * le score et l'état. Aucune écriture : la correction passe par la voie
 * gouvernée `OPERATOR_AMEND_PILLAR`, jamais par ici.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/** Borne de sortie : un dump n'est utile que s'il reste lisible. */
const MAX_SOURCE_PREVIEW = 400;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const strategyId = url.searchParams.get("strategyId");
  const name = url.searchParams.get("name");
  // `pillars=0` allège la réponse quand on ne veut que l'inventaire des sources.
  const withPillars = url.searchParams.get("pillars") !== "0";

  if (!strategyId && !name) {
    return NextResponse.json(
      { error: "Fournir ?strategyId=… ou ?name=… (recherche partielle, insensible à la casse)." },
      { status: 400 },
    );
  }

  const strategies = await db.strategy.findMany({
    where: strategyId
      ? { id: strategyId }
      : { name: { contains: name!, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      status: true,
      publicSlug: true,
      userId: true,
      marketScale: true,
      addressableAudience: true,
      brandFoundedYear: true,
      apogeeTier: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { name: true, sector: true } },
      user: { select: { email: true, name: true, role: true } },
    },
    take: 10,
  });

  if (strategies.length === 0) {
    return NextResponse.json({ ok: true, found: 0, brands: [] });
  }

  const brands = [];
  for (const s of strategies) {
    const [pillars, sources, indexed, assets] = await Promise.all([
      withPillars
        ? db.pillar.findMany({
            where: { strategyId: s.id },
            select: {
              key: true,
              content: true,
              validationStatus: true,
              completionLevel: true,
              confidence: true,
              fieldCertainty: true,
              staleAt: true,
              currentVersion: true,
              updatedAt: true,
            },
            orderBy: { key: "asc" },
          })
        : Promise.resolve([]),
      db.brandDataSource.findMany({
        where: { strategyId: s.id },
        select: {
          id: true,
          sourceType: true,
          fileName: true,
          fileType: true,
          certainty: true,
          origin: true,
          processingStatus: true,
          rawContent: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      // Compte réel de fragments par source : une source jamais indexée est
      // invisible des analyses, et rien ailleurs ne le dit.
      db.brandContextNode.groupBy({
        by: ["sourceId"],
        where: { strategyId: s.id, kind: "BRAND_SOURCE" },
        _count: { _all: true },
      }),
      db.brandAsset.findMany({
        where: { strategyId: s.id },
        select: { id: true, kind: true, name: true, state: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 40,
      }),
    ]);

    const chunks = new Map(indexed.map((r) => [r.sourceId, r._count._all]));

    brands.push({
      ...s,
      pillars: pillars.map((p) => {
        const content = (p.content ?? {}) as Record<string, unknown>;
        return {
          key: p.key,
          validationStatus: p.validationStatus,
          completionLevel: p.completionLevel,
          confidence: p.confidence,
          version: p.currentVersion,
          // Certitude PAR CHAMP (ADR-0035) — distincte de la provenance : l'une
          // dit d'où vient la valeur, l'autre à quel point on y croit.
          fieldCertainty: p.fieldCertainty ?? null,
          stale: p.staleAt != null,
          updatedAt: p.updatedAt,
          fieldCount: Object.keys(content).filter((k) => !k.startsWith("_")).length,
          // Provenance sortie du contenu : c'est elle qui dit si une valeur a
          // été décidée, tirée d'un document, ou déduite.
          fieldProvenance: content._fieldProvenance ?? null,
          content,
        };
      }),
      sources: sources.map((src) => ({
        id: src.id,
        sourceType: src.sourceType,
        fileName: src.fileName,
        fileType: src.fileType,
        certainty: src.certainty,
        origin: src.origin,
        processingStatus: src.processingStatus,
        chars: src.rawContent?.length ?? 0,
        indexedChunks: chunks.get(src.id) ?? 0,
        preview: (src.rawContent ?? "").slice(0, MAX_SOURCE_PREVIEW),
        createdAt: src.createdAt,
      })),
      assets,
    });
  }

  return NextResponse.json({ ok: true, found: brands.length, brands });
}
