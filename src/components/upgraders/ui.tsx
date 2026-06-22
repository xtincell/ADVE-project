/**
 * UPgraders site — shared presentational helpers.
 *
 * Server components. Semantic DS tokens only (UPgraders DS — corail accent,
 * Clash Display / Satoshi / JetBrains Mono). No reference tokens, no raw colors.
 */
import * as React from "react";

/* Page container — canonical max width + page padding. */
export function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[var(--maxw-content)] px-[var(--pad-page)] ${className}`}>
      {children}
    </div>
  );
}

/* Mono eyebrow with an accent dot — the recurring section kicker. */
export function Eyebrow({ children, num }: { children: React.ReactNode; num?: string }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2.5 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
      {num ? (
        <span className="text-accent">{num}</span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      )}
      <span>{children}</span>
    </div>
  );
}

/* Display heading with an optional serif-italic emphasis fragment. */
export function SectionHeading({
  children,
  emphasis,
  after,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  emphasis?: string;
  after?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className="font-display font-semibold tracking-tight text-balance" style={{ fontSize: "var(--text-4xl)", lineHeight: 1.05 }}>
      {children}
      {emphasis ? <span className="font-serif italic font-medium text-accent"> {emphasis}</span> : null}
      {after}
    </Tag>
  );
}

/* Large secondary lede paragraph. */
export function Lede({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`max-w-[68ch] text-pretty text-foreground-secondary ${className}`} style={{ fontSize: "var(--text-lg)", lineHeight: 1.5 }}>
      {children}
    </p>
  );
}

/* Primary / secondary CTA links — plain anchors so they work from any page. */
export function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 bg-accent px-5 py-3.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
    >
      {children}
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </a>
  );
}

export function GhostCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 border border-border-strong px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
    >
      {children}
    </a>
  );
}

/* Sub-page header — consistent masthead under the fixed nav. */
export function PageHeader({
  eyebrow,
  title,
  emphasis,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  lede?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-border-subtle pt-32 pb-14 md:pt-36 md:pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 30% 0%, black 30%, transparent 75%)",
        }}
      />
      <Shell className="relative">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display font-semibold tracking-tighter" style={{ fontSize: "var(--text-5xl, var(--text-4xl))", lineHeight: 1 }}>
          {title}
          {emphasis ? <span className="font-serif italic font-medium text-accent"> {emphasis}</span> : null}
        </h1>
        {lede ? <Lede className="mt-6">{lede}</Lede> : null}
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </Shell>
    </header>
  );
}

/* Section wrapper — vertical rhythm + optional sunken surface + top hairline. */
export function Section({
  id,
  children,
  surface = false,
  divide = true,
}: {
  id?: string;
  children: React.ReactNode;
  surface?: boolean;
  divide?: boolean;
}) {
  const surfaceClass = surface ? "bg-surface-raised" : "";
  const divideClass = divide ? "border-t border-border-subtle" : "";
  return (
    <section id={id} className={`py-20 md:py-28 ${surfaceClass} ${divideClass}`}>
      <Shell>{children}</Shell>
    </section>
  );
}
