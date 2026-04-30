/**
 * Ptah download-archiver — rapatrie les assets Magnific avant expiration.
 *
 * Magnific livre des URLs signées avec TTL ~12h. Sans rapatriement, l'asset
 * est perdu après expiration. Le cron `/api/cron/ptah-download` exécute ce
 * service toutes les 30min et archive les `AssetVersion` dont la
 * `GenerativeTask.expiresAt < NOW + 1h` et qui n'ont pas encore de `cdnUrl`.
 *
 * Modes :
 *   - `BLOB_STORAGE_PUT_URL_TEMPLATE` set → PUT binaire vers le template
 *     (exemple : `https://blob.example.com/{hash}` ; `{hash}` est remplacé
 *     par sha256 du contenu).
 *   - sinon → mode dry-run : log + marque `metadata.archiveSkipped=true`.
 *
 * Mission contribution : GROUND_INFRASTRUCTURE — sans rapatriement, le
 * vault de Ptah perd ses assets passé 12h. Pas d'industrialisation possible
 * de l'accumulation superfan si chaque forge est éphémère.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";

export interface ArchiveResult {
  scanned: number;
  archived: number;
  skipped: number;
  errors: Array<{ assetVersionId: string; error: string }>;
  durationMs: number;
}

const ARCHIVE_HORIZON_MS = 60 * 60 * 1000; // 1h before expiry
const BATCH_SIZE = 50;

/**
 * Archive assets dont la GenerativeTask expire dans la prochaine heure.
 * Idempotent : skip les AssetVersion qui ont déjà un cdnUrl.
 */
export async function runDownloadArchiver(): Promise<ArchiveResult> {
  const startedAt = Date.now();
  const horizon = new Date(Date.now() + ARCHIVE_HORIZON_MS);
  const result: ArchiveResult = {
    scanned: 0,
    archived: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  // GenerativeTask Magnific COMPLETED dont expiresAt arrive dans <1h.
  const expiringTasks = await db.generativeTask.findMany({
    where: {
      provider: "magnific",
      status: "COMPLETED",
      expiresAt: { gt: new Date(), lt: horizon },
    },
    select: {
      id: true,
      versions: {
        where: { cdnUrl: null },
        select: { id: true, url: true, kind: true, metadata: true },
      },
    },
    take: BATCH_SIZE,
  });

  for (const task of expiringTasks) {
    for (const version of task.versions) {
      result.scanned++;
      try {
        const archived = await archiveOne(version);
        if (archived) result.archived++;
        else result.skipped++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ assetVersionId: version.id, error: msg });
      }
    }
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

interface ArchivableVersion {
  id: string;
  url: string;
  kind: string;
  metadata: unknown;
}

async function archiveOne(version: ArchivableVersion): Promise<boolean> {
  const template = process.env.BLOB_STORAGE_PUT_URL_TEMPLATE;
  const existingMeta = (version.metadata && typeof version.metadata === "object" ? version.metadata : {}) as Record<string, unknown>;

  if (!template) {
    // Dry-run : pas de blob storage → on marque la version pour observabilité.
    await db.assetVersion.update({
      where: { id: version.id },
      data: {
        metadata: { ...existingMeta, archiveSkipped: true, archiveSkippedAt: new Date().toISOString() } as never,
      },
    });
    return false;
  }

  const sourceRes = await fetch(version.url);
  if (!sourceRes.ok) {
    throw new Error(`source fetch ${sourceRes.status} ${version.url}`);
  }
  const buffer = Buffer.from(await sourceRes.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const target = template.replace(/\{hash\}/g, hash);

  const putRes = await fetch(target, {
    method: "PUT",
    headers: { "Content-Type": guessContentType(version.kind) },
    body: buffer,
  });
  if (!putRes.ok) {
    throw new Error(`PUT ${target} → ${putRes.status}`);
  }

  // Le `target` est notre cdnUrl durable.
  await db.assetVersion.update({
    where: { id: version.id },
    data: {
      cdnUrl: target,
      fileSizeBytes: buffer.byteLength,
      metadata: {
        ...existingMeta,
        archivedAt: new Date().toISOString(),
        archiveHash: hash,
      } as never,
    },
  });
  return true;
}

function guessContentType(kind: string): string {
  switch (kind) {
    case "image":
    case "icon":
      return "image/png";
    case "video":
      return "video/mp4";
    case "audio":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}
