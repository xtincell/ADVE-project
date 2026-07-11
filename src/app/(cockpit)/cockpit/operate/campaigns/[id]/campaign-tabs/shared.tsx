"use client";

/**
 * Helpers partagés des onglets campagne — extraits verbatim de page.tsx
 * (dé-densification, dette (b) audit UX 2026-07-11). Zéro logique modifiée.
 */

export type CampaignState =
  | "BRIEF_DRAFT" | "BRIEF_VALIDATED" | "PLANNING" | "CREATIVE_DEV"
  | "PRODUCTION" | "PRE_PRODUCTION" | "APPROVAL" | "READY_TO_LAUNCH"
  | "LIVE" | "POST_CAMPAIGN" | "ARCHIVED" | "CANCELLED";

export const STATE_COLORS: Record<string, string> = {
  BRIEF_DRAFT: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
  BRIEF_VALIDATED: "bg-info/15 text-info ring-info/30",
  PLANNING: "bg-accent/15 text-accent ring-accent/30",
  CREATIVE_DEV: "bg-warning/15 text-warning ring-warning/30",
  PRODUCTION: "bg-warning/15 text-warning ring-warning/30",
  PRE_PRODUCTION: "bg-warning/15 text-warning ring-warning/30",
  APPROVAL: "bg-warning/15 text-warning ring-warning/30",
  READY_TO_LAUNCH: "bg-info/15 text-info ring-info/30",
  LIVE: "bg-success/15 text-success ring-success/30",
  POST_CAMPAIGN: "bg-error/15 text-error ring-error/30",
  ARCHIVED: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
  CANCELLED: "bg-error/15 text-error ring-error/30",
};

export function StateBadge({ state }: { state: string }) {
  const c = STATE_COLORS[state] ?? STATE_COLORS.BRIEF_DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${c}`}>
      {state.replace(/_/g, " ")}
    </span>
  );
}

export function Section({ title, icon: Icon, action, children }: { title: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          {Icon && <Icon className="h-4 w-4 text-foreground-secondary" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MiniBtn({ onClick, disabled, children, variant = "default" }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: "default" | "danger" | "primary" }) {
  const base = "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";
  const v = variant === "danger" ? "border border-error text-error hover:bg-error/40" : variant === "primary" ? "bg-white text-foreground-muted hover:bg-foreground" : "border border-border bg-background text-foreground-secondary hover:bg-surface-raised";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v}`}>{children}</button>;
}

export function KV({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

export function EmptyMsg({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-foreground-muted">{text}</p>;
}
