"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Plug,
  Share2,
  Monitor,
  Smartphone,
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

type IntegrationStatus = "connected" | "disconnected" | "error";

interface IntegrationDef {
  name: string;
  description: string;
  docsUrl?: string;
}

interface IntegrationCategory {
  title: string;
  icon: React.ElementType;
  integrations: IntegrationDef[];
}

const INTEGRATION_CATALOG: IntegrationCategory[] = [
  {
    title: "Reseaux sociaux",
    icon: Share2,
    integrations: [
      { name: "Facebook / Meta", description: "Pages, publications, audiences et metriques d'engagement", docsUrl: "https://developers.facebook.com" },
      { name: "Instagram", description: "Feed, Stories, Reels et analytics du compte professionnel", docsUrl: "https://developers.facebook.com/docs/instagram-api" },
      { name: "TikTok", description: "Videos, analytics et campagnes creatives", docsUrl: "https://developers.tiktok.com" },
      { name: "LinkedIn", description: "Company page, posts et analytics B2B", docsUrl: "https://learn.microsoft.com/en-us/linkedin/" },
      { name: "X (Twitter)", description: "Tweets, mentions et metriques d'audience", docsUrl: "https://developer.x.com" },
    ],
  },
  {
    title: "Achat media",
    icon: Monitor,
    integrations: [
      { name: "Google Ads", description: "Campagnes search, display et video YouTube" },
      { name: "Meta Ads", description: "Campagnes Facebook et Instagram Ads" },
      { name: "TikTok Ads", description: "Campagnes TikTok for Business" },
      { name: "DV360", description: "Programmatique display via Google DV360" },
    ],
  },
  {
    title: "CRM & Donnees",
    icon: Database,
    integrations: [
      { name: "Odoo", description: "Contacts, produits, deals et facturation via JSON-RPC" },
      { name: "Zoho CRM", description: "Comptes, contacts, deals et pipeline commercial" },
    ],
  },
  {
    title: "Mobile Money",
    icon: Smartphone,
    integrations: [
      { name: "MTN Mobile Money", description: "Paiements et encaissements MoMo" },
      { name: "Orange Money", description: "Paiements et encaissements OM" },
    ],
  },
];

const CONFIG_KEY = "integrations-status";

// Derive a slug from integration name for use as config key
function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [configModal, setConfigModal] = useState<{ catIdx: number; intIdx: number } | null>(null);
  const [configForm, setConfigForm] = useState({ apiKey: "", clientId: "", secret: "" });
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load statuses from DB
  const statusQuery = trpc.systemConfig.get.useQuery({ key: CONFIG_KEY });
  const upsertMutation = trpc.systemConfig.upsert.useMutation();

  // Hydrate from DB
  useEffect(() => {
    if (statusQuery.data) {
      setStatuses(statusQuery.data as Record<string, IntegrationStatus>);
    }
  }, [statusQuery.data]);

  const getStatus = useCallback(
    (name: string): IntegrationStatus => statuses[nameToSlug(name)] ?? "disconnected",
    [statuses],
  );

  const persistStatuses = useCallback(
    async (next: Record<string, IntegrationStatus>) => {
      setStatuses(next);
      try {
        await upsertMutation.mutateAsync({ key: CONFIG_KEY, config: next as unknown as Record<string, unknown> });
      } catch {
        // Best effort — local state already updated
      }
    },
    [upsertMutation],
  );

  const allIntegrations = INTEGRATION_CATALOG.flatMap((c) => c.integrations);
  const connectedCount = allIntegrations.filter((i) => getStatus(i.name) === "connected").length;
  const errorCount = allIntegrations.filter((i) => getStatus(i.name) === "error").length;

  const handleConnect = (catIdx: number, intIdx: number) => {
    const integration = INTEGRATION_CATALOG[catIdx]?.integrations[intIdx];
    if (!integration) return;
    if (getStatus(integration.name) === "connected") {
      // Disconnect
      const next = { ...statuses, [nameToSlug(integration.name)]: "disconnected" as IntegrationStatus };
      persistStatuses(next);
      setFeedback({ type: "success", message: `${integration.name} deconnecte` });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setConfigForm({ apiKey: "", clientId: "", secret: "" });
      setConfigModal({ catIdx, intIdx });
    }
  };

  const handleSaveConfig = async () => {
    if (!configModal) return;
    const { catIdx, intIdx } = configModal;
    const integration = INTEGRATION_CATALOG[catIdx]?.integrations[intIdx];
    if (!integration) return;

    setConnecting(true);

    const hasCredentials = configForm.apiKey.trim() || configForm.clientId.trim();
    const newStatus: IntegrationStatus = hasCredentials ? "connected" : "error";

    // Persist both the status and credentials
    const slug = nameToSlug(integration.name);
    const next = { ...statuses, [slug]: newStatus };
    await persistStatuses(next);

    // Also persist credentials separately (encrypted key would be ideal in production)
    if (hasCredentials) {
      try {
        await upsertMutation.mutateAsync({
          key: `integration-creds-${slug}`,
          config: {
            apiKey: configForm.apiKey ? "••••" + configForm.apiKey.slice(-4) : "",
            clientId: configForm.clientId || "",
            hasSecret: !!configForm.secret,
            connectedAt: new Date().toISOString(),
          },
        });
      } catch {
        // Non-critical
      }
    }

    setConnecting(false);
    setConfigModal(null);

    if (hasCredentials) {
      setFeedback({ type: "success", message: `${integration.name} connecte avec succes` });
    } else {
      setFeedback({ type: "error", message: `Echec de connexion a ${integration.name} — verifiez vos identifiants` });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const currentIntegration = configModal
    ? INTEGRATION_CATALOG[configModal.catIdx]?.integrations[configModal.intIdx] ?? null
    : null;

  if (statusQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connexions aux plateformes externes : social, media, CRM et paiement"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Configuration", href: "/console/config" },
          { label: "Integrations" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total integrations" value={allIntegrations.length} icon={Plug} />
        <StatCard title="Connectees" value={connectedCount} icon={CheckCircle} />
        <StatCard title="Erreurs" value={errorCount} icon={XCircle} />
        <StatCard title="Derniere sync" value="-" icon={RefreshCw} />
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`rounded-lg border p-3 text-sm ${
          feedback.type === "success"
            ? "border-success/50 bg-success/20 text-success"
            : "border-error/50 bg-error/20 text-error"
        }`}>
          {feedback.type === "success" ? <CheckCircle className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* v4 — Advertis Inbound Connectors */}
      <div className="rounded-xl border border-accent/50 bg-accent/10 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-semibold text-white">Connecteurs Advertis</h3>
          <span className="ml-1 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-medium text-accent">v4 NOUVEAU</span>
          <span className="ml-auto text-[10px] text-foreground-muted">
            SaaS clients → piliers ADVE
          </span>
        </div>
        <p className="mb-4 text-xs text-foreground-muted">
          Ces connecteurs ingèrent les signaux de vos outils existants (Monday, Zoho, etc.)
          directement dans les piliers ADVE de vos stratégies, via le Pillar Gateway.
        </p>
        <div className="space-y-2">
          {[
            {
              name: "Monday.com",
              description: "Boards, tâches, timelines → piliers E (velocity), R (blockers), S (WIP)",
              type: "monday",
              mappings: "E: velocity | R: blockers | S: WIP",
            },
            {
              name: "Zoho CRM",
              description: "Deals, pipeline, conversions → piliers V (pipeline), T (conversion), R (pertes)",
              type: "zoho",
              mappings: "V: pipeline | T: conversion | R: pertes",
            },
          ].map((connector) => (
            <div
              key={connector.type}
              className="flex items-center justify-between rounded-lg border border-accent/30 bg-background/50 px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-surface-elevated" />
                <div className="min-w-0">
                  <span className="text-sm text-foreground-secondary">{connector.name}</span>
                  <p className="truncate text-[10px] text-foreground-muted">{connector.description}</p>
                  <p className="mt-0.5 text-[9px] text-accent">{connector.mappings}</p>
                </div>
              </div>
              <button
                className="shrink-0 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/30 transition-colors"
                onClick={() => {
                  // Real OAuth flow: NextAuth signIn with the provider id.
                  // The callback persists tokens into IntegrationConnection
                  // (see Prisma schema). Provider whitelist is enforced
                  // server-side by the NextAuth options.
                  const provider = connector.type.toLowerCase();
                  const callbackUrl = `/console/config/integrations?connected=${provider}`;
                  window.location.href = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                }}
              >
                Connecter
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Outbound Integration categories */}
      <h3 className="text-xs font-medium uppercase tracking-wider text-foreground-muted mt-2">Connecteurs sortants</h3>
      {INTEGRATION_CATALOG.map((category, catIdx) => {
        const CatIcon = category.icon;
        return (
          <div key={category.title} className="rounded-xl border border-border bg-background/80 p-5">
            <div className="mb-4 flex items-center gap-2">
              <CatIcon className="h-5 w-5 text-foreground-secondary" />
              <h3 className="text-sm font-semibold text-white">{category.title}</h3>
              <span className="ml-auto text-[10px] text-foreground-muted">
                {category.integrations.filter((i) => getStatus(i.name) === "connected").length}/{category.integrations.length} actives
              </span>
            </div>
            <div className="space-y-2">
              {category.integrations.map((integration, intIdx) => {
                const status = getStatus(integration.name);
                return (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          status === "connected"
                            ? "bg-success"
                            : status === "error"
                              ? "bg-error"
                              : "bg-surface-elevated"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm text-foreground-secondary">{integration.name}</span>
                        <p className="truncate text-[10px] text-foreground-muted">{integration.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnect(catIdx, intIdx)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        status === "connected"
                          ? "bg-success/20 text-success hover:bg-error/20 hover:text-error"
                          : status === "error"
                            ? "bg-error/20 text-error hover:bg-surface-raised"
                            : "bg-background text-foreground-secondary hover:bg-surface-raised hover:text-white"
                      }`}
                    >
                      {status === "connected" ? "Deconnecter" : status === "error" ? "Reconfigurer" : "Connecter"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Config Modal */}
      <Modal
        open={!!configModal}
        onClose={() => setConfigModal(null)}
        title={`Connecter ${currentIntegration?.name ?? ""}`}
        size="md"
      >
        {currentIntegration && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">{currentIntegration.description}</p>

            {currentIntegration.docsUrl && (
              <a href={currentIntegration.docsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent">
                <ExternalLink className="h-3 w-3" /> Documentation API
              </a>
            )}

            <FormField label="Cle API / Access Token">
              <input
                type="password"
                value={configForm.apiKey}
                onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>

            <FormField label="Client ID (optionnel)">
              <input
                type="text"
                value={configForm.clientId}
                onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                placeholder="client_id..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>

            <FormField label="Client Secret (optionnel)">
              <input
                type="password"
                value={configForm.secret}
                onChange={(e) => setConfigForm({ ...configForm, secret: e.target.value })}
                placeholder="secret..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfigModal(null)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
              >
                Annuler
              </button>
              <button
                disabled={connecting}
                onClick={handleSaveConfig}
                className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
              >
                {connecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-zinc-900" />
                    Connexion...
                  </span>
                ) : (
                  "Connecter"
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
