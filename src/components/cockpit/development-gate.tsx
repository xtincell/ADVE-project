"use client";

/**
 * DevelopmentGate — portail « en construction » (mandat opérateur 2026-07-13 :
 * « pour les comptes MVP je ne veux pas tout montrer, juste les
 * fonctionnalités qu'on a confirmées fiables »).
 *
 * Usage : envelopper le CONTENU d'une page pas encore confirmée fiable.
 *   <DevelopmentGate feature="Rapport de performance sociale">…</DevelopmentGate>
 *
 * Comportement :
 *   - Compte client (founder MVP) → écran honnête « En construction » (aucune
 *     donnée, aucun bouton mort) ;
 *   - Compte interne (opérateur/ADMIN) → contenu réel + chip « Aperçu
 *     interne » (on continue de tester sans l'exposer).
 *
 * Le flip d'une page (construction → fiable) = retirer le wrapper. Registre
 * client (ADR-0123) : zéro jargon.
 */

import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { Hammer, Eye } from "lucide-react";

export function DevelopmentGate({
  feature,
  children,
}: {
  /** Nom business de la fonctionnalité (affiché au client). */
  feature: string;
  children: React.ReactNode;
}) {
  const me = trpc.auth.me.useQuery();
  const isInternal = me.data?.canOperate === true;

  if (me.isLoading) {
    return <div className="h-40 animate-[shimmer_2s_linear_infinite] rounded-lg bg-surface-overlay" />;
  }

  if (!isInternal) {
    return (
      <div className="ck-card ck-devgate">
        <EmptyState
          icon={Hammer}
          title={`${feature} — en construction`}
          description="Cette fonctionnalité arrive dans votre cockpit. Nous ne livrons que ce qui est vérifié et fiable — elle s'activera ici dès qu'elle l'est, sans action de votre part."
        />
      </div>
    );
  }

  return (
    <div className="ck-devgate__internal">
      <p className="ck-devgate__chip"><Eye />Aperçu interne — pas encore visible des clients</p>
      {children}
    </div>
  );
}
