"use client";

/**
 * <ErrorVaultListener /> — capture client-side runtime errors et envoie vers
 * tRPC errorVault.captureClient. À mounter dans le RootLayout.
 *
 * Capture :
 *   - window.onerror (uncaught errors)
 *   - window.onunhandledrejection (Promise rejections)
 *   - console.error (best-effort wrapper)
 */

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";

export function ErrorVaultListener() {
  const captureMut = trpc.errorVault.captureClient.useMutation();
  // Garde un set de signatures déjà envoyées dans cette session pour éviter spam
  const sentSigs = useRef(new Set<string>());

  useEffect(() => {
    function makeSig(message: string, stack?: string) {
      return `${message}|${(stack ?? "").slice(0, 200)}`;
    }

    function send(payload: {
      message: string;
      stack?: string;
      code?: string;
      componentPath?: string;
    }) {
      const sig = makeSig(payload.message, payload.stack);
      if (sentSigs.current.has(sig)) return;
      sentSigs.current.add(sig);
      // Bound the set
      if (sentSigs.current.size > 100) {
        const first = sentSigs.current.values().next().value;
        if (first) sentSigs.current.delete(first);
      }
      captureMut.mutate({
        message: payload.message,
        stack: payload.stack,
        code: payload.code,
        componentPath: payload.componentPath,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
    }

    function onError(event: ErrorEvent) {
      send({
        message: event.message ?? "window.onerror",
        stack: event.error?.stack,
        code: "WINDOW_ERROR",
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      send({ message, stack, code: "UNHANDLED_REJECTION" });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [captureMut]);

  return null;
}
