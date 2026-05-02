"use client";

/**
 * Console — Anubis Notification Preferences (ADR-0024).
 *
 * Toggle channels, quiet hours, digest frequency, push subscriptions, test push.
 */

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PushProvider, usePush } from "@/components/providers/push-provider";

const CHANNELS = ["IN_APP", "EMAIL", "SMS", "PUSH"] as const;
const FREQUENCIES = ["INSTANT", "DAILY", "WEEKLY", "NEVER"] as const;

export default function NotificationsPage() {
  return (
    <PushProvider>
      <NotificationsInner />
    </PushProvider>
  );
}

function NotificationsInner() {
  const utils = trpc.useUtils();
  const prefsQuery = trpc.notification.getPreferences.useQuery();
  const subscriptionsQuery = trpc.notification.listPushSubscriptions.useQuery();
  const updatePrefs = trpc.notification.updatePreferences.useMutation({
    onSuccess: () => utils.notification.getPreferences.invalidate(),
  });
  const testPush = trpc.notification.testPush.useMutation();
  const unregisterPush = trpc.notification.unregisterPush.useMutation({
    onSuccess: () => utils.notification.listPushSubscriptions.invalidate(),
  });
  const push = usePush();

  const [channels, setChannels] = useState<Record<string, boolean>>({
    IN_APP: true, EMAIL: true, SMS: false, PUSH: false,
  });
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>("INSTANT");

  useEffect(() => {
    if (!prefsQuery.data) return;
    const p = prefsQuery.data;
    setChannels((p.channels ?? {}) as Record<string, boolean>);
    const q = (p.quiet ?? {}) as { start?: string; end?: string };
    setQuietStart(q.start ?? "");
    setQuietEnd(q.end ?? "");
    setFrequency((p.digestFrequency as (typeof FREQUENCIES)[number]) ?? "INSTANT");
  }, [prefsQuery.data]);

  const save = () => {
    updatePrefs.mutate({
      channels,
      quiet: quietStart && quietEnd ? { start: quietStart, end: quietEnd } : {},
      digestFrequency: frequency,
    });
  };

  const subs = subscriptionsQuery.data ?? [];

  const pushStateLabel = useMemo(() => {
    switch (push.state) {
      case "subscribed": return "Activé";
      case "registering": return "Activation en cours…";
      case "denied": return "Refusé par le navigateur";
      case "unsupported": return "Non supporté";
      default: return "Non activé";
    }
  }, [push.state]);

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Préférences de notification</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Contrôle quels canaux reçoivent quoi, et quand tu veux être laissé tranquille.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Canaux activés</h2>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={channels[c] ?? false}
                onChange={(e) => setChannels((s) => ({ ...s, [c]: e.target.checked }))}
              />
              <span className="text-sm">{c}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Heures silencieuses (UTC)</h2>
        <div className="flex gap-3 items-center text-sm">
          <label>
            Début
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              className="ml-2 px-2 py-1 border rounded"
            />
          </label>
          <label>
            Fin
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              className="ml-2 px-2 py-1 border rounded"
            />
          </label>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Pendant cette plage, seules les notifications priorité CRITICAL seront poussées.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Récap (digest)</h2>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as (typeof FREQUENCIES)[number])}
          className="px-3 py-1 border rounded"
        >
          {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Notifications push (Web)</h2>
        <p className="text-sm">
          État : <strong>{pushStateLabel}</strong>
        </p>
        {push.state !== "subscribed" && push.state !== "unsupported" && (
          <button
            type="button"
            className="px-3 py-1 rounded bg-[var(--color-accent)] text-[var(--color-on-accent)]"
            disabled={!push.vapidPublicKey || push.state === "registering"}
            onClick={() => push.requestPushPermission()}
          >
            Activer notifications push
          </button>
        )}
        {!push.vapidPublicKey && push.state !== "unsupported" && (
          <p className="text-xs text-[var(--color-text-muted)]">
            VAPID non configuré. Configure-le dans{" "}
            <a className="underline" href="/console/anubis/credentials?connector=vapid">
              /console/anubis/credentials
            </a>.
          </p>
        )}
        <ul className="space-y-1 text-sm">
          {subs.map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span className="truncate text-xs text-[var(--color-text-muted)]">
                {s.userAgent ?? s.endpoint.slice(0, 60)}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => unregisterPush.mutate({ endpoint: s.endpoint })}
              >
                Révoquer
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex gap-3 border-t pt-4">
        <button
          type="button"
          className="px-4 py-2 rounded bg-[var(--color-accent)] text-[var(--color-on-accent)] disabled:opacity-50"
          onClick={save}
          disabled={updatePrefs.isPending}
        >
          {updatePrefs.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border"
          onClick={() => testPush.mutate()}
          disabled={testPush.isPending}
        >
          Test envoi
        </button>
      </section>

      {testPush.data && (
        <pre className="text-xs p-2 bg-[var(--color-surface-active)] rounded">
          {JSON.stringify(testPush.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
