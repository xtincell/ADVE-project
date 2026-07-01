"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { BarChart2, Radio, Wifi, WifiOff, PlusCircle, RefreshCw, Check, AlertCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "manual" | "official" | "third-party";

const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER", "YOUTUBE"] as const;
type Platform = (typeof PLATFORMS)[number];

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  MANUAL: { label: "Manuel", cls: "bg-amber-100 text-amber-800" },
  OFFICIAL_API: { label: "API officielle", cls: "bg-green-100 text-green-800" },
  APIFY: { label: "Apify", cls: "bg-blue-100 text-blue-800" },
  CONNECTOR: { label: "Connecteur", cls: "bg-purple-100 text-purple-800" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const badge = SOURCE_BADGE[source] ?? { label: source, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

function ConnectorStatus({ status, label }: { status: string | null; label: string }) {
  if (!status) {
    return (
      <span className="flex items-center gap-1 text-sm text-gray-400">
        <WifiOff size={14} /> {label} — non configuré
      </span>
    );
  }
  const ok = status === "ACTIVE";
  return (
    <span className={`flex items-center gap-1 text-sm ${ok ? "text-green-600" : "text-red-500"}`}>
      {ok ? <Wifi size={14} /> : <AlertCircle size={14} />}
      {label} — {ok ? "actif" : status}
    </span>
  );
}

// ── Manual tab ────────────────────────────────────────────────────────────────

function ManualTab({ strategyId }: { strategyId: string | null }) {
  const utils = trpc.useUtils();
  const record = trpc.social.recordFollowerSnapshot.useMutation({
    onSuccess: () => {
      void utils.social.followerTrends.invalidate();
      setForm({ platform: "INSTAGRAM", handle: "", followerCount: "" });
    },
  });

  const [form, setForm] = useState<{ platform: Platform; handle: string; followerCount: string }>({
    platform: "INSTAGRAM",
    handle: "",
    followerCount: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(form.followerCount, 10);
    if (!form.handle || isNaN(count)) return;
    record.mutate({
      strategyId,
      platform: form.platform,
      handle: form.handle,
      followerCount: count,
      source: "MANUAL",
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Saisie manuelle — idéal pour une collecte ponctuelle ou avant d&apos;avoir un connecteur configuré.
        Disponible <strong>immédiatement</strong>, aucune configuration requise.
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-lg">
        <h3 className="font-semibold text-gray-800">Enregistrer un snapshot</h3>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Plateforme</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
            >
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Handle (sans @)</label>
            <input
              type="text"
              placeholder="spawt.ci"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={form.handle}
              onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre d&apos;abonnés</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={form.followerCount}
            onChange={(e) => setForm((f) => ({ ...f, followerCount: e.target.value }))}
          />
        </div>

        <button
          type="submit"
          disabled={record.isPending || !form.handle || !form.followerCount}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium disabled:opacity-40"
        >
          {record.isPending ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
          Enregistrer
        </button>

        {record.isSuccess && (
          <p className="flex items-center gap-1 text-sm text-green-600">
            <Check size={14} /> Snapshot enregistré.
          </p>
        )}
      </form>
    </div>
  );
}

// ── Official API tab ──────────────────────────────────────────────────────────

function OfficialApiTab({ strategyId, metaConnector }: {
  strategyId: string | null;
  metaConnector: { id: string; status: string } | null;
}) {
  const utils = trpc.useUtils();
  const upsert = trpc.social.upsertSocialConnector.useMutation({
    onSuccess: () => void utils.social.listSocialConnectors.invalidate(),
  });
  const trigger = trpc.social.triggerOfficialFetch.useMutation({
    onSuccess: () => void utils.social.followerTrends.invalidate(),
  });

  const [cfg, setCfg] = useState({ accessToken: "", pageId: "", igAccountId: "" });
  const [handles, setHandles] = useState([{ platform: "FACEBOOK" as "FACEBOOK" | "INSTAGRAM", handle: "" }]);

  function saveConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg.accessToken) return;
    const config: Record<string, string> = { accessToken: cfg.accessToken };
    if (cfg.pageId) config.pageId = cfg.pageId;
    if (cfg.igAccountId) config.igAccountId = cfg.igAccountId;
    upsert.mutate({ connectorType: "META_SOCIAL_OFFICIAL", config });
  }

  function runFetch() {
    const validHandles = handles.filter((h) => h.handle.trim());
    if (!validHandles.length) return;
    trigger.mutate({ strategyId, handles: validHandles });
  }

  const result = trigger.data as { state?: string; data?: Array<{ platform: string; handle: string; followerCount: number }> } | undefined;

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <strong>API officielle Meta</strong> — utilise un <em>Page Access Token</em> fourni par le client.
        Précis, gratuit, sans tier de scraping. Requiert que la Feature &quot;Page Public Content Access&quot;
        soit activée dans l&apos;app Meta <code>LaFusee_ADVE</code>.
      </div>

      {/* Connector config */}
      <form onSubmit={saveConnector} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Configurer le connecteur Meta</h3>
          <ConnectorStatus status={metaConnector?.status ?? null} label="Meta Graph API" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Page Access Token (ou User Token avec <code>pages_read_engagement</code>)
          </label>
          <input
            type="password"
            placeholder="EAA…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            value={cfg.accessToken}
            onChange={(e) => setCfg((c) => ({ ...c, accessToken: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Générer depuis le Graph API Explorer → ton app → ta page → « Générer un jeton ».
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Page ID ou username Facebook (optionnel)</label>
            <input
              type="text"
              placeholder="spawt.ci ou 123456789"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={cfg.pageId}
              onChange={(e) => setCfg((c) => ({ ...c, pageId: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">IG Business Account ID (optionnel)</label>
            <input
              type="text"
              placeholder="17841400"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={cfg.igAccountId}
              onChange={(e) => setCfg((c) => ({ ...c, igAccountId: e.target.value }))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={upsert.isPending || !cfg.accessToken}
          className="px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium disabled:opacity-40"
        >
          {upsert.isPending ? "Sauvegarde…" : upsert.isSuccess ? "✓ Sauvegardé" : "Sauvegarder"}
        </button>
      </form>

      {/* Trigger fetch */}
      {metaConnector?.status === "ACTIVE" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-xl">
          <h3 className="font-semibold text-gray-800">Lancer une collecte</h3>

          {handles.map((h, i) => (
            <div key={i} className="flex gap-3 items-center">
              <select
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36"
                value={h.platform}
                onChange={(e) => setHandles((arr) => arr.map((x, j) => j === i ? { ...x, platform: e.target.value as "FACEBOOK" | "INSTAGRAM" } : x))}
              >
                <option value="FACEBOOK">FACEBOOK</option>
                <option value="INSTAGRAM">INSTAGRAM</option>
              </select>
              <input
                type="text"
                placeholder="spawt.ci"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={h.handle}
                onChange={(e) => setHandles((arr) => arr.map((x, j) => j === i ? { ...x, handle: e.target.value } : x))}
              />
              {handles.length > 1 && (
                <button type="button" className="text-gray-400 hover:text-red-500 text-xs" onClick={() => setHandles((arr) => arr.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setHandles((arr) => [...arr, { platform: "FACEBOOK", handle: "" }])}>
              + Ajouter un handle
            </button>
            <button
              type="button"
              disabled={trigger.isPending}
              onClick={runFetch}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded text-sm font-medium disabled:opacity-40 ml-auto"
            >
              {trigger.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
              Collecter maintenant
            </button>
          </div>

          {result && (
            <div className={`text-sm rounded p-3 ${result.state === "LIVE" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
              {result.state === "LIVE"
                ? `✓ ${result.data?.length ?? 0} snapshot(s) enregistrés.`
                : `État : ${result.state}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Third-party tab (Apify) ───────────────────────────────────────────────────

function ThirdPartyTab({ strategyId, apifyConnector }: {
  strategyId: string | null;
  apifyConnector: { id: string; status: string } | null;
}) {
  const utils = trpc.useUtils();
  const upsert = trpc.social.upsertSocialConnector.useMutation({
    onSuccess: () => void utils.social.listSocialConnectors.invalidate(),
  });
  const trigger = trpc.social.triggerThirdPartyFetch.useMutation({
    onSuccess: () => void utils.social.followerTrends.invalidate(),
  });

  const [apiKey, setApiKey] = useState("");
  const [handles, setHandles] = useState([{ platform: "INSTAGRAM" as const, handle: "" }]);

  function saveConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;
    upsert.mutate({ connectorType: "APIFY_SOCIAL", config: { apiKey } });
  }

  function runFetch() {
    const validHandles = handles.filter((h) => h.handle.trim());
    if (!validHandles.length) return;
    trigger.mutate({ strategyId, handles: validHandles });
  }

  const result = trigger.data as { state?: string; data?: Array<{ platform: string; handle: string; followerCount: number }> } | undefined;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Apify — Instagram Profile Scraper</strong> — ne nécessite pas de token Meta.
        Idéal pour auditer les comptes clients <em>avant</em> qu&apos;ils connectent leur API officielle,
        ou pour les concurrents. Coût : ~$0,001/profil. Tier gratuit Apify = ~1000 profils/mois.
      </div>

      <form onSubmit={saveConnector} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Configurer Apify</h3>
          <ConnectorStatus status={apifyConnector?.status ?? null} label="Apify" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Apify API Token</label>
          <input
            type="password"
            placeholder="apify_api_…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Créer un compte sur apify.com → Settings → Integrations → API tokens.
          </p>
        </div>

        <button
          type="submit"
          disabled={upsert.isPending || !apiKey}
          className="px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium disabled:opacity-40"
        >
          {upsert.isPending ? "Sauvegarde…" : upsert.isSuccess ? "✓ Sauvegardé" : "Sauvegarder"}
        </button>
      </form>

      {apifyConnector?.status === "ACTIVE" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-xl">
          <h3 className="font-semibold text-gray-800">Lancer une collecte Instagram</h3>

          {handles.map((h, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-xs font-mono text-gray-500 w-24">INSTAGRAM</span>
              <input
                type="text"
                placeholder="spawt.ci"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={h.handle}
                onChange={(e) => setHandles((arr) => arr.map((x, j) => j === i ? { ...x, handle: e.target.value } : x))}
              />
              {handles.length > 1 && (
                <button type="button" className="text-gray-400 hover:text-red-500 text-xs" onClick={() => setHandles((arr) => arr.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setHandles((arr) => [...arr, { platform: "INSTAGRAM", handle: "" }])}>
              + Ajouter un handle
            </button>
            <button
              type="button"
              disabled={trigger.isPending}
              onClick={runFetch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-40 ml-auto"
            >
              {trigger.isPending ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
              Collecter maintenant
            </button>
          </div>

          {result && (
            <div className={`text-sm rounded p-3 ${result.state === "LIVE" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
              {result.state === "LIVE"
                ? `✓ ${result.data?.length ?? 0} snapshot(s) enregistrés.`
                : `État : ${result.state}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Snapshot history table ────────────────────────────────────────────────────

function SnapshotHistory({ strategyId }: { strategyId: string | null }) {
  const { data, isLoading } = trpc.social.followerTrends.useQuery({ strategyId, days: 90 });

  if (isLoading) return <SkeletonPage />;
  if (!data?.length) return <EmptyState icon={BarChart2} title="Aucun snapshot" description="Utilisez l'un des 3 onglets pour enregistrer des données." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-2 border-b border-gray-200">Plateforme</th>
            <th className="px-4 py-2 border-b border-gray-200">Handle</th>
            <th className="px-4 py-2 border-b border-gray-200 text-right">Abonnés</th>
            <th className="px-4 py-2 border-b border-gray-200 text-right">Δ 90j</th>
            <th className="px-4 py-2 border-b border-gray-200">Dernier relevé</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.key} className="hover:bg-gray-50 border-b border-gray-100">
              <td className="px-4 py-2 font-mono text-xs">{row.platform}</td>
              <td className="px-4 py-2 text-blue-600">@{row.handle}</td>
              <td className="px-4 py-2 text-right font-semibold">{row.current.toLocaleString()}</td>
              <td className={`px-4 py-2 text-right text-xs ${row.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                {row.delta >= 0 ? "+" : ""}{row.delta.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs text-gray-400">{new Date(row.lastCapturedAt).toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SocialAuditPage() {
  const [tab, setTab] = useState<Tab>("manual");
  const [strategyId] = useState<string | null>(null); // null = comptes globaux La Fusée

  const { data: connectors, isLoading } = trpc.social.listSocialConnectors.useQuery();

  type ConnectorRow = { id: string; connectorType: string; status: string; lastSyncAt: Date | null; config: unknown };
  const metaConnector = (connectors as ConnectorRow[] | undefined)?.find((c) => c.connectorType === "META_SOCIAL_OFFICIAL") ?? null;
  const apifyConnector = (connectors as ConnectorRow[] | undefined)?.find((c) => c.connectorType === "APIFY_SOCIAL") ?? null;

  if (isLoading) return <SkeletonPage />;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "manual", label: "Saisie manuelle", icon: PlusCircle },
    { id: "official", label: "API officielle Meta", icon: metaConnector?.status === "ACTIVE" ? Wifi : WifiOff },
    { id: "third-party", label: "API tierce (Apify)", icon: metaConnector?.status === "ACTIVE" ? Wifi : WifiOff },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit social — Followers"
        description="3 modes de collecte : saisie manuelle, API officielle Meta, ou Apify (sans token client)."
      />

      {/* Status bar */}
      <div className="flex gap-6 text-sm">
        <ConnectorStatus status={metaConnector?.status ?? null} label="Meta Graph API" />
        <ConnectorStatus status={apifyConnector?.status ?? null} label="Apify" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-64">
        {tab === "manual" && <ManualTab strategyId={strategyId} />}
        {tab === "official" && <OfficialApiTab strategyId={strategyId} metaConnector={metaConnector} />}
        {tab === "third-party" && <ThirdPartyTab strategyId={strategyId} apifyConnector={apifyConnector} />}
      </div>

      {/* History always visible */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-medium text-sm text-gray-700 flex items-center gap-2">
          <BarChart2 size={15} /> Historique — 90 derniers jours
        </div>
        <SnapshotHistory strategyId={strategyId} />
      </div>
    </div>
  );
}
