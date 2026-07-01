import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Ma marque" };

export default function AppHomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace marque</p>
        <h1 className="font-display text-3xl font-semibold">Ma marque</h1>
      </header>
      <EmptyState
        icon={<Rocket />}
        title="Votre tableau de bord arrive ici"
        description="Les piliers ADVE de votre marque, son score et son palier s'afficheront ici dès le prochain lot de construction. Rien n'est encore branché — nous ne montrons jamais de données inventées."
      />
    </div>
  );
}
