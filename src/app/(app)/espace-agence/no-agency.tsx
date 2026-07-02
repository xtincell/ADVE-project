import Link from "next/link";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Refus honnête partagé par toutes les pages de l'espace agence : le compte
 * n'a de membership dans aucun workspace AGENCY — on l'explique, on ne montre
 * jamais une flotte vide qui laisserait croire à un espace actif.
 */
export function NoAgencyState({ title }: { title: string }) {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence</p>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </header>
      <EmptyState
        icon={<Building2 />}
        title="Espace réservé aux agences partenaires"
        description="Votre compte n'appartient à aucun workspace agence. Cet espace montre la flotte des marques qu'une agence accompagne — parlez-en à l'opérateur UPgraders si vous représentez une agence."
      >
        <Link href="/portails" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Voir mes espaces
        </Link>
      </EmptyState>
    </div>
  );
}
