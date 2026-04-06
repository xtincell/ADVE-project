"use client";

import type { EquipeSection } from "@/server/services/strategy-presentation/types";
import { User } from "lucide-react";

interface Props { data: EquipeSection }

export function EquipeDisplay({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.operator && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs uppercase text-zinc-600">Operateur</p>
          <p className="mt-1 text-lg font-bold text-zinc-200">{data.operator.name}</p>
        </div>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs uppercase text-zinc-600">Responsable strategie</p>
        <p className="mt-1 text-sm font-semibold text-zinc-200">{data.owner.name ?? "—"}</p>
        {data.owner.email && <p className="text-xs text-zinc-500">{data.owner.email}</p>}
      </div>
      {data.teamMembers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Equipe affectee</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.teamMembers.map((tm, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{tm.name}</p>
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
