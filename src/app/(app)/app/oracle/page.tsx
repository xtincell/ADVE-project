import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Oracle" };

export default function OraclePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Livrable</p>
        <h1 className="font-display text-3xl font-semibold">Oracle</h1>
      </header>
      <EmptyState
        icon={<ScrollText />}
        title="L'Oracle n'est pas encore composé"
        description="Votre document stratégique en 35 sections sera composé ici à partir de vos piliers ADVE, dans un prochain lot de construction."
      />
    </div>
  );
}
