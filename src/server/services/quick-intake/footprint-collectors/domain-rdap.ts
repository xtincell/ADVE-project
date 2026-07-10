/**
 * Empreinte digitale — âge et registrar du domaine via RDAP (ADR-0121 vague A).
 * rdap.org bootstrap public, sans clé, déterministe. Best-effort : jamais de throw.
 */

export interface DomainInfo {
  status: "LIVE" | "NOT_FOUND" | "ERROR" | "SKIPPED";
  domain: string | null;
  createdAt: string | null;
  ageYears: number | null;
  registrar: string | null;
}

const SKIPPED: DomainInfo = { status: "SKIPPED", domain: null, createdAt: null, ageYears: null, registrar: null };

/** Extrait le domaine enregistrable d'une URL (approx : 2 derniers labels, 3 pour ccSLD type .co.uk/.com.ng). */
export function registrableDomain(rawUrl: string): string | null {
  try {
    const host = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    if (!host.includes(".")) return null;
    const parts = host.split(".");
    const ccSld = /^(co|com|net|org|gov|edu|ac)$/i;
    if (parts.length >= 3 && ccSld.test(parts[parts.length - 2]!) && parts[parts.length - 1]!.length === 2) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

/** Parse une réponse RDAP (events registration + entities registrar). Pur — testé sur fixtures. */
export function parseRdapResponse(json: Record<string, unknown>, domain: string, now = new Date()): DomainInfo {
  const events = Array.isArray(json.events) ? (json.events as Array<Record<string, unknown>>) : [];
  const registration = events.find((e) => e.eventAction === "registration");
  const createdAt = typeof registration?.eventDate === "string" ? registration.eventDate : null;

  let registrar: string | null = null;
  const entities = Array.isArray(json.entities) ? (json.entities as Array<Record<string, unknown>>) : [];
  for (const ent of entities) {
    const roles = Array.isArray(ent.roles) ? (ent.roles as string[]) : [];
    if (!roles.includes("registrar")) continue;
    const vcard = ent.vcardArray as [string, Array<[string, unknown, string, unknown]>] | undefined;
    const fn = vcard?.[1]?.find((row) => row[0] === "fn");
    if (fn && typeof fn[3] === "string") registrar = fn[3];
    if (!registrar && typeof ent.handle === "string") registrar = ent.handle;
    break;
  }

  let ageYears: number | null = null;
  if (createdAt) {
    const created = new Date(createdAt);
    if (!Number.isNaN(created.getTime())) {
      ageYears = Math.max(0, Math.round(((now.getTime() - created.getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10);
    }
  }
  return { status: "LIVE", domain, createdAt, ageYears, registrar };
}

export async function fetchDomainInfo(
  websiteUrl: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<DomainInfo> {
  const domain = websiteUrl ? registrableDomain(websiteUrl) : null;
  if (!domain) return SKIPPED;
  const timeoutMs = opts?.timeoutMs ?? 6_000;
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/rdap+json, application/json" },
      redirect: "follow",
    });
    if (res.status === 404) return { status: "NOT_FOUND", domain, createdAt: null, ageYears: null, registrar: null };
    if (!res.ok) return { status: "ERROR", domain, createdAt: null, ageYears: null, registrar: null };
    const json = (await res.json()) as Record<string, unknown>;
    return parseRdapResponse(json, domain);
  } catch {
    return { status: "ERROR", domain, createdAt: null, ageYears: null, registrar: null };
  }
}
