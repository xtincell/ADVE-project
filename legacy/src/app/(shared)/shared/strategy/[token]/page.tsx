/**
 * Shared Strategy Presentation — Public Page (Server Component)
 * Resolves token → assembles full document → renders client-side presentation.
 */

import { notFound } from "next/navigation";
import { resolveShareToken, assemblePresentation } from "@/server/services/strategy-presentation";
import { PresentationLayout } from "@/components/strategy-presentation/presentation-layout";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ persona?: string }>;
};

export default async function SharedStrategyPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { persona } = await searchParams;

  const strategyId = await resolveShareToken(token);
  if (!strategyId) notFound();

  const document = await assemblePresentation(strategyId);

  const validPersona =
    persona === "client" || persona === "creative" ? persona : "consultant";

  return <PresentationLayout document={document} defaultPersona={validPersona} />;
}
