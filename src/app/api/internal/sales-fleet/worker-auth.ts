import { timingSafeEqual } from "node:crypto";

/** Jeton du superviseur de la flotte, comparé en temps constant. Sans secret configuré : refus. */
export function isSalesWorkerRequest(request: Request): boolean {
  const secret = process.env.SALES_WORKER_TOKEN;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
