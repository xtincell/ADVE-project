/**
 * Empreinte digitale — infrastructure email du domaine (ADR-0121 vague A).
 * node:dns/promises : MX + TXT (SPF) + TXT _dmarc. Gratuit, déterministe,
 * best-effort : jamais de throw. Signale la « professionnalisation email »
 * de la marque (MX pro, SPF, DMARC) dans le rapport discovery.
 */

import { resolveMx, resolveTxt } from "node:dns/promises";

export interface EmailInfra {
  status: "LIVE" | "ERROR" | "SKIPPED";
  domain: string | null;
  hasMx: boolean;
  mxProvider: string | null;
  hasSpf: boolean;
  hasDmarc: boolean;
}

const SKIPPED: EmailInfra = { status: "SKIPPED", domain: null, hasMx: false, mxProvider: null, hasSpf: false, hasDmarc: false };

/** Identifie le provider email depuis les hosts MX. Pur. */
export function detectMxProvider(mxHosts: string[]): string | null {
  const joined = mxHosts.join(" ").toLowerCase();
  if (/google|gmail|googlemail/.test(joined)) return "Google Workspace";
  if (/outlook|protection\.office|microsoft/.test(joined)) return "Microsoft 365";
  if (/zoho/.test(joined)) return "Zoho Mail";
  if (/ovh/.test(joined)) return "OVH";
  if (/mail\.protonmail|protonmail/.test(joined)) return "Proton Mail";
  if (/yandex/.test(joined)) return "Yandex";
  if (/ionos|1and1/.test(joined)) return "IONOS";
  if (mxHosts.length > 0) return mxHosts[0]!.replace(/\.$/, "");
  return null;
}

/** True ssi un des enregistrements TXT est un SPF. Pur. */
export function hasSpfRecord(txtRecords: string[][]): boolean {
  return txtRecords.some((chunks) => chunks.join("").toLowerCase().startsWith("v=spf1"));
}

/** True ssi un des TXT _dmarc est un DMARC. Pur. */
export function hasDmarcRecord(txtRecords: string[][]): boolean {
  return txtRecords.some((chunks) => chunks.join("").toLowerCase().startsWith("v=dmarc1"));
}

export async function checkEmailInfrastructure(
  domain: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<EmailInfra> {
  if (!domain) return SKIPPED;
  const timeoutMs = opts?.timeoutMs ?? 5_000;
  const withTimeout = <T>(p: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), timeoutMs))]);

  try {
    const [mx, txt, dmarcTxt] = await Promise.all([
      withTimeout(resolveMx(domain), [] as Awaited<ReturnType<typeof resolveMx>>),
      withTimeout(resolveTxt(domain), [] as string[][]),
      withTimeout(resolveTxt(`_dmarc.${domain}`), [] as string[][]),
    ]);
    const mxHosts = mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange);
    return {
      status: "LIVE",
      domain,
      hasMx: mxHosts.length > 0,
      mxProvider: detectMxProvider(mxHosts),
      hasSpf: hasSpfRecord(txt),
      hasDmarc: hasDmarcRecord(dmarcTxt),
    };
  } catch {
    return { status: "ERROR", domain, hasMx: false, mxProvider: null, hasSpf: false, hasDmarc: false };
  }
}
