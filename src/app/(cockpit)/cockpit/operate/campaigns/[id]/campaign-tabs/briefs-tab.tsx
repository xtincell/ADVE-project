"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { getFieldLabel } from "@/components/cockpit/field-renderers";
import { Section, MiniBtn, EmptyMsg } from "./shared";
import { ClipboardList, FileText, Plus } from "lucide-react";

export function BriefsTab({ campaignId, strategyId }: { campaignId: string; strategyId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newBrief, setNewBrief] = useState({ briefType: "CREATIVE", title: "", content: "" });
  const [generating, setGenerating] = useState<string | null>(null);

  const briefsQuery = trpc.campaignManager.listBriefs.useQuery({ campaignId });
  const typesQuery = trpc.campaignManager.getBriefTypes.useQuery();
  const createMut = trpc.campaignManager.createBrief.useMutation({
    onSuccess: () => { briefsQuery.refetch(); setShowCreate(false); setNewBrief({ briefType: "CREATIVE", title: "", content: "" }); },
  });

  const utils = trpc.useUtils();
  const validateBriefMut = trpc.campaignManager.validateBriefAndCreateMission.useMutation({
    onSuccess: () => {
      briefsQuery.refetch();
      utils.campaign.get.invalidate({ id: campaignId });
      utils.campaignManager.dashboard.invalidate({ strategyId });
    },
  });

  const genCreative = trpc.campaignManager.generateCreativeBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genMedia = trpc.campaignManager.generateMediaBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genVendor = trpc.campaignManager.generateVendorBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });
  const genProd = trpc.campaignManager.generateProductionBrief.useMutation({ onSuccess: () => { briefsQuery.refetch(); setGenerating(null); } });

  const briefs = (briefsQuery.data ?? []) as Array<Record<string, unknown>>;
  const types = (typesQuery.data ?? []) as Array<Record<string, unknown>>;

  const handleGenerate = (type: string) => {
    setGenerating(type);
    const params = { campaignId, strategyId };
    if (type === "CREATIVE") genCreative.mutate(params);
    else if (type === "MEDIA") genMedia.mutate(params);
    else if (type === "VENDOR") genVendor.mutate(params);
    else if (type === "PRODUCTION") genProd.mutate(params);
  };

  return (
    <div className="space-y-5">
      {/* Deterministic brief generation bar */}
      <Section title="Génération de brief (déterministe)" icon={FileText}>
        <p className="mb-3 text-xs text-foreground-muted">Briefs dérivés mécaniquement du noyau ADVE de la marque — reproductibles, sans LLM.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "CREATIVE", label: "Brief creatif" },
            { type: "MEDIA", label: "Brief media" },
            { type: "VENDOR", label: "Brief prestataire" },
            { type: "PRODUCTION", label: "Brief production" },
          ].map((g) => (
            <MiniBtn
              key={g.type}
              onClick={() => handleGenerate(g.type)}
              disabled={generating === g.type}
            >
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {generating === g.type ? "Generation..." : `Generer ${g.label}`}
              </span>
            </MiniBtn>
          ))}
        </div>
      </Section>

      {/* Briefs list */}
      <Section
        title={`Briefs (${briefs.length})`}
        icon={ClipboardList}
        action={<MiniBtn variant="primary" onClick={() => setShowCreate(true)}><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Manuel</span></MiniBtn>}
      >
        {briefsQuery.isLoading ? <EmptyMsg text="Chargement..." /> : briefs.length === 0 ? (
          <EmptyMsg text="Aucun brief. Generez-en un par IA ou creez-le manuellement." />
        ) : (
          <div className="space-y-2">
            {briefs.map((b) => (
              <div key={b.id as string} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-bold text-accent">{b.type as string}</span>
                      <h4 className="text-sm font-medium text-white">{(b.title as string) ?? `Brief ${(b.id as string).slice(0, 8)}`}</h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ring-1 ring-inset ${
                        b.status === "VALIDATED"
                          ? "bg-success/15 text-success ring-success/30 border border-success/30"
                          : "bg-foreground-muted/15 text-foreground-secondary ring-border/30 border border-border/30"
                      }`}>
                        {b.status === "VALIDATED" ? "Validé" : "Brouillon"}
                      </span>
                    </div>
                    {!!b.version && <p className="mt-0.5 text-xs text-foreground-muted">v{b.version as number}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {b.status !== "VALIDATED" && (
                      <div className="flex flex-col items-end gap-1">
                        <MiniBtn
                          variant="primary"
                          onClick={() => validateBriefMut.mutate({ id: b.id as string })}
                          disabled={validateBriefMut.isPending}
                        >
                          {validateBriefMut.isPending ? "Validation..." : "Valider & Créer la Mission"}
                        </MiniBtn>
                        {validateBriefMut.isError && validateBriefMut.variables?.id === b.id && (
                          <p className="text-[10px] text-error max-w-[200px] text-right">{validateBriefMut.error.message}</p>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-foreground-muted">
                      {b.createdAt ? new Date(b.createdAt as string).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </div>
                </div>
                {!!b.content && (
                  <p className="mt-2 text-xs text-foreground-secondary line-clamp-3">{typeof b.content === "string" ? b.content : typeof b.content === "object" && b.content !== null ? Object.entries(b.content as Record<string, unknown>).filter(([, v]) => typeof v === "string").slice(0, 3).map(([k, v]) => `${getFieldLabel(k)}: ${(v as string).slice(0, 50)}`).join(" · ") || "(contenu structure)" : String(b.content)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau brief" size="md">
        <div className="space-y-4">
          <FormField label="Type" required>
            <select value={newBrief.briefType} onChange={(e) => setNewBrief({ ...newBrief, briefType: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong">
              {types.length > 0 ? types.map((t) => (
                <option key={t.code as string} value={t.code as string}>{(t.label as string) ?? (t.code as string)}</option>
              )) : ["CREATIVE", "MEDIA", "VENDOR", "PRODUCTION", "SOCIAL", "PR"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Titre" required>
            <input type="text" value={newBrief.title} onChange={(e) => setNewBrief({ ...newBrief, title: e.target.value })}
              placeholder="Ex: Brief creatif — lancement produit X"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <FormField label="Contenu" required>
            <textarea value={newBrief.content} onChange={(e) => setNewBrief({ ...newBrief, content: e.target.value })}
              rows={6} placeholder="Redigez le contenu du brief..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <MiniBtn onClick={() => setShowCreate(false)}>Annuler</MiniBtn>
            <MiniBtn variant="primary" onClick={() => {
              if (!newBrief.title.trim() || !newBrief.content.trim()) return;
              createMut.mutate({ campaignId, title: newBrief.title, content: { body: newBrief.content }, briefType: newBrief.briefType as any });
            }} disabled={createMut.isPending}>Creer</MiniBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
