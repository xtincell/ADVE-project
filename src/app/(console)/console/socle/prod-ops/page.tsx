"use client";

/**
 * /console/socle/prod-ops — Opérations de production (cycle en 3 temps).
 *
 * Surface opérateur du skill `nefer-ops` : INJECTION (registre de seeds +
 * commande exacte — l'exécution prod reste un geste opérateur) · DÉPLOIEMENT
 * (déclenche Coolify + version en ligne) · ACTION SUR DÉPLOYÉ (crons gardés +
 * finaliseur). Aucun secret n'est exposé : la readiness est booléenne, les
 * absences de credentials sont affichées honnêtement (DEFERRED).
 */
import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/shared/notification-toast";
import {
  Rocket,
  Database,
  PlayCircle,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Terminal,
} from "lucide-react";

function ReadinessChip({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
        ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label} — {ok ? "configuré" : "à renseigner"}
    </span>
  );
}

/** Bloc de sortie brut (réponse d'un endpoint) — mono, scrollable, honnête. */
function ResultBlock({ result }: { result: unknown }) {
  if (result == null) return null;
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-2xs text-foreground-secondary">
      {text}
    </pre>
  );
}

export default function ProdOpsPage() {
  const toast = useToast();
  const status = trpc.prodOps.status.useQuery();

  // ── Version en ligne (poll même-origine : suit le swap de conteneur Coolify) ──
  const [liveVersion, setLiveVersion] = useState<string | null>(null);
  const refreshVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      const json = (await res.json()) as { version?: string };
      setLiveVersion(json.version ?? null);
    } catch {
      setLiveVersion(null);
    }
  }, []);
  useEffect(() => {
    void refreshVersion();
    const id = setInterval(() => void refreshVersion(), 20_000);
    return () => clearInterval(id);
  }, [refreshVersion]);

  // ── TEMPS 1 — copier une commande de seed ──
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (cmd: string) => {
    void navigator.clipboard?.writeText(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1500);
  };

  // ── TEMPS 2 — déploiement ──
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  const [deployResult, setDeployResult] = useState<unknown>(null);
  const deploy = trpc.prodOps.triggerDeploy.useMutation({
    onSuccess: (r) => {
      setDeployResult(r);
      if (r.status === "QUEUED") {
        toast.success("Déploiement mis en file — la version en ligne avancera au swap.");
        void refreshVersion();
      } else if (r.status === "DEFERRED_AWAITING_CREDENTIALS") {
        toast.error("Credentials Coolify absents — voir le détail.");
      } else {
        toast.error("Déploiement refusé — voir le détail.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // ── TEMPS 3 — crons + finaliseur ──
  const [cronResult, setCronResult] = useState<Record<string, unknown>>({});
  const cron = trpc.prodOps.triggerCron.useMutation({
    onSuccess: (r, vars) => {
      setCronResult((prev) => ({ ...prev, [vars.key]: r }));
      if (r.status === "OK") toast.success("Cron exécuté.");
      else if (r.status === "DEFERRED_AWAITING_CREDENTIALS") toast.error("CRON_SECRET absent.");
      else toast.error("Cron en erreur — voir le détail.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [loginBrand, setLoginBrand] = useState("");
  const [postBrand, setPostBrand] = useState("");
  const [finishResult, setFinishResult] = useState<unknown>(null);
  const prodFinish = trpc.prodOps.triggerProdFinish.useMutation({
    onSuccess: (r) => {
      setFinishResult(r);
      if (r.status === "OK") toast.success("Finaliseur exécuté — voir le rapport.");
      else if (r.status === "DEFERRED_AWAITING_CREDENTIALS") toast.error("CRON_SECRET absent.");
      else toast.error("Finaliseur en erreur — voir le détail.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (status.isLoading) return <SkeletonPage />;
  const data = status.data;
  if (!data) return null;

  const instanceVersion = data.instanceVersion;
  const versionMatch = liveVersion != null && liveVersion === instanceVersion;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Opérations de production"
        description="Le cycle en 3 temps : injecter la donnée, déployer le code, agir sur l'instance en ligne. Aucun secret n'est exposé — les credentials manquants sont signalés."
      />

      <div className="flex flex-wrap items-center gap-2">
        <ReadinessChip ok={data.readiness.coolify.configured} label="Coolify" />
        <ReadinessChip ok={data.readiness.cron.configured} label="Endpoints gardés (CRON_SECRET)" />
        {data.readiness.coolify.endpointHost ? (
          <span className="font-mono text-2xs text-foreground-muted">
            {data.readiness.coolify.endpointHost}
          </span>
        ) : null}
      </div>

      {/* ── TEMPS 1 — INJECTION ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-foreground">TEMPS 1 — Injection</h2>
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          La donnée entre via un seed idempotent. L&apos;exécution contre la base prod reste un geste
          opérateur — copiez la commande et lancez-la contre la base Coolify (aucun shell-out depuis
          cette page).
        </p>
        <div className="mt-4 space-y-2">
          {data.seeds.map((s) => (
            <div
              key={s.key}
              className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <code className="font-mono text-xs text-foreground">{s.command}</code>
                <p className="mt-0.5 text-2xs text-foreground-muted">{s.creates}</p>
              </div>
              <button
                onClick={() => copy(s.command)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-secondary"
              >
                {copied === s.command ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── TEMPS 2 — DÉPLOIEMENT ───────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-foreground">TEMPS 2 — Déploiement</h2>
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          Le code mergé sur main ne bascule pas seul. Déclenchez le build Coolify, puis suivez la
          version servie en ligne (elle avance au swap de conteneur).
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            disabled={deploy.isPending}
            onClick={() => setConfirmDeploy(true)}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Rocket className="h-4 w-4" />
            {deploy.isPending ? "Déclenchement…" : "Déclencher le déploiement"}
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground-muted">Cette instance :</span>
            <span className="font-mono font-semibold text-foreground">v{instanceVersion}</span>
            <span className="text-foreground-muted">· en ligne :</span>
            <span
              className={`font-mono font-semibold ${versionMatch ? "text-success" : "text-warning"}`}
            >
              {liveVersion ? `v${liveVersion}` : "…"}
            </span>
            <button
              onClick={() => void refreshVersion()}
              aria-label="Revérifier la version en ligne"
              className="rounded-md border border-border p-1 text-foreground-secondary transition-colors hover:bg-secondary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <ResultBlock result={deployResult} />
      </div>

      {/* ── TEMPS 3 — ACTION SUR DÉPLOYÉ ────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-foreground">TEMPS 3 — Action sur déployé</h2>
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          Agir sur l&apos;instance en ligne via les endpoints gardés (Bearer CRON_SECRET, self-fetch
          local). Sans secret, l&apos;action est différée honnêtement.
        </p>

        {/* Crons */}
        <div className="mt-4 space-y-2">
          {data.crons.map((c) => (
            <div key={c.key} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="mt-0.5 text-2xs text-foreground-muted">{c.note}</p>
                </div>
                <button
                  disabled={cron.isPending}
                  onClick={() => cron.mutate({ key: c.key })}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" /> Déclencher
                </button>
              </div>
              <ResultBlock result={cronResult[c.key]} />
            </div>
          ))}
        </div>

        {/* Finaliseur prod */}
        <div className="mt-4 rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            <p className="text-sm font-medium text-foreground">Finaliseur d&apos;installation</p>
          </div>
          <p className="mt-0.5 text-2xs text-foreground-muted">
            Crée un login de marque (idempotent) et planifie un post texte via l&apos;Intent gouverné.
            Skip honnête si la page n&apos;est pas connectée.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-2xs text-foreground-muted">
              Marque du login
              <input
                value={loginBrand}
                onChange={(e) => setLoginBrand(e.target.value)}
                placeholder="motion19"
                className="w-40 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-2xs text-foreground-muted">
              Marque du post
              <input
                value={postBrand}
                onChange={(e) => setPostBrand(e.target.value)}
                placeholder="xtincell"
                className="w-40 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground"
              />
            </label>
            <button
              disabled={prodFinish.isPending}
              onClick={() =>
                prodFinish.mutate({
                  loginBrand: loginBrand.trim() || undefined,
                  postBrand: postBrand.trim() || undefined,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              {prodFinish.isPending ? "Exécution…" : "Finaliser"}
            </button>
          </div>
          <ResultBlock result={finishResult} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeploy}
        onClose={() => setConfirmDeploy(false)}
        onConfirm={() => deploy.mutate()}
        title="Déclencher un déploiement ?"
        message="Coolify va rebuild et redéployer l'instance de production. L'opération est sans danger mais visible en ligne."
        confirmLabel="Déployer"
        variant="warning"
      />
    </section>
  );
}
