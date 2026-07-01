import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Facturation" };

export default function FacturationPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Compte</p>
        <h1 className="font-display text-3xl font-semibold">Facturation</h1>
      </header>
      <EmptyState
        icon={<CreditCard />}
        title="Aucun abonnement pour le moment"
        description="La souscription par mobile money (Wave, Orange Money, MTN MoMo, Moov) et le paiement via WhatsApp arrivent dans un prochain lot de construction."
      />
    </div>
  );
}
