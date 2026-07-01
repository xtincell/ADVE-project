import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Leads" };

export default function AdminLeadsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Leads</h1>
      </header>
      <EmptyState
        tone="light"
        icon={<Inbox />}
        title="Aucun lead à afficher"
        description="Les diagnostics gratuits soumis via le funnel public arriveront ici (lot funnel intake)."
      />
    </div>
  );
}
