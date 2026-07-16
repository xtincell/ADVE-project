/**
 * La Guilde — suivi des missions déposées par la marque connectée.
 *
 * Audit 2026-07-16 `guild-brand-no-tracking-surface` : `myPostedMissions`
 * existait côté serveur sans AUCUN consommateur — après le dépôt, la marque
 * n'avait aucune surface pour voir le statut de modération, le motif de rejet
 * ou le nombre de candidatures. Elle déposait dans le vide.
 */

import type { Metadata } from "next";
import { MyPostedMissions } from "@/components/laguilde/my-posted-missions";

export const metadata: Metadata = {
  title: "Mes missions déposées — La Guilde | La Fusée",
  description: "Suivez la validation, la publication et les candidatures de vos missions déposées.",
};

export default function MesMissionsPage() {
  return (
    <div className="mx-auto max-w-[var(--maxw-prose)] px-[var(--pad-page)] py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes missions déposées</h1>
        <p className="text-foreground-secondary">
          Le statut de validation, les candidatures reçues et les décisions sur chacune de vos
          missions.
        </p>
      </header>
      <MyPostedMissions />
    </div>
  );
}
