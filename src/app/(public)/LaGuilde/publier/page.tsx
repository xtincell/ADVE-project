/**
 * La Guilde — déposer une mission (marques). ADR-0098.
 */

import type { Metadata } from "next";
import { PostMissionForm } from "@/components/laguilde/post-mission-form";

export const metadata: Metadata = {
  title: "Publier une mission — La Guilde | La Fusée",
  description:
    "Publiez votre mission créative et recevez des candidatures de freelances et agences de prod vérifiés.",
};

export default function PublierPage() {
  return (
    <div className="mx-auto max-w-[var(--maxw-prose)] px-[var(--pad-page)] py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Publier une mission</h1>
        <p className="text-foreground-secondary">
          Décrivez votre besoin. Un opérateur UPgraders valide la mission avant sa mise en ligne
          sur le mur public, puis les talents de la Guilde candidatent.
        </p>
      </header>
      <PostMissionForm />
    </div>
  );
}
