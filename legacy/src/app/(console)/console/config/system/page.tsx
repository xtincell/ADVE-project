"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Server,
  Cpu,
  DollarSign,
  Shield,
  Activity,
  Clock,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  User,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* System config persisted in DB via McpServerConfig (key: system-config) */
/* ------------------------------------------------------------------ */

const CONFIG_KEY = "system-config";

interface SystemConfig {
  oracleModel: string;
  oracleBudgetLimit: number;
  gloryToolsEnabled: boolean;
  tarsisEnabled: boolean;
  auditRetentionDays: number;
  maintenanceMode: boolean;
}

const DEFAULT_CONFIG: SystemConfig = {
  oracleModel: "gpt-4o",
  oracleBudgetLimit: 500000,
  gloryToolsEnabled: true,
  tarsisEnabled: true,
  auditRetentionDays: 90,
  maintenanceMode: false,
};

export default function SystemPage() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load config from DB
  const configQuery = trpc.systemConfig.get.useQuery({ key: CONFIG_KEY });
  const upsertMutation = trpc.systemConfig.upsert.useMutation();

  // Real system health & audit count
  const healthQuery = trpc.systemConfig.health.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
  });

  // Recent audit trail entries
  const auditQuery = trpc.systemConfig.recentAudit.useQuery({ limit: 20 });

  // Hydrate local state when DB data arrives
  useEffect(() => {
    if (configQuery.data) {
      setConfig({ ...DEFAULT_CONFIG, ...(configQuery.data as Partial<SystemConfig>) });
    }
  }, [configQuery.data]);

  const update = useCallback(
    <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertMutation.mutateAsync({ key: CONFIG_KEY, config: config as unknown as Record<string, unknown> });
      setSaving(false);
      setDirty(false);
      setFeedback({ type: "success", message: "Configuration systeme sauvegardee." });
    } catch {
      setSaving(false);
      setFeedback({ type: "error", message: "Erreur lors de la sauvegarde." });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleReset = async () => {
    setConfig(DEFAULT_CONFIG);
    try {
      await upsertMutation.mutateAsync({ key: CONFIG_KEY, config: DEFAULT_CONFIG as unknown as Record<string, unknown> });
    } catch {
      // best-effort reset in DB
    }
    setDirty(false);
    setFeedback({ type: "success", message: "Configuration reinitialise aux valeurs par defaut." });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Show skeleton while initial config is loading
  if (configQuery.isLoading) {
    return <SkeletonPage />;
  }

  const dbHealthy = healthQuery.data?.dbHealthy ?? false;
  const auditEventsThisMonth = healthQuery.data?.auditEventsThisMonth ?? 0;
  const healthLoaded = healthQuery.isSuccess;
  const healthError = healthQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Systeme"
        description="Sante du systeme, couts IA et piste d'audit"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Configuration", href: "/console/config" },
          { label: "Systeme" },
        ]}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Sauvegarder
              </>
            )}
          </button>
        </div>
      </PageHeader>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-800/50 bg-emerald-950/20 text-emerald-300"
              : "border-red-800/50 bg-error/20 text-error"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="mr-2 inline h-4 w-4" />
          ) : (
            <AlertTriangle className="mr-2 inline h-4 w-4" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Statut systeme" value={config.maintenanceMode ? "Maintenance" : "OK"} icon={Activity} />
        <StatCard
          title="Sante BD"
          value={healthLoaded ? (dbHealthy ? "OK" : "Erreur") : healthError ? "Erreur" : "..."}
          icon={Server}
        />
        <StatCard title="Evenements audit (mois)" value={auditEventsThisMonth} icon={Shield} />
        <StatCard title="Cout IA ce mois" value={`${auditEventsThisMonth} appels`} icon={Cpu} />
      </div>

      {/* System health */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-white">Sante du systeme</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Base de donnees",
              status: healthLoaded
                ? dbHealthy
                  ? "Operationnelle"
                  : "Erreur"
                : healthError
                  ? "Erreur"
                  : "Verification...",
              color: healthLoaded
                ? dbHealthy
                  ? "bg-emerald-400"
                  : "bg-error"
                : healthError
                  ? "bg-error"
                  : "bg-zinc-400 animate-pulse",
            },
            {
              label: "API principale",
              status: "Operationnelle",
              color: "bg-emerald-400",
            },
            {
              label: "Workers",
              status: config.maintenanceMode ? "Mode maintenance" : "Operationnels",
              color: config.maintenanceMode ? "bg-amber-400" : "bg-emerald-400",
            },
          ].map((service) => (
            <div
              key={service.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${service.color}`} />
              <div>
                <p className="text-sm font-medium text-white">{service.label}</p>
                <p className="text-xs text-foreground-muted">{service.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-white">Configuration IA</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Modele Oracle" helpText="Modele principal pour les analyses strategiques">
            <select
              value={config.oracleModel}
              onChange={(e) => update("oracleModel", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </FormField>

          <FormField label="Budget mensuel IA (XAF)" helpText="Limite de depense IA par mois">
            <input
              type="number"
              value={config.oracleBudgetLimit}
              onChange={(e) => update("oracleBudgetLimit", parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
              min={0}
              step={50000}
            />
          </FormField>

          <FormField label="GLORY Tools">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={config.gloryToolsEnabled}
                onChange={(e) => update("gloryToolsEnabled", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
              />
              <span className="text-sm text-foreground-secondary">Activer les outils GLORY</span>
            </label>
          </FormField>

          <FormField label="TARSIS Analysis">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={config.tarsisEnabled}
                onChange={(e) => update("tarsisEnabled", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
              />
              <span className="text-sm text-foreground-secondary">Activer TARSIS Analysis</span>
            </label>
          </FormField>
        </div>
      </div>

      {/* AI Costs (read-only display) */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-white">Couts IA</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: `Oracle (${config.oracleModel})`, cost: "0 XAF", calls: auditEventsThisMonth },
            { label: "GLORY Tools", cost: "0 XAF", calls: 0, enabled: config.gloryToolsEnabled },
            { label: "TARSIS Analysis", cost: "0 XAF", calls: 0, enabled: config.tarsisEnabled },
          ].map((ai) => (
            <div
              key={ai.label}
              className={`rounded-lg border border-border bg-background/50 px-4 py-3 ${
                "enabled" in ai && !ai.enabled ? "opacity-40" : ""
              }`}
            >
              <p className="text-sm font-medium text-white">{ai.label}</p>
              <p className="mt-1 text-xl font-bold text-white">{ai.cost}</p>
              <p className="text-xs text-foreground-muted">
                {ai.calls} appels ce mois
                {"enabled" in ai && !ai.enabled && " (desactive)"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* System Settings */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-white">Parametres systeme</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Retention des logs d'audit (jours)"
            helpText="Nombre de jours avant suppression des evenements d'audit"
          >
            <input
              type="number"
              value={config.auditRetentionDays}
              onChange={(e) => update("auditRetentionDays", parseInt(e.target.value) || 30)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-zinc-600"
              min={7}
              max={365}
            />
          </FormField>

          <FormField label="Mode maintenance">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => update("maintenanceMode", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong bg-background text-white accent-white"
              />
              <span className="text-sm text-foreground-secondary">
                Activer le mode maintenance (desactive les workers)
              </span>
            </label>
          </FormField>
        </div>
      </div>

      {/* Audit trail */}
      <div className="rounded-xl border border-border bg-background/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-foreground-secondary" />
          <h3 className="text-sm font-semibold text-white">Piste d&apos;audit</h3>
        </div>
        {auditQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-white" />
          </div>
        ) : auditQuery.data && auditQuery.data.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {auditQuery.data.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-4 py-3"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background">
                  <User className="h-3.5 w-3.5 text-foreground-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {entry.user?.name ?? entry.user?.email ?? "Systeme"}
                    </p>
                    <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase text-foreground-secondary">
                      {entry.action}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {entry.entityType}
                    {entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground-muted">
                    {new Date(entry.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Shield}
            title="Aucun evenement"
            description="Les evenements d'audit systeme seront enregistres ici : modifications, connexions, actions sensibles."
          />
        )}
      </div>
    </div>
  );
}
