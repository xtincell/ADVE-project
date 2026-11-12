"use client";
import { useState } from "react";
import { RefreshCw, Download, Share2, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/primitives/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { GuidelinesDocumentView } from "@/components/brand/guidelines-document";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";

export default function GuidelinesPage() {
  const strategyId = useCurrentStrategyId();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.guidelines.get.useQuery({ strategyId: strategyId! }, { enabled: !!strategyId });
  const share = trpc.guidelines.shareLink.useMutation({ onSuccess: (data) => setShareUrl(data.shareUrl) });

  const download = async (format: "html" | "pdf") => {
    if (!strategyId) return;
    setExporting(true); setFeedback(null);
    try {
      const html = await utils.client.guidelines.export.query({ strategyId, format });
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url;
      link.download = format === "pdf" ? "guidelines-a-imprimer.html" : "guidelines-marque.html";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setFeedback(format === "pdf" ? "Document imprimable téléchargé. Ouvrez-le puis choisissez Imprimer ou Enregistrer en PDF." : "Document HTML téléchargé. Les textes des sources restent consultables dans le dossier.");
    } catch (error) {
      setFeedback(`Export impossible : ${error instanceof Error ? error.message : "réessayez la lecture du dossier."}`);
    } finally { setExporting(false); }
  };
  if (!strategyId) return <SkeletonPage />;
  return <div className="min-w-0 space-y-6">
    <PageHeader title="Guidelines de marque" description="L’identité conservée, ses états et ses documents de référence." breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Marque" }, { label: "Guidelines" }]} />
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className="h-4 w-4" />Actualiser</Button>
      <Button variant="outline" onClick={() => void download("html")} disabled={!query.data || exporting}><Download className="h-4 w-4" />Exporter HTML</Button>
      <Button variant="outline" onClick={() => void download("pdf")} disabled={!query.data || exporting}><Download className="h-4 w-4" />Version imprimable</Button>
      <Button variant="outline" onClick={() => setShowShareConfirm(true)} disabled={!query.data || share.isPending}><Share2 className="h-4 w-4" />Partager</Button>
    </div>
    {feedback && <p role="status" className="break-words text-sm text-foreground-secondary">{feedback}</p>}
    {share.error && <p role="alert" className="text-sm text-error">{share.error.message}</p>}
    {shareUrl && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4 text-sm"><code className="min-w-0 break-all">{shareUrl}</code><Button variant="outline" size="sm" onClick={() => {
      void navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).href).then(() => setFeedback("Lien copié."), () => setFeedback("Copie impossible : sélectionnez le lien affiché."));
    }}><Copy className="h-4 w-4" />Copier</Button><p className="w-full text-xs text-foreground-secondary">Toute personne disposant du lien pourra lire l’état courant des guidelines et les noms de leurs références. Le texte des sources reste dans le dossier.</p></div>}
    {query.isLoading && <SkeletonPage />}
    {query.error && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{query.error.message}</p>}
    {query.data && !query.error && <GuidelinesDocumentView document={query.data} />}
    <ConfirmDialog open={showShareConfirm} onClose={() => setShowShareConfirm(false)} onConfirm={() => {
      setShowShareConfirm(false); share.mutate({ strategyId });
    }} title="Partager les guidelines ?" message="Le lien donnera accès à l’identité, aux chartes conservées et aux noms des documents de référence dans leur état courant. Le texte des sources n’est pas partagé. Aucun document n’est modifié." confirmLabel="Créer le lien" variant="warning" />
  </div>;
}
