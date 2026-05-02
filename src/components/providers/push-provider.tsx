"use client";

/**
 * PushProvider — Service Worker registration + Web Push subscription helper.
 *
 * Cf. ADR-0024. Opt-in via la page /console/anubis/notifications (le user
 * clique "Activer notifications push" qui appelle `requestPushPermission`).
 * Pas auto-prompt à l'arrivée — anti-friction.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

type PushState = "idle" | "registering" | "subscribed" | "denied" | "unsupported";

interface PushContextValue {
  state: PushState;
  vapidPublicKey: string | null;
  requestPushPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextValue | null>(null);

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(base64) : "";
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    out[i] = code;
  }
  return out as Uint8Array<ArrayBuffer>;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return typeof btoa === "function" ? btoa(binary) : "";
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PushState>("idle");
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const registerPush = trpc.notification.registerPush.useMutation();
  const unregisterPush = trpc.notification.unregisterPush.useMutation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Registration may fail in dev or if /sw.js is missing — silently ignore.
      });
    fetch("/api/push/vapid-key")
      .then((r) => r.json())
      .then((data: { publicKey?: string | null }) => {
        if (data.publicKey) setVapidPublicKey(data.publicKey);
      })
      .catch(() => undefined);
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (state === "unsupported") return;
    if (!vapidPublicKey) return;
    setState("registering");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const p256dh = json.keys?.p256dh
      ?? arrayBufferToBase64(sub.getKey("p256dh") ?? new ArrayBuffer(0));
    const auth = json.keys?.auth
      ?? arrayBufferToBase64(sub.getKey("auth") ?? new ArrayBuffer(0));

    await registerPush.mutateAsync({
      endpoint: sub.endpoint,
      p256dh,
      auth,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
    setState("subscribed");
  }, [state, vapidPublicKey, registerPush]);

  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await unregisterPush.mutateAsync({ endpoint: sub.endpoint });
    await sub.unsubscribe();
    setState("idle");
  }, [unregisterPush]);

  return (
    <PushContext.Provider
      value={{ state, vapidPublicKey, requestPushPermission, unsubscribe }}
    >
      {children}
    </PushContext.Provider>
  );
}

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used inside PushProvider");
  return ctx;
}
