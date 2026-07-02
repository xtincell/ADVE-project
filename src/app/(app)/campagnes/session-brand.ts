import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/session-token";
import { getBrandForSession, type BrandForSession } from "@/server/brand";

/**
 * Garde commune des pages production (/campagnes, /missions) — routes hors
 * matcher middleware (pattern /studio) : session vérifiée ici, marque du
 * workspace résolue (null ⇒ la page affiche l'EmptyState CTA /intake).
 */
export async function requireSessionAndBrand(
  next: string,
): Promise<{ session: SessionPayload; brand: BrandForSession | null }> {
  const session = await readSession();
  if (!session) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  const brand = await getBrandForSession(session);
  return { session, brand };
}
