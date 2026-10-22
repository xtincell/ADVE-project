"use client";

import type { EquipeSection } from "@/server/services/strategy-presentation/types";
import { User } from "lucide-react";

interface Props { data: EquipeSection }

export function EquipeDisplay({ data }: Props) {
  return (
    <div className="space-y-6">
      {(data.equipeDirigeante?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground-secondary">Équipe dirigeante déclarée</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.equipeDirigeante.map((m, i) => (
              <div key={i} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="font-semibold text-foreground">{m.nom}</p>
                <p className="text-sm text-foreground-secondary">{m.role}</p>
                {m.bio && <p className="mt-2 text-sm text-foreground-secondary">{m.bio}</p>}
                {m.competencesCles.length > 0 && <p className="mt-2 text-sm text-foreground-secondary">Compétences : {m.competencesCles.join(" · ")}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.operator && (
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <p className="text-xs uppercase text-foreground-muted">Operateur</p>
          <p className="mt-1 text-lg font-bold text-foreground">{data.operator.name}</p>
        </div>
      )}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <p className="text-xs uppercase text-foreground-muted">Gestionnaire du dossier</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{data.owner.name ?? "—"}</p>
        {data.owner.email && <p className="text-xs text-foreground-muted">{data.owner.email}</p>}
      </div>
      {data.teamMembers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Equipe affectee</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.teamMembers.map((tm, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                  <User className="h-5 w-5 text-foreground-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tm.name}</p>
                  <p className="text-xs text-orange-400">{tm.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
