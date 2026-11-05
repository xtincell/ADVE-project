import { z } from "zod";
import { interpretError } from "@/lib/errors/friendly-error";

export const INTAKE_URL_MESSAGE = "Indiquez une adresse web valide, par exemple www.exemple.com ou https://exemple.com.";

/** Same address contract at entry, source reception and retry. Network requests
 * still go through ssrfSafeFetch; syntax normalization is not an SSRF guard. */
export const IntakeWebUrlSchema = z.string().trim().max(2048, INTAKE_URL_MESSAGE).transform((value, ctx) => {
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  const candidate = hasScheme ? value : value.startsWith("//") ? `https:${value}` : `https://${value}`;
  try {
    if (!value || /\s|\\/.test(value) || (hasScheme && !/^https?:\/\//i.test(value))) throw new Error();
    const url = new URL(candidate);
    // Public brand addresses use a domain or an IP, never credentials or an
    // ambiguous single word. The fetch layer checks resolved IPs and redirects.
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      !url.hostname.includes(".") || !url.hostname.split(".").every(label => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))) throw new Error();
    return url.href;
  } catch {
    ctx.addIssue({ code: "custom", message: INTAKE_URL_MESSAGE });
    return z.NEVER;
  }
});

export const OptionalIntakeWebUrlSchema = z.string().trim().optional()
  .transform(value => value || undefined).pipe(IntakeWebUrlSchema.optional());

/** Use the existing interpreter instead of exposing serialized validation issues. */
export function intakeErrorMessage(error: unknown): string {
  const friendly = interpretError(error);
  return [friendly.detail || friendly.title, friendly.implication].filter(Boolean).join(" ");
}
