"use client";

import type { TimelineGouvernanceSection } from "@/server/services/strategy-presentation/types";
import { DataTable } from "../shared/data-table";

interface Props { data: TimelineGouvernanceSection }

export function TimelineGouvernance({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.campaigns.length > 0 && data.campaigns.some((c) => c.milestones.length > 0) && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Retroplanning</h3>
          {data.campaigns.filter((c) => c.milestones.length > 0).map((c, i) => (
            <div key={i} className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-zinc-300">{c.name}</h4>
              <DataTable
                headers={["Jalon", "Echeance", "Statut"]}
                rows={c.milestones.map((m) => [
                  m.title,
                  m.dueDate ? new Date(m.dueDate).toLocaleDateString("fr") : "—",
                  m.status,
                ])}
                compact
              />
            </div>
          ))}
        </div>
      )}
      {data.teamMembers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Gouvernance</h3>
          <DataTable
            headers={["Nom", "Role", "Email"]}
            rows={data.teamMembers.map((t) => [t.name, t.role, t.email ?? "—"])}
            compact
          />
        </div>
      )}
    </div>
  );
}
