"use client";

/**
 * Console — Facturation API MCP (Vague 5 mégasprint).
 *
 * Gestion des clés API externes (x-api-key) + usage live du mois courant +
 * relevés mensuels gelés (émission / règlement). La clé en clair n'est
 * affichée qu'UNE fois à la création — seul le hash est persisté.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Key, Plus, Copy, Power, Receipt, CheckCircle2, BadgeDollarSign } from "lucide-react";

const MCP_SERVERS = [
  "*",
  "advertis-inbound",
  "artemis",
  "creative",
  "guild",
  "intelligence",
  "operations",
  "ptah",
  "pulse",
  "seshat",
] as const;

function fmtUsd(n: number): string {
  return `$${n.toFixed(4).replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m))}`;
}

export default function McpApiBillingPage() {
  const utils = trpc.useUtils();
  const { data: keys, isLoading } = trpc.mcpBilling.listKeys.useQuery();
  const { data: statements } = trpc.mcpBilling.listStatements.useQuery({});

  const createKey = trpc.mcpBilling.createKey.useMutation({
    onSuccess: (res) => {
      setFreshKey(res.plaintextKey);
      utils.mcpBilling.listKeys.invalidate();
    },
  });
  const setActive = trpc.mcpBilling.setKeyActive.useMutation({
    onSuccess: () => utils.mcpBilling.listKeys.invalidate(),
  });
  const issue = trpc.mcpBilling.issueStatement.useMutation({
    onSuccess: () => {
      utils.mcpBilling.listStatements.invalidate();
      utils.mcpBilling.listKeys.invalidate();
    },
  });
  const settle = trpc.mcpBilling.settleStatement.useMutation({
    onSuccess: () => utils.mcpBilling.listStatements.invalidate(),
  });

  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    server: "*" as string,
    ratePerCallUsd: "0.002",
    includedMonthlyCalls: "100",
    ownerEmail: "",
  });
  const [issuePeriod, setIssuePeriod] = useState<string>(() => {
    // Défaut : le mois précédent (le mois clos à facturer).
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 1);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [settleRefs, setSettleRefs] = useState<Record<string, string>>({});

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturation API (MCP)"
        description="Clés x-api-key des clients externes, metering par call et relevés mensuels. Tarification déterministe : billable = max(0, calls − franchise) × tarif/call. Le règlement passe par les payment providers (référence reliée au relevé)."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Anubis", href: "/console/anubis" },
          { label: "API Billing" },
        ]}
      />

      {/* Clé fraîchement créée — affichée UNE seule fois */}
      {freshKey && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Clé créée — copie-la maintenant, elle ne sera plus jamais affichée.
              </p>
              <code className="mt-1 block break-all font-mono text-xs text-foreground">{freshKey}</code>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(freshKey).catch(() => undefined)}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover"
            >
              <Copy className="h-3 w-3" /> Copier
            </button>
          </div>
        </div>
      )}

      {/* Liste des clés + usage live */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Clés API</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            {keys?.length ?? 0} clé{(keys?.length ?? 0) > 1 ? "s" : ""} — usage du mois courant inclus
          </p>
        </div>
        <div className="divide-y divide-border">
          {(keys ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">
              Aucune clé API. Crée la première ci-dessous pour armer la facturation externe.
            </div>
          )}
          {keys?.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-bg-subtle p-2">
                  <Key className="h-4 w-4 text-foreground-muted" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{k.name}</span>
                    <span className="rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-foreground-muted">
                      {k.server}
                    </span>
                    {!k.isActive && (
                      <span className="rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold text-error">RÉVOQUÉE</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {fmtUsd(k.ratePerCallUsd)}/call · {k.includedMonthlyCalls} calls offerts/mois
                    {k.ownerEmail ? ` · ${k.ownerEmail}` : ""}
                    {k.lastUsedAt ? ` · dernier call ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · jamais utilisée"}
                  </p>
                  {k.currentUsage && (
                    <p className="mt-0.5 text-xs">
                      <span className="text-foreground">{k.currentUsage.callCount} calls ce mois</span>
                      <span className="text-foreground-muted">
                        {" "}→ {k.currentUsage.billableCalls} facturables = {fmtUsd(k.currentUsage.costUsd)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => issue.mutate({ keyId: k.id, period: issuePeriod })}
                  disabled={issue.isPending}
                  title={`Geler le relevé ${issuePeriod}`}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover"
                >
                  <Receipt className="h-3 w-3" /> Émettre {issuePeriod}
                </button>
                <button
                  onClick={() => setActive.mutate({ keyId: k.id, isActive: !k.isActive })}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${
                    k.isActive
                      ? "border-error/40 text-error hover:bg-error/10"
                      : "border-border bg-card hover:bg-card-hover"
                  }`}
                >
                  <Power className="h-3 w-3" /> {k.isActive ? "Révoquer" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3 text-right">
          <label className="text-xs text-foreground-muted">
            Période d'émission :{" "}
            <input
              value={issuePeriod}
              onChange={(e) => setIssuePeriod(e.target.value)}
              placeholder="YYYY-MM"
              className="w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs"
            />
          </label>
          {issue.error && <p className="mt-1 text-xs text-error">{issue.error.message}</p>}
        </div>
      </div>

      {/* Création de clé */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4" /> Nouvelle clé API
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            placeholder="Nom (client / intégration)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          />
          <select
            value={form.server}
            onChange={(e) => setForm({ ...form, server: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          >
            {MCP_SERVERS.map((s) => (
              <option key={s} value={s}>
                {s === "*" ? "Tous les serveurs (*)" : s}
              </option>
            ))}
          </select>
          <input
            placeholder="Tarif $/call"
            value={form.ratePerCallUsd}
            onChange={(e) => setForm({ ...form, ratePerCallUsd: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm"
          />
          <input
            placeholder="Calls offerts/mois"
            value={form.includedMonthlyCalls}
            onChange={(e) => setForm({ ...form, includedMonthlyCalls: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm"
          />
          <input
            placeholder="Email de facturation (optionnel)"
            value={form.ownerEmail}
            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {createKey.error && <p className="text-xs text-error">{createKey.error.message}</p>}
          <button
            onClick={() =>
              createKey.mutate({
                name: form.name,
                server: form.server,
                ratePerCallUsd: Number(form.ratePerCallUsd) || 0.002,
                includedMonthlyCalls: Number(form.includedMonthlyCalls) || 0,
                ownerEmail: form.ownerEmail || undefined,
              })
            }
            disabled={createKey.isPending || form.name.trim().length < 2}
            className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            Créer la clé
          </button>
        </div>
      </div>

      {/* Relevés */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BadgeDollarSign className="h-4 w-4" /> Relevés mensuels
          </h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Gelés à l'émission. Un relevé ISSUED se règle en saisissant la référence de paiement
            (IntakePayment / virement) — WAIVED = sous franchise, rien à facturer.
          </p>
        </div>
        <div className="divide-y divide-border">
          {(statements ?? []).length === 0 && (
            <div className="p-6 text-center text-sm text-foreground-muted">Aucun relevé émis.</div>
          )}
          {statements?.map((st) => (
            <div key={st.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">{st.period}</span>
                  <span className="text-sm text-foreground">{st.apiKey.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      st.status === "SETTLED"
                        ? "bg-success/15 text-success"
                        : st.status === "WAIVED"
                          ? "bg-bg-subtle text-foreground-muted"
                          : "bg-warning/15 text-warning"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted">
                  {st.callCount} calls · {st.billableCalls} facturables · {fmtUsd(st.costUsd)} {st.currency}
                  {st.paymentRef ? ` · réf ${st.paymentRef}` : ""}
                </p>
              </div>
              {st.status === "ISSUED" && (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Référence paiement"
                    value={settleRefs[st.id] ?? ""}
                    onChange={(e) => setSettleRefs({ ...settleRefs, [st.id]: e.target.value })}
                    className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => settle.mutate({ statementId: st.id, paymentRef: settleRefs[st.id] ?? "" })}
                    disabled={settle.isPending || (settleRefs[st.id] ?? "").length < 3}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-hover disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Régler
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
