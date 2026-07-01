import type { Metadata } from "next";
import { resolveShareToken } from "@/server/services/strategy-presentation";
import { db } from "@/lib/db";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const strategyId = await resolveShareToken(token);

  if (!strategyId) {
    return { title: "Document introuvable — LaFusee" };
  }

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true, advertis_vector: true },
  });

  const vector = strategy?.advertis_vector as { composite?: number } | null;
  const score = vector?.composite ?? 0;

  return {
    title: `${strategy?.name ?? "Marque"} — Proposition Strategique | LaFusee`,
    description: `Proposition strategique pour ${strategy?.name ?? "la marque"} — Score ADVE-RTIS: ${score}/200`,
    openGraph: {
      title: `${strategy?.name} — Proposition Strategique`,
      description: `Score ADVE-RTIS: ${score}/200 — Diagnostic complet et plan d'activation`,
      type: "website",
    },
  };
}

export default function StrategyTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
