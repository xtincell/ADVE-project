/**
 * Argos — détail d'un dossier de référence par ref. ADR-0100.
 */

import type { Metadata } from "next";
import { ArgosDossierView } from "@/components/argos/argos-dossier-view";

export const metadata: Metadata = {
  title: "Dossier de référence — Argos by LaFusée",
  description: "Dossier de référence créatif décodé par Argos.",
};

export default async function ArgosDossierPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-10">
      <ArgosDossierView refId={ref} />
    </div>
  );
}
