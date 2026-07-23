"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { Calendar, CheckCircle, Plus, Trash2 } from "lucide-react";

export function MilestonesTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newMs, setNewMs] = useState({ title: "", dueDate: "", phase: "" });

  const msQuery = trpc.campaignManager.listMilestones.useQuery({ campaignId });
  const createMut = trpc.campaignManager.createMilestone.useMutation({
    onSuccess: () => { msQuery.refetch(); setShowCreate(false); setNewMs({ title: "", dueDate: "", phase: "" }); },
  });
  const completeMut = trpc.campaignManager.completeMilestone.useMutation({
    onSuccess: () => msQuery.refetch(),
  });
  const deleteMut = trpc.campaignManager.deleteMilestone.useMutation({
    onSuccess: () => msQuery.refetch(),
  });

  const milestones = (msQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-5">
      <Section
        title={`Jalons (${milestones.length})`}
        icon={Calendar}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Ajouter</span></MiniBtn>}
      >
        {msQuery.isLoading ? <EmptyMsg text="Chargement..." /> : milestones.length === 0 ? (
          <EmptyMsg text="Aucun jalon defini." />
        ) : (
          <div className="space-y-2">
            {milestones.map((ms) => {
              const isComplete = ms.status === "COMPLETED";
              const dueDate = ms.dueDate ? new Date(ms.dueDate as string) : null;
              const isOverdue = dueDate && !isComplete && dueDate < new Date();
              return (
                <div key={ms.id as string} className={`rounded-lg border p-4 ${isComplete ? "border-success/50 bg-success/10" : isOverdue ? "border-error/50 bg-error/10" : "border-border bg-background/50"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isComplete && <CheckCircle className="h-4 w-4 text-success" />}
                        <h4 className={`text-sm font-medium ${isComplete ? "text-success line-through" : "text-foreground"}`}>{ms.title as string}</h4>
                      </div>
                      {!!ms.phase && <p className="mt-1 text-xs text-foreground-muted">Phase: {ms.phase as string}</p>}
                      {dueDate && (
                        <p className={`mt-1 text-xs ${isOverdue ? "text-error font-medium" : "text-foreground-muted"}`}>
                          Echeance: {dueDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          {isOverdue && " (en retard)"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isComplete && (
                        <MiniBtn onClick={() => completeMut.mutate({ id: ms.id as string })} disabled={completeMut.isPending}>
                          <CheckCircle className="h-3 w-3" />
                        </MiniBtn>
                      )}
                      <MiniBtn variant="danger" onClick={() => deleteMut.mutate({ id: ms.id as string })} disabled={deleteMut.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </MiniBtn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau jalon" size="md">
        <div className="space-y-4">
          <FormField label="Titre" required>
            <input type="text" value={newMs.title} onChange={(e) => setNewMs({ ...newMs, title: e.target.value })}
              placeholder="Ex: Validation du brief creatif"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <FormField label="Phase">
            <input type="text" value={newMs.phase} onChange={(e) => setNewMs({ ...newMs, phase: e.target.value })}
              placeholder="Ex: PLANNING, PRODUCTION, APPROVAL"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <FormField label="Date d'echeance" required>
            <input type="date" value={newMs.dueDate} onChange={(e) => setNewMs({ ...newMs, dueDate: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newMs.title.trim() || !newMs.dueDate) return;
              createMut.mutate({ campaignId, title: newMs.title, dueDate: new Date(newMs.dueDate), phase: newMs.phase || undefined });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
