"use client";

/**
 * Configuration du fournisseur email PAR MARQUE (opérateur uniquement).
 *
 * La marque envoie ses newsletters via SON PROPRE compte fournisseur (Brevo).
 * La clé est validée EN RÉEL (Brevo /v3/account + senders) avant activation, et
 * n'est jamais renvoyée au client (le serveur projette sans `apiKey`). Surface
 * opérateur : les fondateurs ne la voient pas (UPgraders configure pour eux).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCanOperate } from "@/components/cockpit/use-can-operate";
import { Mail, CheckCircle, AlertTriangle, Send, Loader2 } from "lucide-react";

export function EmailProviderCard({ strategyId }: { strategyId: string }) {
  const canOperate = useCanOperate();
  const utils = trpc.useUtils();
  const connectorQuery = trpc.newsletter.emailProviderGet.useQuery({ strategyId });

  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [testTo, setTestTo] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const connector = connectorQuery.data;

  const setMutation = trpc.newsletter.emailProviderSet.useMutation({
    onSuccess: (r) => {
      setNotice({ kind: "ok", text: `Connecteur activé (compte ${r.accountEmail ?? "Brevo"}).` });
      setApiKey("");
      utils.newsletter.emailProviderGet.invalidate({ strategyId });
    },
    onError: (e) => setNotice({ kind: "err", text: e.message }),
  });
  const testMutation = trpc.newsletter.emailProviderTest.useMutation({
    onSuccess: (r) =>
      setNotice(
        r.ok
          ? { kind: "ok", text: `Clé valide (compte ${r.accountEmail ?? "Brevo"}).` }
          : { kind: "err", text: r.error ?? "Test échoué." },
      ),
    onError: (e) => setNotice({ kind: "err", text: e.message }),
    onSettled: () => utils.newsletter.emailProviderGet.invalidate({ strategyId }),
  });
  const sendTestMutation = trpc.newsletter.emailProviderSendTest.useMutation({
    onSuccess: (r) => setNotice({ kind: "ok", text: `Email de test envoyé (${r.provider}).` }),
    onError: (e) => setNotice({ kind: "err", text: e.message }),
  });

  // Surface opérateur — invisible pour les fondateurs (UPgraders configure).
  if (!canOperate) return null;

  const isActive = connector?.status === "ACTIVE";
  const isError = connector?.status === "ERROR";

  return (
    <div className="rounded-xl border border-border bg-background/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-foreground-secondary" />
          <div>
            <h3 className="text-sm font-semibold text-white">Fournisseur email de la marque</h3>
            <p className="text-2xs text-foreground-muted">
              Envoi via le compte du client (Brevo). Réservé à l'opérateur.
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
            isActive
              ? "bg-success/15 text-success border-success/30"
              : isError
                ? "bg-error/15 text-error border-error/30"
                : "bg-foreground-muted/15 text-foreground-secondary border-foreground-muted/30"
          }`}
        >
          {connector?.status ?? "NON CONFIGURÉ"}
        </span>
      </div>

      {connector && (
        <div className="text-2xs text-foreground-secondary space-y-0.5">
          <div>
            Expéditeur : <span className="text-white font-mono">{connector.fromName ? `${connector.fromName} <${connector.fromEmail}>` : connector.fromEmail}</span>
          </div>
          {connector.lastError && (
            <div className="text-error flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {connector.lastError}
            </div>
          )}
        </div>
      )}

      {notice && (
        <div
          className={`flex items-start gap-1.5 text-2xs rounded-lg border px-3 py-2 ${
            notice.kind === "ok"
              ? "bg-success/10 text-success border-success/20"
              : "bg-error/10 text-error border-error/20"
          }`}
        >
          {notice.kind === "ok" ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-2xs font-semibold text-foreground-secondary">Clé API Brevo</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connector?.hasKey ? "•••••••• (clé enregistrée — laisser vide pour conserver)" : "xkeysib-…"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-white placeholder-foreground-muted outline-none focus:border-border-strong"
          />
        </label>
        <label className="space-y-1">
          <span className="text-2xs font-semibold text-foreground-secondary">Expéditeur (email vérifié)</span>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder={connector?.fromEmail ?? "ex: contact@marque.com"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-white placeholder-foreground-muted outline-none focus:border-border-strong"
          />
        </label>
        <label className="space-y-1">
          <span className="text-2xs font-semibold text-foreground-secondary">Nom d'expéditeur</span>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder={connector?.fromName ?? "ex: Ma Marque"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-white placeholder-foreground-muted outline-none focus:border-border-strong"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            setMutation.mutate({
              strategyId,
              apiKey: apiKey || undefined,
              fromEmail: fromEmail || connector?.fromEmail || "",
              fromName: fromName || connector?.fromName || undefined,
            })
          }
          disabled={setMutation.isPending || (!apiKey && !connector?.hasKey)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/90 px-3 py-1.5 text-xs font-bold text-background disabled:opacity-50"
        >
          {setMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Valider &amp; activer
        </button>
        {connector?.hasKey && (
          <button
            onClick={() => testMutation.mutate({ strategyId })}
            disabled={testMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-surface-raised px-3 py-1.5 text-xs text-foreground-secondary hover:text-white disabled:opacity-50"
          >
            {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Tester la clé
          </button>
        )}
      </div>

      {isActive && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Envoyer un email de test à…"
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-white placeholder-foreground-muted outline-none focus:border-border-strong"
          />
          <button
            onClick={() => sendTestMutation.mutate({ strategyId, to: testTo })}
            disabled={sendTestMutation.isPending || !testTo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-surface-raised px-3 py-1.5 text-xs text-foreground-secondary hover:text-white disabled:opacity-50"
          >
            {sendTestMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Envoyer un test
          </button>
        </div>
      )}
    </div>
  );
}
