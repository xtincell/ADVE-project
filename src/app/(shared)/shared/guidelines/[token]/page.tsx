/**
 * /shared/guidelines/[token] — page PUBLIQUE des guidelines de marque.
 *
 * Résout le token persisté par `getShareableLink` (businessContext.
 * guidelinesShareToken) et rend le document HTML du renderer. Cette route
 * N'EXISTAIT PAS alors que le cockpit copiait déjà des liens vers elle — le
 * destinataire recevait un 404 (audit 2026-07-16, `guidelines-share-dead-route`).
 *
 * Lecture seule, aucune donnée de contact, token non-devinable (24 octets).
 */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exportHtml } from "@/server/services/guidelines-renderer";

export const dynamic = "force-dynamic";

export default async function SharedGuidelinesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  // Résolution du token — champ JSON, filtrage en mémoire sur les candidats
  // (le token est unique par construction : randomBytes(24)).
  const candidates = await db.strategy.findMany({
    where: { businessContext: { path: ["guidelinesShareToken"], equals: token } },
    select: { id: true },
    take: 1,
  });
  const strategyId = candidates[0]?.id;
  if (!strategyId) notFound();

  const html = await exportHtml(strategyId).catch(() => null);
  if (!html) notFound();

  // Le renderer produit un document complet autonome — rendu tel quel.
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
