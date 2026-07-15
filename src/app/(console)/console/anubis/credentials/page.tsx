"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2, Key, Plus, MinusCircle } from "lucide-react";

const KNOWN_CONNECTOR_TYPES = [
  { type: "meta-ads", label: "Meta Ads (Facebook + Instagram)", fields: ["accessToken", "businessAccountId", "adAccountId"] },
  { type: "google-ads", label: "Google Ads", fields: ["developerToken", "customerId", "refreshToken"] },
  { type: "x-ads", label: "X Ads (Twitter)", fields: ["apiKey", "apiSecret", "accountId"] },
  { type: "tiktok-ads", label: "TikTok Ads", fields: ["advertiserId", "accessToken"] },
  { type: "mailgun", label: "Mailgun (Transactional Email)", fields: ["apiKey", "domain", "region"] },
  { type: "twilio", label: "Twilio (SMS)", fields: ["accountSid", "authToken", "fromNumber"] },
  // Phase 23 (ADR-0079) — read-only signal connectors for the pivot mechanics.
  // Distinct shape from broadcast providers above : these feed culture.* +
  // superfan.* sub-clusters with sectoral / cohort signal via ConnectorResult<T>.
  { type: "tarsis-monitoring", label: "Tarsis monitoring API (sectoral signal)", fields: ["apiKey", "endpointOverride", "accountScope"] },
  { type: "crm-provider", label: "CRM provider (cohort retention)", fields: ["apiKey", "endpointOverride", "accountId"] },
  // Apify — scraping des relevés d'audience publics (followers) pour le scorer /
  // l'empreinte. Vault-first (opérateur > env `APIFY_TOKEN`), lu par
  // `resolveApifyCredentials`. Même connectorType que la page social-audit.
  { type: "APIFY_SOCIAL", label: "Apify (scraping followers publics)", fields: ["apiKey"] },
] as const;

function StatusIcon({ status }: { status: string }) {
  if (status === "ACTIVE") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "ERROR") return <XCircle className="h-4 w-4 text-error" />;
  return <AlertCircle className="h-4 w-4 text-warning" />;
}

export default function AnubisCredentialsPage() {
  const utils = trpc.useUtils();
  const { data: credentials, isLoading } = trpc.anubis.listCredentials.useQuery();
  const { data: systemKeys } = trpc.anubis.systemKeyStatus.useQuery();
  const register = trpc.anubis.registerCredential.useMutation({
    onSuccess: () => utils.anubis.listCredentials.invalidate(),
  });
  const test = trpc.anubis.testChannel.useMutation({
    onSuccess: () => utils.anubis.listCredentials.invalidate(),
  });
  const revoke = trpc.anubis.revokeCredential.useMutation({
    onSuccess: () => utils.anubis.listCredentials.invalidate(),
  });

  const [formType, setFormType] = useState<string>(KNOWN_CONNECTOR_TYPES[0].type);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testFeedback, setTestFeedback] = useState<Record<string, { success: boolean; reason?: string }>>({});

  const selectedTemplate = KNOWN_CONNECTOR_TYPES.find((t) => t.type === formType);

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials Vault"
        description="Configure les API keys et OAuth tokens pour les connectors externes (ad networks, email, SMS). Pattern ADR-0021. Les credentials sont stockés chiffrés au repos et ne sortent jamais du serveur."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Anubis", href: "/console/anubis" },
          { label: "Credentials" },
        ]}
      />

      {/* Clés système (env) — lecture seule, booléens only (ADR-0075) */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Clés système (variables d&apos;environnement)</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Clés SYSTEM-WIDE posées dans Coolify (jamais en base — ADR-0075). On affiche
            seulement configuré / manquant, jamais la valeur. Différent du Credentials Vault
            ci-dessous (clés par-opérateur).
          </p>
        </div>
        <div className="divide-y divide-border">
          {(systemKeys ?? []).map((grp) => (
            <div key={grp.group} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{grp.group}</h3>
                <span className="text-2xs text-foreground-muted">
                  {grp.keys.filter((k) => k.configured).length}/{grp.keys.length} configuré(s)
                </span>
              </div>
              <p className="mt-1 text-2xs text-foreground-muted">{grp.hint}</p>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {grp.keys.map((k) => (
                  <div key={k.key} className="flex items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-1.5">
                    {k.configured ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <MinusCircle className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{k.label}</span>
                    <code className="text-2xs text-foreground-muted">{k.key}</code>
                    <span className={`text-2xs font-medium ${k.configured ? "text-success" : "text-foreground-muted"}`}>
                      {k.configured ? "posée" : "manquante"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste des credentials existantes */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Connectors enregistrés</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            {credentials?.length ?? 0} connector{(credentials?.length ?? 0) > 1 ? "s" : ""} —{" "}
            {credentials?.filter((c) => c.status === "ACTIVE").length ?? 0} actif
            {(credentials?.filter((c) => c.status === "ACTIVE").length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-border">
          {(credentials ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">
              Aucun connector configuré. Utilise le formulaire ci-dessous pour en ajouter un.
            </div>
          )}
          {credentials?.map((cred) => (
            <div key={cred.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-bg-subtle p-2">
                  <Key className="h-4 w-4 text-foreground-muted" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{cred.connectorType}</span>
                    <StatusIcon status={cred.status} />
                    <span className="text-xs text-foreground-muted">{cred.status}</span>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {cred.lastSyncAt
                      ? `Last sync: ${new Date(cred.lastSyncAt).toLocaleString()}`
                      : "Never tested"}
                    {testFeedback[cred.connectorType]?.reason && (
                      <span className="ml-2 text-error">— {testFeedback[cred.connectorType]?.reason}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    test
                      .mutateAsync({ connectorType: cred.connectorType })
                      .then((r) =>
                        setTestFeedback((prev) => ({
                          ...prev,
                          [cred.connectorType]: { success: r.success, reason: r.reason },
                        })),
                      )
                      .catch(() => undefined);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover"
                  disabled={test.isPending}
                >
                  <RefreshCw className="h-3 w-3" />
                  Test
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Revoke ${cred.connectorType} ?`)) {
                      revoke.mutate({ connectorType: cred.connectorType });
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-error hover:bg-error-subtle"
                  disabled={revoke.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Ajouter un connector</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          Select le provider, fournis les credentials. Le connector sera créé en status INACTIVE — clique sur "Test" sur
          la liste pour le passer ACTIVE.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground-muted">Provider</label>
            <select
              value={formType}
              onChange={(e) => {
                setFormType(e.target.value);
                setFormValues({});
              }}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              {KNOWN_CONNECTOR_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate?.fields.map((field) => (
            <div key={field}>
              <label className="text-xs font-medium text-foreground-muted">{field}</label>
              <input
                type={field.toLowerCase().includes("token") || field.toLowerCase().includes("secret") || field.toLowerCase().includes("key") ? "password" : "text"}
                value={formValues[field] ?? ""}
                onChange={(e) => setFormValues({ ...formValues, [field]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
                placeholder={`Enter ${field}`}
              />
            </div>
          ))}

          <button
            onClick={() => {
              register.mutate({
                connectorType: formType,
                config: formValues,
              });
              setFormValues({});
            }}
            disabled={register.isPending || !selectedTemplate?.fields.every((f) => formValues[f])}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-bg-default disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Register credential
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-foreground-muted">
        <p>
          <strong className="text-foreground">Sécurité</strong> — les credentials sont stockés dans `ExternalConnector.config`
          (Json). Le router ne retourne JAMAIS `config` dans `listCredentials`. Décryption côté server uniquement, en
          mémoire seule. Cf.{" "}
          <a target="_blank" rel="noreferrer" href="https://github.com/xtincell/ADVE-project/blob/main/docs/governance/adr/0021-external-credentials-vault.md" className="underline hover:text-foreground">
            ADR-0021
          </a>
          .
        </p>
      </div>
    </div>
  );
}
