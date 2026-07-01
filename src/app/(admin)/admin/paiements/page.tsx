import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Paiements" };

export default function AdminPaiementsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Paiements</h1>
      </header>
      <EmptyState
        tone="light"
        icon={<Landmark />}
        title="Aucun paiement à valider"
        description="La file de validation des paiements mobile money et WhatsApp arrivera ici (lot finance)."
      />
    </div>
  );
}
