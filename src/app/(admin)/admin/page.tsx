import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Admin" };

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Vue d&apos;ensemble</h1>
      </header>
      <EmptyState
        tone="light"
        icon={<Gauge />}
        title="La salle des opérations arrive ici"
        description="Leads entrants, paiements à valider et marques actives s'agrégeront ici au fil des prochains lots. Aucune donnée n'est encore branchée."
      />
    </div>
  );
}
