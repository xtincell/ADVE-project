import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { diagnose, type Diagnostic } from "@/domain/diagnostic";
import { scoreBrand, type PillarContentScore } from "@/domain/scoring";
import { ADVE_PILLARS, type AdvePillarKey } from "@/domain/pillars";
import { PILLAR_FIELDS, PILLAR_LABELS, type FieldType } from "@/domain/pillar-fields";
import { normalizeEmail } from "./identity";
import { logAudit } from "./audit";
import { computeSelfHash } from "./audit-hash";
import {
  INTAKE_COUNTRY_CODES,
  INTAKE_PAYLOAD_VERSION,
  intakeCountryName,
  mapIntakeAnswers,
  toDiagnosticAnswers,
  withIdentityAnswers,
  type IntakeLeadPayload,
  type RawIntakeAnswers,
} from "./funnel-mapping";

/**
 * Funnel public — le point d'entrée n°1 de la valeur (REBUILD-PLAN §5 WP-004).
 *
 * Trois moments, trois fonctions :
 *   1. `submitIntake`      — soumission publique SANS session : IntakeLead +
 *                            diagnostic déterministe (domaine pur) + audit.
 *   2. `getLeadDiagnostic` — relecture d'un lead ; le diagnostic est RECALCULÉ
 *                            (jamais stocké : déterministe, le payload suffit).
 *   3. `convertLead`       — post-inscription : seed des piliers ADVE du Brand
 *                            depuis les réponses, PillarRevision v1 chaînée,
 *                            BrandScore initial, lead → CONVERTED. Transaction.
 */

// ── Validation Zod aux frontières ──────────────────────────────────────

/** Réponses d'un pilier : texte libre par id de champ, bornées (anti-abus). */
const pillarAnswersSchema = z.record(z.string().max(80), z.string().max(4000));

export const intakeSubmissionSchema = z.object({
  email: z.email("Adresse email invalide."),
  brandName: z.string().trim().min(1, "Le nom de votre marque est requis.").max(120),
  secteur: z.string().trim().max(120).optional(),
  countryCode: z.enum(INTAKE_COUNTRY_CODES).optional(),
  answers: z
    .object({
      A: pillarAnswersSchema.optional(),
      D: pillarAnswersSchema.optional(),
      V: pillarAnswersSchema.optional(),
      E: pillarAnswersSchema.optional(),
    })
    .default({}),
});

export type IntakeSubmission = z.infer<typeof intakeSubmissionSchema>;

/** Forme du payload relu depuis la DB (Json → validé avant tout recalcul). */
const leadPayloadSchema = z.object({
  version: z.number().default(INTAKE_PAYLOAD_VERSION),
  secteur: z.string().optional(),
  countryCode: z.string().optional(),
  answers: z
    .object({
      A: pillarAnswersSchema.optional(),
      D: pillarAnswersSchema.optional(),
      V: pillarAnswersSchema.optional(),
      E: pillarAnswersSchema.optional(),
    })
    .default({}),
});

/** Diagnostic d'un lead — pur recalcul depuis ses colonnes + payload. */
function diagnoseLead(brandName: string, payload: IntakeLeadPayload): Diagnostic {
  const answers = withIdentityAnswers(payload.answers, {
    brandName,
    secteur: payload.secteur,
  });
  return diagnose({ answers: toDiagnosticAnswers(mapIntakeAnswers(answers)) });
}

// ── 1. Soumission publique ─────────────────────────────────────────────

export interface SubmitIntakeResult {
  leadId: string;
  diagnostic: Diagnostic;
}

/**
 * Crée l'IntakeLead depuis le funnel public (AUCUNE session requise) et
 * retourne son diagnostic déterministe. Lead + ligne d'audit (chaîne
 * « système », workspaceId null) dans la même transaction.
 */
export async function submitIntake(input: unknown): Promise<SubmitIntakeResult> {
  const parsed = intakeSubmissionSchema.parse(input);
  const db = getDb();

  const email = normalizeEmail(parsed.email);
  const brandName = parsed.brandName.trim();
  const payload: IntakeLeadPayload = {
    version: INTAKE_PAYLOAD_VERSION,
    ...(parsed.secteur ? { secteur: parsed.secteur } : {}),
    ...(parsed.countryCode ? { countryCode: parsed.countryCode } : {}),
    answers: parsed.answers as RawIntakeAnswers,
  };

  const diagnostic = diagnoseLead(brandName, payload);

  const lead = await db.$transaction(async (tx) => {
    const created = await tx.intakeLead.create({
      data: {
        email,
        brandName,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit(
      {
        workspaceId: null, // chaîne système : le lead précède tout workspace
        action: "intake.submit",
        entity: "IntakeLead",
        entityId: created.id,
        payload: {
          email,
          brandName,
          secteur: payload.secteur ?? null,
          countryCode: payload.countryCode ?? null,
          score: diagnostic.score,
          level: diagnostic.level,
        },
      },
      tx,
    );
    return created;
  });

  return { leadId: lead.id, diagnostic };
}

// ── 2. Relecture (page résultat, préremplissage inscription) ──────────

export interface LeadDiagnostic {
  lead: {
    id: string;
    email: string;
    brandName: string;
    status: "NEW" | "QUALIFIED" | "CONVERTED" | "ARCHIVED";
    createdAt: Date;
  };
  secteur: string | null;
  countryName: string | null;
  diagnostic: Diagnostic;
}

/**
 * Relit un lead et RECALCULE son diagnostic (déterministe : même payload →
 * même résultat, aucune donnée dérivée stockée). Null si lead inexistant.
 */
export async function getLeadDiagnostic(leadId: string): Promise<LeadDiagnostic | null> {
  const db = getDb();
  const lead = await db.intakeLead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const payload = parseLeadPayload(lead.payload);
  return {
    lead: {
      id: lead.id,
      email: lead.email,
      brandName: lead.brandName,
      status: lead.status,
      createdAt: lead.createdAt,
    },
    secteur: payload.secteur ?? null,
    countryName: intakeCountryName(payload.countryCode),
    diagnostic: diagnoseLead(lead.brandName, payload),
  };
}

/** Payload DB → forme validée ; un payload illisible dégrade en réponses vides. */
function parseLeadPayload(raw: unknown): IntakeLeadPayload {
  const parsed = leadPayloadSchema.safeParse(raw);
  if (parsed.success) return parsed.data as IntakeLeadPayload;
  return { version: INTAKE_PAYLOAD_VERSION, answers: {} };
}

export interface LeadPrefill {
  id: string;
  email: string;
  brandName: string;
}

/**
 * Données de préremplissage du formulaire d'inscription. Null si le lead
 * n'existe pas OU n'est plus convertible (déjà CONVERTED / ARCHIVED) — on ne
 * préremplit jamais depuis un lead déjà consommé.
 */
export async function getLeadForPrefill(leadId: string): Promise<LeadPrefill | null> {
  const db = getDb();
  const lead = await db.intakeLead.findUnique({
    where: { id: leadId },
    select: { id: true, email: true, brandName: true, status: true },
  });
  if (!lead) return null;
  if (lead.status !== "NEW" && lead.status !== "QUALIFIED") return null;
  return { id: lead.id, email: lead.email, brandName: lead.brandName };
}

// ── 2-bis. Rapport ADVE complet (lecture seule — page /intake/rapport) ──

export interface LeadReportField {
  id: string;
  label: string;
  description: string;
  needsHuman: boolean;
  type: FieldType;
  /** Le champ est-il réellement rempli dans les réponses du lead ? */
  filled: boolean;
  /** Réponse déclarée (texte trimé ou liste) — absente si champ vide. */
  answer?: string | string[];
}

export interface LeadReportPillar {
  key: AdvePillarKey;
  label: string;
  score: PillarContentScore;
  fields: LeadReportField[];
}

export interface LeadReport extends LeadDiagnostic {
  /** Constat champ par champ des 4 piliers ADVE — uniquement le déclaré. */
  pillars: LeadReportPillar[];
}

/**
 * Rapport complet d'un lead : le diagnostic (recalculé, comme partout) +
 * le constat CHAMP PAR CHAMP du socle ADVE — chaque champ de la bible avec
 * sa réponse déclarée s'il est rempli, sa description s'il est vide. Aucune
 * analyse inventée : la seule matière est ce que le lead a déclaré.
 * Null si lead inexistant. Extension LECTURE de `getLeadDiagnostic`.
 */
export async function getLeadReport(leadId: string): Promise<LeadReport | null> {
  const db = getDb();
  const lead = await db.intakeLead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const payload = parseLeadPayload(lead.payload);
  const mapped = mapIntakeAnswers(
    withIdentityAnswers(payload.answers, {
      brandName: lead.brandName,
      secteur: payload.secteur,
    }),
  );
  const diagnostic = diagnose({ answers: toDiagnosticAnswers(mapped) });

  const pillars: LeadReportPillar[] = ADVE_PILLARS.map((key) => {
    const content = mapped[key].content;
    const score = diagnostic.byPillar[key];
    const filledIds = new Set(score.filled);
    return {
      key,
      label: PILLAR_LABELS[key],
      score,
      fields: PILLAR_FIELDS[key].map((field) => {
        const value = content[field.id];
        const answer =
          typeof value === "string"
            ? value
            : Array.isArray(value)
              ? value.filter((item): item is string => typeof item === "string")
              : undefined;
        const filled = filledIds.has(field.id);
        return {
          id: field.id,
          label: field.label,
          description: field.description,
          needsHuman: field.needsHuman,
          type: field.type,
          filled,
          ...(filled && answer !== undefined ? { answer } : {}),
        };
      }),
    };
  });

  return {
    lead: {
      id: lead.id,
      email: lead.email,
      brandName: lead.brandName,
      status: lead.status,
      createdAt: lead.createdAt,
    },
    secteur: payload.secteur ?? null,
    countryName: intakeCountryName(payload.countryCode),
    diagnostic,
    pillars,
  };
}

// ── 3. Conversion post-inscription ─────────────────────────────────────

export interface ConvertLeadResult {
  brandId: string;
  total: number;
  level: string;
  seededPillars: string[];
}

/**
 * Convertit un lead après `registerUser` : seed les piliers A/D/V/E du Brand
 * du workspace depuis `lead.payload`, chaque pilier avec sa PillarRevision v1
 * (reason "intake", hash-chaînée via `computeSelfHash`), BrandScore initial
 * via `scoreBrand`, Brand.sector/countryCode/level mis à jour, lead →
 * CONVERTED (le schéma IntakeLead n'a pas de colonne workspaceId — la
 * traçabilité lead↔workspace vit dans l'AuditLog `lead.convert`).
 *
 * Une seule transaction. No-op (null) si lead inexistant / déjà consommé /
 * workspace sans marque. IMPORTANT : n'écrase JAMAIS un pilier existant.
 */
export async function convertLead(
  leadId: string,
  actor: { userId: string; workspaceId: string },
): Promise<ConvertLeadResult | null> {
  const db = getDb();

  const lead = await db.intakeLead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  if (lead.status !== "NEW" && lead.status !== "QUALIFIED") return null;

  const brand = await db.brand.findFirst({
    where: { workspaceId: actor.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, sector: true, countryCode: true },
  });
  if (!brand) return null;

  const payload = parseLeadPayload(lead.payload);
  // Le nom fait foi côté Brand (le fondateur vient de le (re)déclarer à
  // l'inscription) — il alimente A.nomMarque si le wizard ne l'a pas déjà.
  const mapped = mapIntakeAnswers(
    withIdentityAnswers(payload.answers, {
      brandName: brand.name,
      secteur: payload.secteur,
    }),
  );

  // Score composite /200 réel : socle ADVE seedé, RTIS encore vides (0).
  const score = scoreBrand(toDiagnosticAnswers(mapped));

  // FK Country : la DB est la vérité (le const funnel n'est qu'un miroir UI).
  const country = payload.countryCode
    ? await db.country.findUnique({
        where: { code: payload.countryCode },
        select: { code: true },
      })
    : null;

  return db.$transaction(async (tx) => {
    // Garde atomique anti double-conversion : le flip NEW/QUALIFIED →
    // CONVERTED ne peut réussir qu'une fois.
    const flipped = await tx.intakeLead.updateMany({
      where: { id: leadId, status: { in: ["NEW", "QUALIFIED"] } },
      data: { status: "CONVERTED" },
    });
    if (flipped.count === 0) return null;

    const seededPillars: string[] = [];
    for (const key of ADVE_PILLARS) {
      const { content, certainty } = mapped[key];

      // Jamais d'écrasement : si le pilier existe déjà (édité entre-temps),
      // le déclaratif intake ne le clobbe pas.
      const existing = await tx.pillar.findUnique({
        where: { brandId_key: { brandId: brand.id, key } },
        select: { id: true },
      });
      if (existing) continue;

      const pillar = await tx.pillar.create({
        data: {
          brandId: brand.id,
          key,
          content: content as Prisma.InputJsonValue,
          certainty: certainty as Prisma.InputJsonValue,
          version: 1,
        },
      });

      // Révision v1 — première maille de la chaîne du pilier (prevHash null).
      await tx.pillarRevision.create({
        data: {
          pillarId: pillar.id,
          version: 1,
          content: content as Prisma.InputJsonValue,
          reason: "intake",
          actorId: actor.userId,
          prevHash: null,
          selfHash: computeSelfHash(null, {
            workspaceId: actor.workspaceId,
            actorId: actor.userId,
            action: "pillar.revision",
            entity: "Pillar",
            entityId: pillar.id,
            payload: { version: 1, reason: "intake", content },
          }),
        },
      });
      seededPillars.push(key);
    }

    await tx.brand.update({
      where: { id: brand.id },
      data: {
        level: score.level,
        ...(payload.secteur && !brand.sector ? { sector: payload.secteur } : {}),
        ...(country && !brand.countryCode ? { countryCode: country.code } : {}),
      },
    });

    await tx.brandScore.create({
      data: {
        brandId: brand.id,
        total: score.total,
        dimensions: score.byPillar as unknown as Prisma.InputJsonValue,
        level: score.level,
      },
    });

    await logAudit(
      {
        workspaceId: actor.workspaceId,
        actorId: actor.userId,
        action: "lead.convert",
        entity: "IntakeLead",
        entityId: leadId,
        payload: {
          brandId: brand.id,
          seededPillars,
          total: score.total,
          level: score.level,
        },
      },
      tx,
    );

    return {
      brandId: brand.id,
      total: score.total,
      level: score.level,
      seededPillars,
    };
  });
}
