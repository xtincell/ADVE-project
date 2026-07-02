import type { BrandAsset, Prisma } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { VAULT_ASSET_KINDS, type VaultAssetKind } from "@/domain/guidelines";
import { logAudit } from "./audit";

/**
 * Coffre de marque (WP-019) — CRUD des assets d'identité STRUCTURÉS
 * (essence du brand-vault legacy ADR-0012, sans la state machine à 6 états
 * ni les ~70 kinds : v7 garde ACTIVE/ARCHIVED et 5 kinds d'identité).
 *
 * Doctrine (pattern finance.ts/guild.ts) :
 *   - mutation = transaction + `AuditLog` chaîné (`vault.asset.create|update|
 *     archive|restore`), flips de statut atomiques (`updateMany` conditionnel) ;
 *   - tenancy par marque : tout asset est cherché par (id, brandId) — un id
 *     forgé vers le coffre d'une autre marque est introuvable ;
 *   - `value` STRUCTURÉ validé Zod par kind — pas de Json libre ;
 *   - PAS de stockage binaire cette vague : les liens font foi, `fileRef`
 *     reste le résidu honnête de l'upload futur.
 */

// ── Kinds (libellés FR canoniques du coffre) ───────────────────────────

export const ASSET_KIND_LABELS: Record<VaultAssetKind, string> = {
  LOGO: "Logo",
  COULEUR: "Couleur",
  TYPO: "Typographie",
  DOCUMENT: "Document",
  IMAGE: "Image",
};

export const assetKindSchema = z.enum(VAULT_ASSET_KINDS);

// ── Valeurs structurées par kind (validation d'écriture) ───────────────

/** URL http(s) valide ? (même helper que guild.ts — frontière stricte). */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Normalise un hex CSS en canonique `#RRGGBB` majuscule — pure.
 * Accepte `#RGB`, `RGB`, `#RRGGBB`, `RRGGBB` ; null si illisible.
 */
export function normalizeHex(raw: string): string | null {
  const stripped = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(stripped)) {
    return `#${stripped
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(stripped)) return `#${stripped.toUpperCase()}`;
  return null;
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Donnez un nom à cet asset (ex. « Corail », « Clash Display », « Logo principal »).")
  .max(120, "120 caractères maximum pour le nom.");

const optionalUrl = z
  .string()
  .trim()
  .max(300, "URL trop longue (300 caractères maximum).")
  .default("")
  .refine((value) => value === "" || isHttpUrl(value), {
    message: "URL invalide — collez un lien complet (https://…).",
  });

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} : ${max} caractères maximum.`).default("");

/** COULEUR — hex obligatoire (canonisé), rôle d'usage optionnel. */
export const colorValueSchema = z.object({
  hex: z
    .string()
    .trim()
    .transform((raw, ctx) => {
      const hex = normalizeHex(raw);
      if (hex === null) {
        ctx.addIssue({
          code: "custom",
          message: "Couleur invalide — un code hex (ex. #E56458).",
        });
        return z.NEVER;
      }
      return hex;
    }),
  role: optionalText(80, "Rôle"),
});

/** TYPO — usage (« Titres », « Texte courant ») et lien de la fonte optionnels. */
export const typoValueSchema = z.object({
  usage: optionalText(120, "Usage"),
  url: optionalUrl,
});

/** LOGO / DOCUMENT / IMAGE — un lien https et une note, tous deux optionnels. */
export const linkValueSchema = z.object({
  url: optionalUrl,
  note: optionalText(300, "Note"),
});

export type ColorValueInput = z.infer<typeof colorValueSchema>;
export type TypoValueInput = z.infer<typeof typoValueSchema>;
export type LinkValueInput = z.infer<typeof linkValueSchema>;

/**
 * Construit le `value` Json CANONIQUE d'un asset depuis les champs de
 * formulaire bruts — pure (testable sans DB). Les champs optionnels vides
 * sont OMIS (pas de `role: ""` résiduel) ; un kind sans structure valide
 * lève ZodError (messages FR prêts à afficher).
 */
export function buildAssetValue(
  kind: VaultAssetKind,
  fields: Record<string, unknown>,
): Record<string, string> {
  if (kind === "COULEUR") {
    const parsed = colorValueSchema.parse(fields);
    return { hex: parsed.hex, ...(parsed.role !== "" ? { role: parsed.role } : {}) };
  }
  if (kind === "TYPO") {
    const parsed = typoValueSchema.parse(fields);
    return {
      ...(parsed.usage !== "" ? { usage: parsed.usage } : {}),
      ...(parsed.url !== "" ? { url: parsed.url } : {}),
    };
  }
  const parsed = linkValueSchema.parse(fields);
  return {
    ...(parsed.url !== "" ? { url: parsed.url } : {}),
    ...(parsed.note !== "" ? { note: parsed.note } : {}),
  };
}

export { nameSchema as assetNameSchema };

// ── Erreur métier (messages FR prêts à afficher) ───────────────────────

export type VaultErrorCode = "BRAND_NOT_FOUND" | "ASSET_NOT_FOUND" | "GATE_REFUSED";

export class VaultError extends Error {
  constructor(
    public readonly code: VaultErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VaultError";
  }
}

// ── Lecture ────────────────────────────────────────────────────────────

export type VaultAssetsByKind = Record<VaultAssetKind, BrandAsset[]>;

/** Coffre d'une marque groupé par kind — actifs puis archivés, plus récents d'abord. */
export async function listBrandAssets(brandId: string): Promise<VaultAssetsByKind> {
  const db = getDb();
  const rows = await db.brandAsset.findMany({
    where: { brandId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
  });
  const grouped: VaultAssetsByKind = { LOGO: [], COULEUR: [], TYPO: [], DOCUMENT: [], IMAGE: [] };
  for (const row of rows) grouped[row.kind as VaultAssetKind].push(row);
  return grouped;
}

/** Assets ACTIFS d'une marque (l'entrée du composer de charte), ordre stable. */
export async function listActiveAssets(brandId: string): Promise<BrandAsset[]> {
  const db = getDb();
  return db.brandAsset.findMany({
    where: { brandId, status: "ACTIVE" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** Compteur d'assets actifs (hub /app/exports). */
export async function countActiveAssets(brandId: string): Promise<number> {
  const db = getDb();
  return db.brandAsset.count({ where: { brandId, status: "ACTIVE" } });
}

// ── Mécanique commune (tenancy + audit) ────────────────────────────────

type BrandRef = { id: string; workspaceId: string };

async function requireBrand(brandId: string): Promise<BrandRef> {
  const db = getDb();
  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: { id: true, workspaceId: true },
  });
  if (!brand) {
    throw new VaultError("BRAND_NOT_FOUND", "Marque introuvable — elle a peut-être été supprimée.");
  }
  return brand;
}

/** Asset du coffre de LA marque de session (id forgé ⇒ introuvable). */
async function requireBrandAsset(brandId: string, assetId: string): Promise<BrandAsset> {
  const db = getDb();
  const asset = await db.brandAsset.findFirst({ where: { id: assetId, brandId } });
  if (!asset) {
    throw new VaultError("ASSET_NOT_FOUND", "Asset introuvable dans le coffre de cette marque.");
  }
  return asset;
}

// ── Mutations ──────────────────────────────────────────────────────────

export type CreateAssetInput = {
  brandId: string;
  kind: VaultAssetKind;
  name: string;
  /** Value CANONIQUE (sortie de `buildAssetValue`) — jamais du Json libre. */
  value: Record<string, string>;
  actorId: string;
};

/** Crée un asset ACTIF + AuditLog `vault.asset.create` en transaction. */
export async function createAsset(input: CreateAssetInput): Promise<BrandAsset> {
  const { brandId, kind, name, value, actorId } = input;
  const brand = await requireBrand(brandId);
  const db = getDb();

  return db.$transaction(async (tx) => {
    const asset = await tx.brandAsset.create({
      data: { brandId: brand.id, kind, name, value: value as Prisma.InputJsonValue },
    });
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "vault.asset.create",
        entity: "BrandAsset",
        entityId: asset.id,
        payload: { kind, name, value },
      },
      tx,
    );
    return asset;
  });
}

export type UpdateAssetInput = {
  brandId: string;
  assetId: string;
  name: string;
  value: Record<string, string>;
  actorId: string;
};

/**
 * Corrige nom/valeur d'un asset ACTIF : version++ + AuditLog
 * `vault.asset.update` avec avant/après (pattern référentiels admin —
 * une correction se trace, elle ne s'écrase pas en silence).
 * Un asset archivé ne s'édite pas : restaurer d'abord.
 */
export async function updateAsset(input: UpdateAssetInput): Promise<BrandAsset> {
  const { brandId, assetId, name, value, actorId } = input;
  const brand = await requireBrand(brandId);
  const asset = await requireBrandAsset(brand.id, assetId);
  if (asset.status !== "ACTIVE") {
    throw new VaultError(
      "GATE_REFUSED",
      "Cet asset est archivé — restaurez-le avant de le corriger.",
    );
  }

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.brandAsset.updateMany({
      where: { id: asset.id, status: "ACTIVE", version: asset.version },
      data: { name, value: value as Prisma.InputJsonValue, version: { increment: 1 } },
    });
    if (flipped.count === 0) {
      throw new VaultError(
        "GATE_REFUSED",
        "Cet asset vient d'être modifié ou archivé — rechargez la page.",
      );
    }
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "vault.asset.update",
        entity: "BrandAsset",
        entityId: asset.id,
        payload: {
          kind: asset.kind,
          version: asset.version + 1,
          before: { name: asset.name, value: asset.value ?? null },
          after: { name, value },
        },
      },
      tx,
    );
    return tx.brandAsset.findUniqueOrThrow({ where: { id: asset.id } });
  });
}

export type AssetStatusInput = {
  brandId: string;
  assetId: string;
  actorId: string;
};

/** Flip atomique de statut + audit — mécanique commune archive/restore. */
async function flipAssetStatus(
  input: AssetStatusInput,
  from: "ACTIVE" | "ARCHIVED",
  to: "ACTIVE" | "ARCHIVED",
  auditAction: "vault.asset.archive" | "vault.asset.restore",
): Promise<BrandAsset> {
  const { brandId, assetId, actorId } = input;
  const brand = await requireBrand(brandId);
  const asset = await requireBrandAsset(brand.id, assetId);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const flipped = await tx.brandAsset.updateMany({
      where: { id: asset.id, status: from },
      data: { status: to },
    });
    if (flipped.count === 0) {
      throw new VaultError(
        "GATE_REFUSED",
        from === "ACTIVE"
          ? "Cet asset est déjà archivé."
          : "Cet asset n'est pas (ou plus) archivé.",
      );
    }
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: auditAction,
        entity: "BrandAsset",
        entityId: asset.id,
        payload: { kind: asset.kind, name: asset.name },
      },
      tx,
    );
    return tx.brandAsset.findUniqueOrThrow({ where: { id: asset.id } });
  });
}

/**
 * Archive un asset (la « suppression » du coffre — rien ne s'efface, la
 * charte cesse simplement de le lire). Flip atomique ACTIVE → ARCHIVED.
 */
export async function archiveAsset(input: AssetStatusInput): Promise<BrandAsset> {
  return flipAssetStatus(input, "ACTIVE", "ARCHIVED", "vault.asset.archive");
}

/** Restaure un asset archivé — flip atomique ARCHIVED → ACTIVE. */
export async function restoreAsset(input: AssetStatusInput): Promise<BrandAsset> {
  return flipAssetStatus(input, "ARCHIVED", "ACTIVE", "vault.asset.restore");
}
