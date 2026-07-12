"use client";

/**
 * Boîte de réception — interactions adressées à la marque (ADR-0133,
 * doctrine « rival Sprout »). Commentaires FB/IG v1 : lire, répondre au nom
 * de la marque, classer. États honnêtes : rien de connecté → CTA Connexions ;
 * scope de réponse manquant → « Reconnecter le réseau » ; jamais un zéro
 * silencieux.
 */
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/shared/notification-toast";
import { Button, Textarea } from "@/components/primitives";
import { Inbox, RefreshCw, Send, Archive, ExternalLink, MessageCircle, ArrowRight } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  YOUTUBE: "YouTube", TWITTER: "X", LINKEDIN: "LinkedIn",
};

const STATUS_TABS = [
  { key: "OPEN", label: "À traiter" },
  { key: "REPLIED", label: "Répondues" },
  { key: "DISMISSED", label: "Classées" },
] as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function InboxPage() {
  const strategyId = useCurrentStrategyId();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"OPEN" | "REPLIED" | "DISMISSED">("OPEN");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const inbox = trpc.social.getInbox.useQuery(
    { strategyId: strategyId ?? "", status },
    { enabled: !!strategyId },
  );
  const hub = trpc.social.getBrandSocialHub.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const syncMutation = trpc.social.syncInbox.useMutation({
    onSuccess: (r) => {
      void utils.social.getInbox.invalidate();
      if (r.state === "LIVE") {
        const nb = r.data.reduce((n, row) => n + row.newItems, 0);
        toast.success(nb > 0 ? `${nb} nouvelle(s) interaction(s) collectée(s).` : "À jour — rien de nouveau.");
      } else {
        toast.info("Collecte partielle — vérifiez vos connexions réseaux.");
      }
    },
    onError: (e) => toast.error(e.message || "Collecte impossible."),
  });

  const replyMutation = trpc.social.replyToComment.useMutation({
    onSuccess: () => {
      setReplyFor(null);
      setReplyText("");
      void utils.social.getInbox.invalidate();
      toast.success("Réponse publiée au nom de votre marque.");
    },
    onError: (e) => {
      toast.error(
        e.message.includes("SCOPE_MISSING")
          ? "Cette connexion date d'avant les capacités de réponse — reconnectez le réseau depuis Mon compte → Connexions."
          : e.message || "Réponse impossible.",
      );
    },
  });

  const dismissMutation = trpc.social.dismissInboxItem.useMutation({
    onSuccess: () => void utils.social.getInbox.invalidate(),
    onError: (e) => toast.error(e.message || "Classement impossible."),
  });

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState icon={Inbox} title="Sélectionnez une marque" description="Choisissez une marque pour ouvrir sa boîte de réception." />
      </div>
    );
  }

  const connected = (hub.data?.rows ?? []).filter((r) => r.state === "CONNECTED");
  const counts = inbox.data?.counts ?? {};
  const items = inbox.data?.items ?? [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <PageHeader
        title="Boîte de réception"
        description="Les commentaires adressés à votre marque sur ses réseaux connectés — répondez sans quitter votre cockpit."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mon activité" },
          { label: "Boîte de réception" },
        ]}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncMutation.mutate({ strategyId })}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={syncMutation.isPending ? "animate-spin" : undefined} />
          {syncMutation.isPending ? "Collecte…" : "Actualiser"}
        </Button>
      </PageHeader>

      {connected.length === 0 && !hub.isLoading ? (
        <div className="ck-card">
          <EmptyState
            icon={MessageCircle}
            title="Aucun réseau connecté"
            description="Connectez Facebook ou Instagram pour recevoir ici les commentaires de votre communauté."
          />
          <div className="flex justify-center pb-4">
            <Link className="ck-dash-switch" href="/cockpit/settings/connections">
              Connecter mes réseaux <ArrowRight />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="ck-inbox__tabs" role="tablist" aria-label="Filtrer les interactions">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={status === t.key}
                className="ck-inbox__tab"
                data-active={status === t.key || undefined}
                onClick={() => setStatus(t.key)}
              >
                {t.label}
                {counts[t.key] != null ? <span className="ck-inbox__tab-count">{counts[t.key]}</span> : null}
              </button>
            ))}
          </div>

          {inbox.isLoading ? (
            <p className="ck-ops__note">Chargement…</p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={status === "OPEN" ? "Rien à traiter" : "Aucune interaction ici"}
              description={
                status === "OPEN"
                  ? "Aucun commentaire en attente. La collecte tourne chaque jour — ou lancez « Actualiser »."
                  : "Les interactions traitées apparaîtront ici."
              }
            />
          ) : (
            <div className="ck-ops__list">
              {items.map((item) => (
                <div key={item.id} className="ck-card ck-inbox__item">
                  <div className="ck-inbox__head">
                    <span className="ck-ops__row-date">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                    <span className="ck-inbox__author">
                      {item.authorName ?? item.authorHandle ?? "Utilisateur"}
                    </span>
                    <span className="ck-inbox__when">{fmtDate(item.publishedAt)}</span>
                    {item.permalinkUrl ? (
                      <a href={item.permalinkUrl} target="_blank" rel="noreferrer" className="ck-inbox__ext" aria-label="Ouvrir sur la plateforme">
                        <ExternalLink />
                      </a>
                    ) : null}
                  </div>
                  <p className="ck-inbox__text">{item.text ?? "(sans texte)"}</p>

                  {item.status === "REPLIED" && item.replyText ? (
                    <p className="ck-inbox__reply-done">↳ Votre réponse : {item.replyText}</p>
                  ) : null}

                  {status === "OPEN" ? (
                    <div className="ck-inbox__actions">
                      {replyFor === item.id ? (
                        <>
                          <Textarea
                            rows={2}
                            maxLength={2000}
                            placeholder="Votre réponse publique, au nom de la marque…"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                          />
                          <div className="ck-inbox__reply-row">
                            <Button
                              size="sm"
                              disabled={!replyText.trim() || replyMutation.isPending}
                              onClick={() => replyMutation.mutate({ strategyId, itemId: item.id, text: replyText.trim() })}
                            >
                              <Send /> {replyMutation.isPending ? "Envoi…" : "Répondre"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setReplyFor(null); setReplyText(""); }}>
                              Annuler
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="ck-inbox__reply-row">
                          <Button variant="ghost" size="sm" onClick={() => { setReplyFor(item.id); setReplyText(""); }}>
                            <Send /> Répondre
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissMutation.mutate({ strategyId, itemId: item.id })}
                            disabled={dismissMutation.isPending}
                          >
                            <Archive /> Classer
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
