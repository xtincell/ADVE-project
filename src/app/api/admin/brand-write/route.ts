export const dynamic = "force-dynamic";
/**
 * Écritures de marque serveur-à-serveur, PAR LES VOIES GOUVERNÉES (CRON_SECRET).
 *
 * Pourquoi cette route existe : consolider deux fiches de marque, ou déposer la
 * documentation officielle d'un client, sont des gestes d'opérateur qui n'ont
 * aujourd'hui qu'une surface — le navigateur, avec une session. Depuis un
 * exécutant serveur (ce qui est le cas d'un agent qui range le vault), il n'y
 * avait aucun chemin : ni pour ingérer un document, ni pour amender un pilier.
 * Faute de chemin, la tentation est d'écrire en base directement. C'est
 * exactement ce que le chokepoint interdit.
 *
 * Donc : cette route n'écrit RIEN elle-même. Elle exerce les procédures tRPC
 * existantes sous une identité ADMIN — `ingestion.uploadFile`,
 * `pillar.amend` (→ `OPERATOR_AMEND_PILLAR`), `strategy.archive`. Toute la
 * gouvernance (spine d'émission, gates pre-flight, `writePillar`, provenance,
 * versionnement, cascade de péremption) s'applique telle quelle.
 *
 *   POST /api/admin/brand-write
 *   Header: Authorization: Bearer <CRON_SECRET>
 *   Body:   { action, dryRun?, ...paramètres }
 *
 * `dryRun: true` (DÉFAUT) décrit ce qui serait fait sans rien faire. Une
 * écriture demande `dryRun: false` explicite — on ne mute pas une marque
 * cliente par inadvertance de paramètre.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/trpc/router";
import { ADVE_STORAGE_KEYS } from "@/domain/pillars";

type AdminCaller = ReturnType<typeof appRouter.createCaller>;

async function adminCaller(): Promise<AdminCaller> {
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw new Error("Aucun compte ADMIN — impossible d'exercer les procédures gouvernées.");
  return appRouter.createCaller({
    session: { user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" } },
    db,
  } as unknown as Parameters<typeof appRouter.createCaller>[0]);
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("INGEST_SOURCE"),
    dryRun: z.boolean().default(true),
    strategyId: z.string().min(1),
    fileName: z.string().min(1),
    /** EXTENSION (PDF/DOCX/TXT/MD…), jamais le type MIME — cf. `extractAuto`. */
    fileType: z.string().min(1).max(8),
    contentBase64: z.string().min(1),
    certainty: z.enum(["OFFICIAL", "DECLARED", "INFERRED", "ARBITRARY"]).default("DECLARED"),
  }),
  z.object({
    action: z.literal("AMEND_PILLAR"),
    dryRun: z.boolean().default(true),
    strategyId: z.string().min(1),
    pillarKey: z.enum(ADVE_STORAGE_KEYS),
    field: z.string().min(1),
    value: z.unknown(),
    reason: z.string().min(8),
  }),
  z.object({
    action: z.literal("DELETE_SOURCE"),
    dryRun: z.boolean().default(true),
    strategyId: z.string().min(1),
    sourceId: z.string().min(1),
  }),
  z.object({
    action: z.literal("ARCHIVE_STRATEGY"),
    dryRun: z.boolean().default(true),
    strategyId: z.string().min(1),
    reason: z.string().min(8),
  }),
]);

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Corps invalide", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }

  // Refus fail-closed sur une marque inconnue : mieux vaut un 404 qu'une
  // écriture qui part sur un identifiant mal recopié.
  const strategy = await db.strategy.findUnique({
    where: { id: body.strategyId },
    select: { id: true, name: true, status: true },
  });
  if (!strategy) {
    return NextResponse.json({ error: `Marque inconnue : ${body.strategyId}` }, { status: 404 });
  }

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      wouldDo: describe(body, strategy.name),
      note: "Rien n'a été écrit. Renvoyer avec \"dryRun\": false pour exécuter.",
    });
  }

  const caller = await adminCaller();

  try {
    switch (body.action) {
      case "INGEST_SOURCE": {
        const { sourceId } = await caller.ingestion.uploadFile({
          strategyId: body.strategyId,
          fileName: body.fileName,
          fileType: body.fileType.toUpperCase(),
          content: body.contentBase64,
        });
        // La certitude n'est pas un paramètre d'upload : elle se pose ensuite,
        // par la même voie gouvernée que le cockpit.
        await caller.ingestion.updateSource({ id: sourceId, certainty: body.certainty });
        const src = await db.brandDataSource.findUnique({
          where: { id: sourceId },
          select: { processingStatus: true, rawContent: true, errorMessage: true },
        });
        return NextResponse.json({
          ok: true,
          sourceId,
          // On rapporte ce qui a RÉELLEMENT été extrait : un dépôt accepté dont
          // l'extraction a échoué n'est pas un document exploitable.
          processingStatus: src?.processingStatus ?? null,
          extractedChars: src?.rawContent?.length ?? 0,
          errorMessage: src?.errorMessage ?? null,
        });
      }
      case "AMEND_PILLAR": {
        const out = await caller.pillar.amend({
          strategyId: body.strategyId,
          // `adveKeyEnum` expose les lettres en MAJUSCULE côté UI ; la
          // normalisation en minuscules se fait dans la procédure.
          pillarKey: body.pillarKey.toUpperCase() as "A" | "D" | "V" | "E",
          field: body.field,
          mode: "PATCH_DIRECT",
          proposedValue: body.value,
          reason: body.reason,
        });
        return NextResponse.json({ ok: true, amend: out });
      }
      case "DELETE_SOURCE": {
        // Une source mal extraite (contenu illisible) vaut moins que pas de
        // source du tout : elle serait indexee et citee comme documentation.
        const out = await caller.ingestion.deleteSource({ id: body.sourceId });
        return NextResponse.json({ ok: true, deleted: out });
      }
      case "ARCHIVE_STRATEGY": {
        const out = await caller.strategy.archive({
          id: body.strategyId,
          reason: body.reason,
        });
        return NextResponse.json({ ok: true, archive: out });
      }
    }
  } catch (e) {
    // Les refus gouvernés (gate pre-flight, veto de cohérence, ownership) sont
    // explicites et destinés à être lus tels quels.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

function describe(body: z.infer<typeof bodySchema>, brand: string): string {
  switch (body.action) {
    case "INGEST_SOURCE":
      return `Déposer « ${body.fileName} » (${body.fileType}, ${Math.round(body.contentBase64.length * 0.75 / 1024)} Ko) sur ${brand}, certitude ${body.certainty}.`;
    case "AMEND_PILLAR":
      return `Amender ${body.pillarKey.toUpperCase()}.${body.field} sur ${brand} (voie OPERATOR_AMEND_PILLAR, PATCH_DIRECT).`;
    case "DELETE_SOURCE":
      return `Retirer la source ${body.sourceId} de ${brand}.`;
    case "ARCHIVE_STRATEGY":
      return `Archiver ${brand} (réversible).`;
  }
}
