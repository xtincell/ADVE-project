/**
 * La Guilde — rejoindre (freelance / agence). ADR-0093.
 * JoinGuildForm consomme useSearchParams → Suspense boundary obligatoire.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { JoinGuildForm } from "@/components/laguilde/join-guild-form";

export const metadata: Metadata = {
  title: "Rejoindre la Guilde — La Fusée",
  description:
    "Freelances et agences de prod : créez votre profil, candidatez aux missions, soyez payés en mobile money.",
};

export default function RejoindrePage() {
  return (
    <div className="mx-auto max-w-[var(--maxw-prose)] px-[var(--pad-page)] py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Rejoindre la Guilde</h1>
        <p className="text-foreground-secondary">
          Créez votre profil freelance ou agence, accédez au mur des missions et candidatez.
          La progression par tiers (Apprenti → Compagnon → Maître → Associé) débloque de
          meilleures conditions.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <JoinGuildForm />
      </Suspense>
    </div>
  );
}
