/**
 * Toast event bus (lib layer — importable by both `lib` and `components`).
 *
 * A `window` CustomEvent channel so code running *outside* React (e.g. the
 * tRPC `MutationCache.onError` safety net in `lib/trpc/client.tsx`) can surface
 * a toast without a React hook. The mounted `<ToastProvider>`
 * (`components/shared/notification-toast.tsx`) listens and renders it.
 *
 * Lives in `lib/` rather than `components/` to respect the layering cascade
 * (`lib` must not import from `components`).
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export const TOAST_EVENT = "lafusee:toast";

export interface ToastEventDetail {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

/** Dispatch a toast from anywhere (no-op during SSR / before hydration). */
export function emitToast(
  message: string,
  variant: ToastVariant = "info",
  duration?: number,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, { detail: { message, variant, duration } }),
  );
}
