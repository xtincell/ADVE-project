/**
 * Enregistrement d'une base La Barre sous la personne connectée (point LB3, ADR-0245).
 *
 * La route `/la-barre/` authentifiait la session et relisait l'affectation, puis
 * transmettait le corps tel quel : La Barre recevait un fichier, jamais un geste
 * attribuable. Ici, avant de transmettre un `PUT depots/<fichier>.json`, La Fusée
 * relit la version courante chez La Barre, applique la même précondition de
 * révision qu'elle (`If-Match`, `If-None-Match: *`, `X-Base`), tamponne les
 * entrées nouvelles avec la personne de la session et refuse toute attestation
 * forgée, modifiée ou effacée. L'écriture part avec la révision relue : une
 * écriture concurrente entre la lecture et l'écriture est refusée par La Barre.
 * La lecture de la base reste une transmission inchangée.
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import {
  BARRE_ACTOR_ATTESTATION, BARRE_ATTESTATION_REFUSALS, stampBarreBase, verifyBarreAttestation,
  type BarreSessionActor,
} from "@/domain/barre-actor-attestation";
import { barreBinding, barreUpstreamUrl } from "./barre-connection";

/** Plafond d'écriture de La Barre (`servir.mjs`, PLAFOND). */
export const BARRE_BASE_LIMIT = 24 * 1024 * 1024;

const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const READ_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

/** Même clé que les autres signatures de session de l'installation, séparée par son domaine de sceau. */
export function barreAttestationKey(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("La signature des gestes La Barre n’est pas configurée.");
  return secret;
}

export function barreAttestationAvailable(): boolean {
  try { barreAttestationKey(); return true; } catch { return false; }
}

/**
 * Vérifie une attestation sous la clé et l'instance de cette installation.
 * Sans clé configurée, aucune attestation n'est tenue pour vérifiée.
 */
export function barreAttestationVerifier(instance = barreBinding().instance) {
  return (entry: Record<string, unknown>) => {
    let key: string;
    try { key = barreAttestationKey(); } catch { return false; }
    return verifyBarreAttestation(entry, { key, instance });
  };
}

/** La personne connectée, relue en base : identifiant stable et nom affichable, jamais l'e-mail. */
export async function barreSessionActor(userId: string): Promise<BarreSessionActor> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  const nom = typeof user?.name === "string" && user.name.trim() ? user.name.trim().slice(0, 300) : null;
  return { userId, nom };
}

/** Ce que `contexte.json` déclare à La Barre : la capacité et la personne connectée. */
export async function barreActorDeclaration(userId: string) {
  if (!barreAttestationAvailable()) return {};
  const actor = await barreSessionActor(userId);
  return { actorAttestation: BARRE_ACTOR_ATTESTATION, actor: { id: actor.userId, name: actor.nom } } as const;
}

const json = (status: number, body: unknown, etag?: string | null) => Response.json(body, {
  status, headers: { ...PRIVATE, ...(etag ? { ETag: etag } : {}) },
});
const revision = (bytes: Buffer) => `"${createHash("sha256").update(bytes).digest("hex")}"`;

async function readBounded(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Buffer | null> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel().catch(() => undefined); return null; }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/**
 * `PUT` (ou `POST`) d'une base `depots/<fichier>.json` sous la session `actor`.
 * Les refus reprennent la forme et les codes de La Barre (400, 409, 413, 428)
 * pour que le navigateur les traite comme les siens ; les refus d'attestation
 * sont typés en 422.
 */
export async function saveBarreBase(request: Request, path: string[], actor: { userId: string }, signal: AbortSignal): Promise<Response> {
  if (Number(request.headers.get("content-length") || 0) > BARRE_BASE_LIMIT) {
    return json(413, { ok: false, code: "TOO_LARGE", quoi: "Corps trop volumineux" });
  }
  const bytes = await readBounded(request.body, BARRE_BASE_LIMIT);
  if (!bytes) return json(413, { ok: false, code: "TOO_LARGE", quoi: "Corps trop volumineux" });
  const text = bytes.toString("utf8");
  let proposed: Record<string, unknown> | null;
  try { proposed = object(JSON.parse(text)); } catch { proposed = null; }
  if (!proposed) return json(400, { ok: false, quoi: "JSON illisible — rien n'a été écrit" });
  const key = barreAttestationKey();

  // La version courante, relue chez La Barre, sert de référence aux attestations.
  const target = barreUpstreamUrl(path);
  const read = await fetch(target, { cache: "no-store", redirect: "error", signal });
  let current: Record<string, unknown> | null = null, currentEtag: string | null = null;
  if (read.status === 404) await read.body?.cancel();
  else if (!read.ok) { await read.body?.cancel(); throw new Error(`La Barre répond ${read.status}`); }
  else {
    const currentBytes = await readBounded(read.body, BARRE_BASE_LIMIT);
    if (!currentBytes) throw new Error("La base de La Barre dépasse le plafond d’écriture.");
    try { current = object(JSON.parse(currentBytes.toString("utf8"))); } catch { current = null; }
    currentEtag = read.headers.get("etag") ?? revision(currentBytes);
    if (!current) return json(409, { ok: false, conflit: true, code: "BASE_ILLISIBLE", quoi: "La base ne peut pas être relue ; elle a été conservée sans remplacement." });
  }
  const exists = current !== null;

  // Même précondition que La Barre, évaluée contre la version relue.
  const expected = request.headers.get("if-match");
  const creation = request.headers.get("if-none-match") === "*";
  const base = request.headers.get("x-base");
  const savedAt = typeof current?.enregistre_le === "string" ? current.enregistre_le : null;
  if (exists ? (!expected && !base && !creation) : !creation) {
    return json(428, { ok: false, conflit: true, code: "REVISION_REQUISE", quoi: "La version lue est requise avant la sauvegarde." }, currentEtag);
  }

  const identity = await barreSessionActor(actor.userId);
  const stamp = stampBarreBase(current, proposed, identity, { key, instance: barreBinding().instance, at: new Date().toISOString() });
  const outgoing = stamp.ok && stamp.changed ? Buffer.from(JSON.stringify(stamp.document, null, 1), "utf8") : bytes;
  // Une réponse perdue ne transforme pas un geste déjà reçu en échec : La Barre le reconnaîtra.
  const alreadyReceived = stamp.ok && exists && !creation && revision(outgoing) === currentEtag;
  if (!alreadyReceived) {
    const proposedAt = typeof proposed.enregistre_le === "string" ? proposed.enregistre_le : null;
    const stale = exists && (creation || (expected ? expected !== currentEtag
      : !savedAt || base !== savedAt || (proposedAt !== null && new Date(proposedAt) < new Date(savedAt))));
    if (stale) {
      return json(409, { ok: false, conflit: true, code: "REVISION_DEPASSEE", actuel: savedAt, revision: currentEtag,
        quoi: "Une autre version a été enregistrée. Vos modifications doivent être rapprochées de cette version." }, currentEtag);
    }
    if (!stamp.ok) {
      const refusal = BARRE_ATTESTATION_REFUSALS[stamp.code];
      return json(refusal.status, { ok: false, code: stamp.code, quoi: refusal.message, chemin: stamp.chemin }, currentEtag);
    }
  }

  const headers = new Headers({ "content-type": "application/json" });
  if (exists) headers.set("if-match", currentEtag!);
  else headers.set("if-none-match", "*");
  const upstream = await fetch(target, { method: request.method, headers, body: Uint8Array.from(outgoing), redirect: "error", cache: "no-store", signal });
  const responseHeaders = new Headers(PRIVATE);
  for (const name of READ_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null && name !== "content-length") responseHeaders.set(name, value);
  }
  if (!upstream.ok) return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  const answer = await upstream.text();
  let receipt: Record<string, unknown> | null;
  try { receipt = object(JSON.parse(answer)); } catch { receipt = null; }
  if (!receipt || !stamp.ok) return new Response(answer, { status: upstream.status, headers: responseHeaders });
  // Le navigateur reçoit ce qui a été attesté, pour l'afficher sans relire toute la base.
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify({ ...receipt, attestations: stamp.attestations }), { status: upstream.status, headers: responseHeaders });
}
