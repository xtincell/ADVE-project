import { createHash } from "node:crypto";
import { z } from "zod";
import { APP_VERSION } from "@/lib/version";
import { asRow, asRows, asStrings, asText } from "@/domain/portfolio-barre";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { barreUpstreamUrl } from "./barre-connection";
import { getBarreBrandContext } from "./barre-context";
import { readBarreSnapshot } from "./workspace";
import { cleanBarreDocument, compileBarreDocument, readBarreDocumentRuntime, sharedMediaPath, type BarreDocumentKind } from "./barre-document-runtime";

export const barreDocumentKind = z.enum(["cadrage", "conception", "production", "presentation"]);
export const barrePublicationInput = z.object({ projectId: z.string().min(1).max(100), doc: barreDocumentKind }).strict();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const TOKEN = /^[a-f0-9]{24}$/;
const publication = z.object({
  schema: z.literal(1), projectId: z.string(), doc: barreDocumentKind, tokenDigest: z.string(),
  edition: z.string(), publisherVersion: z.string(), publishedAt: z.string().datetime(), sourceRevision: z.string().nullable(), codeRevision: z.string(),
  html: z.string().max(2_000_000), mediaPaths: z.array(z.string()).max(1_000), stylePaths: z.array(z.string()).max(30),
  references: z.array(z.object({ strategyId: z.string(), fields: z.record(z.string(), z.object({ sourceId: z.string().nullable(), sourceVersion: z.number().nullable() })) })),
});
type Publication = z.infer<typeof publication>;

/** An old token exposed with the public corpus is not promoted into a secret. */
export function barreDocumentGrant(data: unknown, token: string) {
  if (!TOKEN.test(token)) return null;
  const grants: Array<{ project: ReturnType<typeof asRow>; doc: BarreDocumentKind }> = [];
  for (const project of asRows(asRow(data).projets)) {
    for (const doc of barreDocumentKind.options) {
      const value = asRow(asRow(project.partages)[doc]);
      if (value.jeton === token && value.portee === "document") grants.push({ project, doc });
    }
  }
  return grants.length === 1 ? grants[0]! : null;
}

async function readPublication(token: string) {
  const response = await fetch(barreUpstreamUrl(["assets", "review", "partage", `${token}.json`]), {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Le document publié n’a pas pu être relu.");
  return { data: publication.parse(await response.json()), etag: response.headers.get("etag") };
}

/** Explicit export under the current actor; no private pillar read is delegated by a native token. */
export async function publishBarreDocument(input: z.infer<typeof barrePublicationInput>, actor: Parameters<typeof canAccessStrategy>[1]) {
  const source = await readBarreSnapshot({ fresh: true });
  const project = asRows(asRow(source.data).projets).find((p) => p.id === input.projectId);
  const token = asText(asRow(asRow(project?.partages)[input.doc]).jeton);
  const grant = barreDocumentGrant(source.data, token);
  if (!grant || grant.project.id !== input.projectId || grant.doc !== input.doc)
    throw new Error("Recevez d’abord le nouveau lien de ce document dans La Barre.");
  const ids = asStrings(asRow(asRow(grant.project.sections).identite).marqueIds);
  const context = await getBarreBrandContext(actor, ids);
  const runtime = await readBarreDocumentRuntime();
  const edition = hash(JSON.stringify([APP_VERSION, source.etag, runtime.hash, context.brands]));
  const before = await readPublication(token);
  const url = `/la-barre/partage/${token}/document`;
  if (before?.data.edition === edition && before.data.projectId === input.projectId && before.data.doc === input.doc && before.data.tokenDigest === hash(token))
    return { url, edition, publishedAt: before.data.publishedAt, alreadyReceived: true };
  const rendered = compileBarreDocument(runtime, source.data, input.projectId, input.doc, context);
  const packet: Publication = { schema: 1, projectId: input.projectId, doc: input.doc, tokenDigest: hash(token), edition,
    publisherVersion: APP_VERSION, publishedAt: new Date().toISOString(), sourceRevision: source.etag, codeRevision: rendered.codeRevision,
    html: rendered.html, mediaPaths: rendered.mediaPaths, stylePaths: rendered.stylePaths,
    references: Object.values(context.brands).map((brand) => ({ strategyId: brand.strategyId,
      fields: Object.fromEntries(Object.entries(brand.fields).map(([code, field]) => [code, { sourceId: field.sourceId, sourceVersion: field.sourceVersion }])) })),
  };
  const response = await fetch(barreUpstreamUrl(["assets", "review", "partage", `${token}.json`]), {
    method: "PUT", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", ...(before?.etag ? { "If-Match": before.etag } : { "If-None-Match": "*" }) },
    body: JSON.stringify(packet),
  });
  if (!response.ok) throw new Error("La publication n’a pas été reçue. Reprenez le même lien depuis le dossier.");
  return { url, edition, publishedAt: packet.publishedAt, alreadyReceived: false };
}

/** No actor or pillar query here: only the edition explicitly published by its operator. */
export async function readPublishedBarreDocument(token: string) {
  if (!TOKEN.test(token)) return null;
  const source = await readBarreSnapshot({ fresh: true });
  const grant = barreDocumentGrant(source.data, token);
  if (!grant) return null;
  const saved = await readPublication(token);
  if (!saved || saved.data.projectId !== grant.project.id || saved.data.doc !== grant.doc || saved.data.tokenDigest !== hash(token)) return null;
  const clean = cleanBarreDocument(saved.data.html);
  // Derive the allowed files again from the document, never trust an extra file in a packet.
  return { ...saved.data, html: clean.html, mediaPaths: clean.mediaPaths.filter((path) => sharedMediaPath(path)),
    stylePaths: saved.data.stylePaths.filter((path) => /^styles\/[a-zA-Z0-9_-]+\.css$/.test(path)) };
}
