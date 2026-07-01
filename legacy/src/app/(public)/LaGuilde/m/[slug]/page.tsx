/**
 * La Guilde — détail d'une mission par slug public. ADR-0098.
 */

import type { Metadata } from "next";
import { MissionDetailView } from "@/components/laguilde/mission-detail-view";

export const metadata: Metadata = {
  title: "Mission — La Guilde | La Fusée",
  description: "Détail d'une mission publiée sur La Guilde.",
};

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
      <MissionDetailView slug={slug} />
    </div>
  );
}
