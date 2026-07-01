"use client";

import { useState } from "react";
import {
  Clock,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { MissionCard } from "@/components/shared/mission-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function ActiveMissionsPage() {
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<string | null>(null);
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [deliverableFile, setDeliverableFile] = useState("");
  const [titleError, setTitleError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const missions = trpc.mission.list.useQuery({ status: "IN_PROGRESS", limit: 50 });
  const missionDetail = trpc.mission.get.useQuery(
    { id: selectedMission! },
    { enabled: !!selectedMission }
  );

  // ADR-0049 — fetch upstream campaign briefs when mission is campaign-scoped
  const campaignId = missionDetail.data?.campaignId ?? null;
  const campaignBriefsQuery = trpc.campaignManager.listBriefs.useQuery(
    { campaignId: campaignId! },
    { enabled: !!campaignId },
  );

  const submitDeliverable = trpc.mission.submitDeliverable.useMutation({
    onSuccess: () => {
      missions.refetch();
      setSubmitModal(null);
      setDeliverableTitle("");
      setDeliverableNotes("");
      setDeliverableFile("");
      setTitleError("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  if (missions.isLoading) return <SkeletonPage />;

  const activeMissions = missions.data ?? [];

  const handleSubmit = () => {
    if (!submitModal) return;
    if (!deliverableTitle || deliverableTitle.trim().length < 3) {
      setTitleError("Le titre doit contenir au moins 3 caracteres");
      return;
    }
    setTitleError("");
    submitDeliverable.mutate({
      missionId: submitModal,
      title: deliverableTitle,
      description: deliverableNotes || undefined,
      fileUrl: deliverableFile || undefined,
    });
  };

  const detail = missionDetail.data;
  const detailMeta = detail?.advertis_vector as Record<string, unknown> | null;
  const deadline = detailMeta?.deadline as string | undefined;

  function getSlaInfo(deadlineStr?: string) {
    if (!deadlineStr) return null;
    const now = new Date();
    const dl = new Date(deadlineStr);
    const hoursLeft = (dl.getTime() - now.getTime()) / 3600000;
    const daysLeft = Math.floor(hoursLeft / 24);
    const severity =
      hoursLeft < 0 ? "breached" : hoursLeft < 24 ? "urgent" : hoursLeft < 48 ? "warning" : "ok";
    return { hoursLeft, daysLeft, severity, deadline: dl };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions actives"
        description={`${activeMissions.length} mission(s) en cours`}
        breadcrumbs={[
          { label: "Dashboard", href: "/creator" },
          { label: "Missions actives" },
        ]}
      />

      {activeMissions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucune mission active"
          description="Consultez les missions disponibles pour en accepter de nouvelles."
          action={{
            label: "Voir les missions",
            onClick: () => (window.location.href = "/creator/missions/available"),
          }}
        />
      ) : (
        <div className="space-y-4">
          {activeMissions.map((m) => {
            const meta = m.advertis_vector as Record<string, unknown> | null;
            const mDeadline = meta?.deadline as string | undefined;
            const sla = getSlaInfo(mDeadline);
            const deliverableCount = m.deliverables?.length ?? 0;

            return (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {m.driver?.name ?? "Driver N/A"} - {m.driver?.channel ?? ""}
                    </p>
                  </div>
                  <StatusBadge status="in_progress" />
                </div>

                {/* SLA countdown */}
                {sla && (
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                      sla.severity === "breached"
                        ? "bg-red-400/10 text-red-400"
                        : sla.severity === "urgent"
                          ? "bg-amber-400/10 text-amber-400"
                          : sla.severity === "warning"
                            ? "bg-yellow-400/10 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {sla.severity === "breached" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {sla.severity === "breached"
                        ? "Deadline depassee"
                        : `${sla.daysLeft}j ${Math.floor(sla.hoursLeft % 24)}h restants`}
                    </span>
                    <span className="ml-auto text-zinc-500">
                      {sla.deadline.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                )}

                {/* Deliverables info */}
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {deliverableCount} livrable(s) soumis
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {m.deliverables?.filter((d) => d.status === "APPROVED").length ?? 0} approuve(s)
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelectedMission(m.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Voir le brief
                  </button>
                  <button
                    onClick={() => setSubmitModal(m.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Soumettre livrable
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Brief detail modal */}
      <Modal
        open={!!selectedMission}
        onClose={() => setSelectedMission(null)}
        title="Brief de la mission"
        size="lg"
      >
        {missionDetail.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            ))}
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Strategie</span>
                <p className="font-medium text-zinc-300">{detail.strategy?.name}</p>
              </div>
              <div>
                <span className="text-zinc-500">Driver</span>
                <p className="font-medium text-zinc-300">
                  {detail.driver?.name} ({detail.driver?.channel})
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Mode</span>
                <p className="font-medium text-zinc-300">{detail.mode ?? "DISPATCH"}</p>
              </div>
              {deadline && (
                <div>
                  <span className="text-zinc-500">Deadline</span>
                  <p className="font-medium text-zinc-300">
                    {new Date(deadline).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* ADR-0049 — upstream campaign brief surface */}
            {campaignId && campaignBriefsQuery.data && campaignBriefsQuery.data.length > 0 && (
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-violet-300">
                  <FileText className="h-3.5 w-3.5" />
                  Brief de campagne (source)
                </h4>
                <div className="space-y-2">
                  {campaignBriefsQuery.data.slice(0, 2).map((b) => {
                    const content = (b.content ?? {}) as Record<string, unknown>;
                    const objective = (content.objective as string) ?? (content.context as string) ?? null;
                    return (
                      <div key={b.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-white">{b.title}</span>
                          {b.briefType && (
                            <span className="rounded-full bg-violet-400/15 px-1.5 py-px text-[9px] font-semibold uppercase text-violet-300">
                              {b.briefType}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">v{b.version}</span>
                        </div>
                        {objective && (
                          <p className="mt-1 line-clamp-3 text-[11px] text-zinc-400 leading-relaxed">{objective}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.deliverables && detail.deliverables.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400">Livrables soumis</h4>
                <div className="space-y-2">
                  {detail.deliverables.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <span className="text-sm text-zinc-300">{d.title}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Submit deliverable modal */}
      <Modal
        open={!!submitModal}
        onClose={() => {
          setSubmitModal(null);
          setDeliverableTitle("");
          setDeliverableNotes("");
          setDeliverableFile("");
          setTitleError("");
        }}
        title="Soumettre un livrable"
      >
        <div className="space-y-4">
          <FormField label="Titre du livrable" required>
            <input
              type="text"
              value={deliverableTitle}
              onChange={(e) => {
                setDeliverableTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              placeholder="Ex: Post Instagram v1"
              className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 ${
                titleError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-800 focus:border-zinc-600 focus:ring-zinc-600"
              }`}
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-400">{titleError}</p>
            )}
          </FormField>

          <FormField label="Notes / description" helpText="Contexte, instructions ou commentaires">
            <textarea
              value={deliverableNotes}
              onChange={(e) => setDeliverableNotes(e.target.value)}
              rows={3}
              placeholder="Decrivez le livrable, ajoutez des notes..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          <FormField label="Lien vers le fichier" helpText="URL Google Drive, Dropbox, etc.">
            <input
              type="text"
              value={deliverableFile}
              onChange={(e) => setDeliverableFile(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setSubmitModal(null)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!deliverableTitle || deliverableTitle.trim().length < 3 || submitDeliverable.isPending}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {submitDeliverable.isPending ? "Envoi..." : "Soumettre"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-emerald-500 px-4 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Livrable soumis avec succes</p>
            <p className="text-xs text-emerald-100">
              Votre travail est en attente de review QC.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
