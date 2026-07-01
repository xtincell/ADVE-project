import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Marques" };

export default function AdminMarquesPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Marques</h1>
      </header>
      <EmptyState
        tone="light"
        icon={<Rocket />}
        title="Aucune marque à afficher"
        description="La flotte des marques clientes — palier, score, dernier livrable — s'affichera ici au fil des inscriptions."
      />
    </div>
  );
}
