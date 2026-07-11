"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { Plus, Trash2, Users } from "lucide-react";

export function TeamTab({ campaignId }: { campaignId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ userId: "", role: "MEMBER" });

  const teamQuery = trpc.campaignManager.getTeam.useQuery({ campaignId });
  const addMut = trpc.campaignManager.addTeamMember.useMutation({
    onSuccess: () => { teamQuery.refetch(); setShowAdd(false); setNewMember({ userId: "", role: "MEMBER" }); },
  });
  const removeMut = trpc.campaignManager.removeTeamMember.useMutation({
    onSuccess: () => teamQuery.refetch(),
  });

  const members = (teamQuery.data ?? []) as Array<Record<string, unknown>>;

  const ROLES = ["ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "STRATEGIC_PLANNER", "CREATIVE_DIRECTOR", "ART_DIRECTOR", "COPYWRITER", "MEDIA_PLANNER", "MEDIA_BUYER", "SOCIAL_MANAGER", "PRODUCTION_MANAGER", "PROJECT_MANAGER", "DATA_ANALYST", "CLIENT"];

  return (
    <div className="space-y-5">
      <Section
        title={`Equipe (${members.length})`}
        icon={Users}
        action={<MiniBtn variant="primary" onClick={() => setShowAdd(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {teamQuery.isLoading ? <EmptyMsg text="Chargement..." /> : members.length === 0 ? (
          <EmptyMsg text="Aucun membre dans l'equipe." />
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const user = m.user as Record<string, unknown> | undefined;
              return (
                <div key={m.id as string} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-xs font-bold text-white">
                      {((user?.name as string) ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{(user?.name as string) ?? (m.userId as string)?.slice(0, 8)}</p>
                      <span className="rounded bg-background px-1.5 py-0.5 text-2xs font-medium text-foreground-secondary">{m.role as string}</span>
                    </div>
                  </div>
                  <MiniBtn variant="danger" onClick={() => removeMut.mutate({ campaignId, userId: m.userId as string })} disabled={removeMut.isPending}>
                    <Trash2 className="h-3 w-3" />
                  </MiniBtn>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un membre" size="sm">
        <div className="space-y-4">
          <FormField label="User ID" required>
            <input
              type="text"
              value={newMember.userId}
              onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
              placeholder="ID utilisateur"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="Role" required>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowAdd(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMember.userId.trim()) return;
              addMut.mutate({ campaignId, userId: newMember.userId, role: newMember.role as any });
            }} disabled={addMut.isPending}>Ajouter</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
