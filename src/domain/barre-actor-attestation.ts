/**
 * Acteur authentifié des décisions La Barre (point LB3 du programme Shinkiro, ADR-0245).
 *
 * Servie derrière La Fusée, La Barre enregistre sa base d'un bloc
 * (`PUT depots/<fichier>.json`). La route de La Fusée relit la version courante,
 * repère les entrées nouvelles de trois registres (décisions, journal, versions de
 * bilan de campagne) et les tamponne avec la personne de la session : champ dédié
 * `attestation`, scellé par La Fusée. Le navigateur ne peut ni en présenter une
 * qu'il aurait écrite, ni en modifier, ni en effacer une : une attestation absente
 * de la base envoyée est rétablie, une attestation inconnue ou une entrée attestée
 * disparue est refusée.
 *
 * L'identité d'une entrée est son contenu sans `attestation` (JSON canonique) :
 * modifier une entrée attestée revient à la retirer, ce qui est refusé. Seules les
 * lignes de journal sans marque peuvent disparaître, par la troncature que La Barre
 * pratique elle-même au-delà de 2 000 lignes (elle en garde au moins 1 500).
 *
 * Layer 0 : pas d'accès base ni réseau ; la clé, l'instance et l'horloge sont
 * passées en argument.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { canonicalJson } from "./canonical-json";

/** Capacité déclarée à La Barre dans `contexte.json`. */
export const BARRE_ACTOR_ATTESTATION = "SESSION_V1";
/** Ce que La Barre garde au moins quand elle tronque son journal (app/depot.js). */
export const BARRE_JOURNAL_TRUNCATION_FLOOR = 1500;

const HEX = /^[a-f0-9]{64}$/;
const SEAL_DOMAIN = "la-barre/attestation-acteur-v1";

export const BarreActorAttestationSchema = z.object({
  par: z.literal("la-fusee"),
  userId: z.string().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/),
  nom: z.string().max(300).nullable(),
  at: z.iso.datetime(),
  empreinte: z.string().regex(HEX),
  sceau: z.string().regex(HEX),
}).strict();
export type BarreActorAttestation = z.infer<typeof BarreActorAttestationSchema>;

/** La personne connectée : identifiant stable et nom affichable, jamais d'e-mail. */
export type BarreSessionActor = { userId: string; nom: string | null };
export type BarreAttestationOptions = { key: string; instance: string; at: string };

type Entry = Record<string, unknown>;
const record = (value: unknown): Entry | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Entry : null;

function withoutAttestation(entry: Entry): Entry {
  const { attestation: _attestation, ...content } = entry;
  return content;
}

/** SHA-256 du JSON canonique de l'entrée, sans son attestation. */
export function barreEntryDigest(entry: Entry): string {
  return createHash("sha256").update(canonicalJson(withoutAttestation(entry)), "utf8").digest("hex");
}

function seal(key: string, instance: string, fields: Omit<BarreActorAttestation, "par" | "sceau">): string {
  return createHmac("sha256", key)
    .update(JSON.stringify([SEAL_DOMAIN, instance, fields.userId, fields.nom, fields.at, fields.empreinte]))
    .digest("hex");
}

export function attestBarreEntry(entry: Entry, actor: BarreSessionActor, options: BarreAttestationOptions): BarreActorAttestation {
  const fields = { userId: actor.userId, nom: actor.nom, at: options.at, empreinte: barreEntryDigest(entry) };
  return { par: "la-fusee", ...fields, sceau: seal(options.key, options.instance, fields) };
}

/**
 * Une attestation de l'entrée est valide si elle a la forme attendue, désigne ce
 * contenu exact et porte le sceau de cette installation.
 */
export function verifyBarreAttestation(entry: Entry, options: Omit<BarreAttestationOptions, "at">): boolean {
  const parsed = BarreActorAttestationSchema.safeParse(entry.attestation);
  if (!parsed.success) return false;
  const { par: _par, sceau, ...fields } = parsed.data;
  if (fields.empreinte !== barreEntryDigest(entry)) return false;
  const expected = Buffer.from(seal(options.key, options.instance, fields));
  const given = Buffer.from(sceau);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type BarreAttestationRefusal = "ATTESTATION_NOT_RECOGNIZED" | "ATTESTATION_REMOVED" | "ATTESTATION_ENTRY_INVALID";

export const BARRE_ATTESTATION_REFUSALS: Record<BarreAttestationRefusal, { status: number; message: string }> = {
  ATTESTATION_NOT_RECOGNIZED: { status: 422, message: "Une attestation envoyée ne correspond à aucune attestation enregistrée. Seule La Fusée atteste les gestes, au moment où elle les enregistre : rechargez La Barre." },
  ATTESTATION_REMOVED: { status: 422, message: "Une décision, une version de bilan ou une ligne de journal attestée a disparu ou changé dans la base envoyée. Une entrée attestée ne se modifie ni ne s’efface : rechargez La Barre." },
  ATTESTATION_ENTRY_INVALID: { status: 422, message: "Une décision, une version de bilan ou une ligne de journal n’a pas la forme d’un objet : elle ne peut pas être attestée." },
};

export type BarreAttestationPath = Array<string | number>;
export type BarreStampedAttestation = { chemin: BarreAttestationPath; attestation: BarreActorAttestation; motif: "POSEE" | "RETABLIE" };
export type BarreStampResult =
  | { ok: true; document: Entry; changed: boolean; attestations: BarreStampedAttestation[] }
  | { ok: false; code: BarreAttestationRefusal; chemin: BarreAttestationPath };

type Group = {
  current: Array<{ value: unknown; chemin: BarreAttestationPath }>;
  proposed: Array<{ value: unknown; chemin: BarreAttestationPath }>;
  /** Le journal peut perdre ses lignes sans marque par troncature ; rien d'autre ne disparaît. */
  truncation?: { proposedLength: number };
};

const keyOf = (value: unknown) => { const r = record(value); return canonicalJson(r ? withoutAttestation(r) : value); };
const attestationOf = (value: unknown) => { const r = record(value); return r && r.attestation != null ? r.attestation : null; };
const hasBrands = (value: unknown) => { const m = record(value)?.marques; return Array.isArray(m) && m.length > 0; };

function arrayAt(root: Entry | null, key: string): unknown[] {
  const value = root?.[key];
  return Array.isArray(value) ? value : [];
}

/** Les trois registres attestés, et leur chemin dans la base. */
function groups(current: Entry | null, proposed: Entry): Group[] {
  const list = (root: Entry | null, key: string) => arrayAt(root, key).map((value, i) => ({ value, chemin: [key, i] }));
  const reviews = (root: Entry | null) => {
    const byCampaign = new Map<string, Array<{ value: unknown; chemin: BarreAttestationPath }>>();
    arrayAt(root, "campagnes").forEach((campagne, c) => {
      const id = JSON.stringify(record(campagne)?.id ?? null);
      arrayAt(record(campagne), "bilanVersions").forEach((value, v) => {
        byCampaign.set(id, [...(byCampaign.get(id) ?? []), { value, chemin: ["campagnes", c, "bilanVersions", v] }]);
      });
    });
    return byCampaign;
  };
  const before = reviews(current), after = reviews(proposed);
  const campaigns = [...new Set([...before.keys(), ...after.keys()])];
  return [
    { current: list(current, "decisions"), proposed: list(proposed, "decisions") },
    { current: list(current, "journal"), proposed: list(proposed, "journal"),
      truncation: { proposedLength: arrayAt(proposed, "journal").length } },
    ...campaigns.map((id) => ({ current: before.get(id) ?? [], proposed: after.get(id) ?? [] })),
  ];
}

function entryAt(root: Entry, chemin: BarreAttestationPath): Entry {
  let value: unknown = root;
  for (const step of chemin) value = (value as Record<string | number, unknown>)[step];
  return value as Entry;
}

/**
 * Compare la base envoyée à la version courante et tamponne ce qui est nouveau.
 * Ne modifie pas `proposed` : rend une copie quand une attestation est posée ou
 * rétablie.
 */
export function stampBarreBase(current: unknown, proposed: Entry, actor: BarreSessionActor, options: BarreAttestationOptions): BarreStampResult {
  const document = structuredClone(proposed);
  const attestations: BarreStampedAttestation[] = [];
  for (const group of groups(record(current), document)) {
    const pool = new Map<string, Array<{ attestation: unknown; used: boolean; value: unknown; chemin: BarreAttestationPath }>>();
    for (const entry of group.current) {
      const key = keyOf(entry.value);
      pool.set(key, [...(pool.get(key) ?? []), { attestation: attestationOf(entry.value), used: false, ...entry }]);
    }
    // Une attestation présentée doit être celle déjà enregistrée pour ce contenu.
    for (const entry of group.proposed) {
      const presented = attestationOf(entry.value);
      if (presented === null) continue;
      const match = (pool.get(keyOf(entry.value)) ?? []).find((c) => !c.used && c.attestation !== null && canonicalJson(c.attestation) === canonicalJson(presented));
      if (!match) return { ok: false, code: "ATTESTATION_NOT_RECOGNIZED", chemin: entry.chemin };
      match.used = true;
    }
    for (const entry of group.proposed) {
      const r = record(entry.value);
      if (attestationOf(entry.value) !== null) continue;
      const candidates = (pool.get(keyOf(entry.value)) ?? []).filter((c) => !c.used);
      const kept = candidates.find((c) => c.attestation !== null) ?? candidates[0];
      if (!r) {
        // Une entrée qui n'est pas un objet ne peut être que reprise telle quelle.
        if (!kept || kept.attestation !== null) return { ok: false, code: "ATTESTATION_ENTRY_INVALID", chemin: entry.chemin };
        kept.used = true;
        continue;
      }
      const target = entryAt(document, entry.chemin);
      if (kept) {
        kept.used = true;
        if (kept.attestation === null) continue;
        // Absente de l'envoi, elle est rétablie : le navigateur ne l'efface pas.
        delete target.attestation;
        target.attestation = structuredClone(kept.attestation);
        attestations.push({ chemin: entry.chemin, attestation: target.attestation as BarreActorAttestation, motif: "RETABLIE" });
        continue;
      }
      delete target.attestation;
      const attestation = attestBarreEntry(target, actor, options);
      target.attestation = attestation;
      attestations.push({ chemin: entry.chemin, attestation, motif: "POSEE" });
    }
    for (const candidates of pool.values()) {
      for (const c of candidates) {
        if (c.used || c.attestation === null) continue;
        const truncated = group.truncation && group.truncation.proposedLength >= BARRE_JOURNAL_TRUNCATION_FLOOR && !hasBrands(c.value);
        if (!truncated) return { ok: false, code: "ATTESTATION_REMOVED", chemin: c.chemin };
      }
    }
  }
  return attestations.length ? { ok: true, document, changed: true, attestations } : { ok: true, document: proposed, changed: false, attestations };
}
