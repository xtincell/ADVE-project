"use client";

/**
 * Console — Anubis MCP management (ADR-0026).
 *
 * 3 onglets :
 *   - Inbound  : MCP servers que La Fusée consomme (Slack/Notion/Drive…)
 *   - Outbound : manifest agrégé exposé aux clients externes (Claude Desktop)
 *   - Templates: NotificationTemplate CRUD (ADR-0025)
 */

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

type Tab = "INBOUND" | "OUTBOUND" | "TEMPLATES";

export default function McpManagementPage() {
  const [tab, setTab] = useState<Tab>("INBOUND");

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">MCP — Model Context Protocol</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Connecteurs entrants/sortants pour outils IA externes (Slack, Notion, Drive, Calendar, Figma, GitHub) et exposition des outils La Fusée à Claude Desktop / Claude Code. Cf. ADR-0026.
        </p>
      </header>

      <nav className="flex gap-2 border-b border-[var(--color-border)]">
        {(["INBOUND", "OUTBOUND", "TEMPLATES"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "INBOUND" ? "Entrant" : t === "OUTBOUND" ? "Sortant" : "Templates"}
          </button>
        ))}
      </nav>

      {tab === "INBOUND" && <InboundTab />}
      {tab === "OUTBOUND" && <OutboundTab />}
      {tab === "TEMPLATES" && <TemplatesTab />}
    </div>
  );
}

function InboundTab() {
  const utils = trpc.useUtils();
  const list = trpc.anubis.mcpListRegistry.useQuery({ direction: "INBOUND" });
  const invocations = trpc.anubis.mcpListInvocations.useQuery({ limit: 20 });
  const register = trpc.anubis.mcpRegisterServer.useMutation({
    onSuccess: () => utils.anubis.mcpListRegistry.invalidate(),
  });
  const sync = trpc.anubis.mcpSyncTools.useMutation({
    onSuccess: () => utils.anubis.mcpListRegistry.invalidate(),
  });

  const [serverName, setServerName] = useState("");
  const [endpoint, setEndpoint] = useState("");

  return (
    <section className="space-y-6">
      <div className="rounded border border-[var(--color-border)] p-4 space-y-3">
        <h3 className="font-medium">Enregistrer un MCP server externe</h3>
        <div className="flex gap-2">
          <input
            placeholder="serverName (ex: slack)"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="px-2 py-1 border rounded text-sm flex-1"
          />
          <input
            placeholder="https://example.com/mcp"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="px-2 py-1 border rounded text-sm flex-2"
          />
          <button
            type="button"
            className="px-3 py-1 bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded text-sm"
            onClick={() =>
              register.mutate({ direction: "INBOUND", serverName, endpoint })
            }
            disabled={!serverName || !endpoint}
          >
            Enregistrer
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Les credentials s'enregistrent ensuite dans{" "}
          <Link href="/console/anubis/credentials" className="underline">
            Credentials Center
          </Link>{" "}
          avec connectorType <code>mcp:&lt;serverName&gt;</code>.
        </p>
      </div>

      <div>
        <h3 className="font-medium mb-2">Servers enregistrés</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-[var(--color-text-muted)]">
            <tr><th className="text-left py-1">Server</th><th className="text-left">Endpoint</th><th>Status</th><th>Tools</th><th></th></tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border-muted)]">
                <td className="py-2 font-mono text-xs">{r.serverName}</td>
                <td className="py-2 truncate max-w-xs text-xs">{r.endpoint}</td>
                <td className="py-2 text-xs">{r.status}</td>
                <td className="py-2 text-xs">{Array.isArray(r.toolsCache) ? r.toolsCache.length : 0}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => sync.mutate({ serverName: r.serverName })}
                    className="text-xs underline"
                  >
                    Sync
                  </button>
                </td>
              </tr>
            ))}
            {list.data && list.data.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-[var(--color-text-muted)]">Aucun server enregistré.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-medium mb-2">Invocations récentes</h3>
        <ul className="text-xs space-y-1">
          {(invocations.data ?? []).map((inv) => (
            <li key={inv.id} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border-muted)]">
              <span className="font-mono">{inv.toolName}</span>
              <span>{inv.status}</span>
              <span className="text-[var(--color-text-muted)]">{inv.durationMs ?? "?"}ms</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OutboundTab() {
  const manifest = trpc.anubis.mcpOutboundManifest.useQuery();
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        lafusee: {
          url: typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp",
        },
      },
    },
    null,
    2,
  );

  return (
    <section className="space-y-4">
      <div className="rounded border border-[var(--color-border)] p-4">
        <h3 className="font-medium mb-2">Configuration Claude Desktop / Claude Code</h3>
        <pre className="text-xs bg-[var(--color-surface-active)] p-3 rounded overflow-x-auto">
{claudeDesktopConfig}
        </pre>
        <button
          type="button"
          className="mt-2 text-xs underline"
          onClick={() => navigator.clipboard?.writeText(claudeDesktopConfig)}
        >
          Copier dans le presse-papier
        </button>
      </div>

      <div>
        <h3 className="font-medium mb-2">Manifest agrégé ({manifest.data?.servers.length ?? 0} servers)</h3>
        {manifest.data?.servers.map((s) => (
          <details key={s.name} className="border border-[var(--color-border)] rounded mb-2">
            <summary className="px-3 py-2 cursor-pointer text-sm font-medium">
              {s.name} <span className="text-[var(--color-text-muted)]">({s.tools.length} tools)</span>
            </summary>
            <ul className="px-4 py-2 text-xs space-y-1">
              {s.tools.map((t) => (
                <li key={t.name}>
                  <strong className="font-mono">{t.name}</strong> — <span className="text-[var(--color-text-muted)]">{t.description}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

function TemplatesTab() {
  const utils = trpc.useUtils();
  const list = trpc.anubis.templatesList.useQuery();
  const upsert = trpc.anubis.templatesUpsert.useMutation({
    onSuccess: () => utils.anubis.templatesList.invalidate(),
  });
  const del = trpc.anubis.templatesDelete.useMutation({
    onSuccess: () => utils.anubis.templatesList.invalidate(),
  });

  const [slug, setSlug] = useState("");
  const [channel, setChannel] = useState<"IN_APP" | "EMAIL" | "SMS" | "PUSH">("EMAIL");
  const [subject, setSubject] = useState("");
  const [bodyHbs, setBodyHbs] = useState("");
  const [bodyMjml, setBodyMjml] = useState("");
  const [category, setCategory] = useState("notification");

  return (
    <section className="space-y-4">
      <div className="rounded border border-[var(--color-border)] p-4 space-y-2">
        <h3 className="font-medium">Créer / mettre à jour un template</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <input placeholder="slug (ex: welcome)" value={slug} onChange={(e) => setSlug(e.target.value)} className="px-2 py-1 border rounded" />
          <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="px-2 py-1 border rounded">
            {(["IN_APP", "EMAIL", "SMS", "PUSH"] as const).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="subject (email)" value={subject} onChange={(e) => setSubject(e.target.value)} className="px-2 py-1 border rounded col-span-2" />
          <textarea placeholder="bodyHbs (Handlebars/markdown)" value={bodyHbs} onChange={(e) => setBodyHbs(e.target.value)} className="px-2 py-1 border rounded col-span-2 font-mono text-xs" rows={4} />
          <textarea placeholder="bodyMjml (optional, email HTML)" value={bodyMjml} onChange={(e) => setBodyMjml(e.target.value)} className="px-2 py-1 border rounded col-span-2 font-mono text-xs" rows={3} />
          <input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
        <button
          type="button"
          className="px-3 py-1 bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded text-sm"
          onClick={() =>
            upsert.mutate({
              slug, channel, subject: subject || undefined, bodyHbs,
              bodyMjml: bodyMjml || undefined, variables: {}, category,
            })
          }
          disabled={!slug || !bodyHbs}
        >
          Enregistrer
        </button>
      </div>

      <div>
        <h3 className="font-medium mb-2">Templates existants</h3>
        <ul className="text-sm space-y-1">
          {(list.data ?? []).map((t) => (
            <li key={t.id} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border-muted)]">
              <span className="font-mono">{t.slug}</span>
              <span className="text-xs">{t.channel} · {t.category}</span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => del.mutate({ slug: t.slug })}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
