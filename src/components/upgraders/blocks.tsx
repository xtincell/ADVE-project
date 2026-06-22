/**
 * UPgraders site — reusable content blocks.
 *
 * Pure presentational server components, shared between the homepage and the
 * dedicated sub-pages. Semantic DS tokens only.
 */
import * as React from "react";
import Link from "next/link";
import {
  ADVE,
  RTIS,
  PILLARS,
  PALIERS,
  EFR_POINTS,
  GUILDE_CATEGORIES,
  GUILDE_MEMBERS,
  REALISATIONS,
  TIMELINE,
  TEAM,
  STATS,
  type MethodStep,
} from "./data";
import { type BlogPost, formatPostDate } from "./posts";

/* ── Les 5 piliers ───────────────────────────────────────────────────────── */
export function PillarsGrid() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {PILLARS.map((p) => (
        <div key={p.mark} className="flex flex-col gap-3 bg-background p-7">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-accent">{p.mark}</span>
            <span className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">{p.line}</span>
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
          <p className="text-sm leading-relaxed text-foreground-secondary">{p.desc}</p>
        </div>
      ))}
      <div className="flex flex-col justify-center gap-2 bg-accent p-7 text-accent-foreground">
        <span className="font-mono text-2xs uppercase tracking-widest opacity-80">+ la plateforme</span>
        <h3 className="font-display text-xl font-semibold tracking-tight">La Fusée</h3>
        <p className="text-sm leading-relaxed opacity-90">L&apos;Industry OS qui orchestre les cinq piliers et automatise la méthode ADVE/RTIS.</p>
        <Link href="/lafusee" className="mt-1 inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest underline-offset-4 hover:underline">
          Découvrir l&apos;OS →
        </Link>
      </div>
    </div>
  );
}

/* ── Cascade ADVE/RTIS ───────────────────────────────────────────────────── */
function MethodHalf({ tag, title, sub, steps }: { tag: string; title: string; sub: string; steps: MethodStep[] }) {
  return (
    <div className="border border-border bg-background p-7 md:p-9">
      <div className="mb-1 font-mono text-2xs uppercase tracking-widest text-accent">{tag}</div>
      <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-foreground-muted">{sub}</p>
      <div className="mt-6 flex flex-col gap-5">
        {steps.map((s) => (
          <div key={s.code} className="flex gap-4">
            <span className="font-display text-2xl font-semibold leading-none text-accent">{s.code}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {s.name} <span className="font-normal text-foreground-muted">— {s.sub}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MethodCascade() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MethodHalf tag="Socle · ADVE" title="L'identité" sub="Ce que la marque est, en propre." steps={ADVE} />
        <MethodHalf tag="Propulseur · RTIS" title="L'action" sub="Comment la marque se déploie." steps={RTIS} />
      </div>
      <div className="mt-5 border border-border-subtle bg-surface-raised p-5 text-center font-mono text-xs text-foreground-secondary">
        <span className="text-foreground">A → D → V → E</span>
        <span className="mx-3 text-accent">║</span>
        <span className="text-foreground">R → T → I → S</span>
        <div className="mt-1 text-2xs uppercase tracking-widest text-foreground-muted">socle — l&apos;identité ║ propulseur — l&apos;action</div>
      </div>
    </div>
  );
}

/* ── Paliers + score cible ───────────────────────────────────────────────── */
export function PaliersLadder() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {PALIERS.map((p, i) => (
        <div key={p.name} className="flex flex-col gap-2 bg-background p-5">
          <span className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">Palier {i + 1}</span>
          <span className="font-display text-lg font-semibold tracking-tight">{p.name}</span>
          <span className="font-mono text-2xl font-semibold text-accent">
            {p.score}
            {p.score !== "—" ? <span className="text-sm text-foreground-muted">/200</span> : null}
          </span>
          <p className="text-xs leading-relaxed text-foreground-secondary">{p.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ── EFR — obligation d'effet ────────────────────────────────────────────── */
export function EfrGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {EFR_POINTS.map((e, i) => (
        <div key={e.title} className="border border-border bg-background p-7">
          <div className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</div>
          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{e.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{e.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── La Guilde — 3 catégories ────────────────────────────────────────────── */
export function GuildeCategories() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {GUILDE_CATEGORIES.map((c) => (
        <div key={c.name} className="border border-border bg-background p-7">
          <h3 className="font-display text-xl font-semibold tracking-tight">
            La Guilde <span className="text-accent">{c.name}</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── La Guilde — membres ─────────────────────────────────────────────────── */
export function GuildeGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {GUILDE_MEMBERS.map((m) => (
        <div key={m.name} className="flex flex-col gap-2 border border-border bg-background p-6">
          <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">{m.role}</div>
          <h3 className="font-display text-lg font-semibold tracking-tight">{m.name}</h3>
          <div className="text-xs text-accent">{m.tag}</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{m.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Direction ───────────────────────────────────────────────────────────── */
export function TeamGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {TEAM.map((m) => (
        <div key={m.name} className={`flex flex-col gap-2 border bg-background p-7 ${m.lead ? "border-accent" : "border-border"}`}>
          <div className={`font-mono text-2xs uppercase tracking-widest ${m.lead ? "text-accent" : "text-foreground-muted"}`}>{m.role}</div>
          <h3 className="font-display text-lg font-semibold tracking-tight">{m.name}</h3>
          <div className="text-xs text-foreground-muted">{m.tag}</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{m.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Réalisations ────────────────────────────────────────────────────────── */
export function RealisationsGrid({ limit }: { limit?: number }) {
  const items = typeof limit === "number" ? REALISATIONS.slice(0, limit) : REALISATIONS;
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <div key={r.name} className="flex flex-col gap-2 bg-background p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold tracking-tight">{r.name}</h3>
          </div>
          <div className="font-mono text-2xs uppercase tracking-widest text-accent">{r.sector}</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{r.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Trajectoire ─────────────────────────────────────────────────────────── */
export function Timeline() {
  return (
    <div className="flex flex-col">
      {TIMELINE.map((row) => (
        <div key={row.year} className="grid grid-cols-[64px_1fr] gap-5 border-t border-border-subtle py-5 md:grid-cols-[120px_1fr]">
          <div className="font-display text-xl font-semibold text-accent">{row.year}</div>
          <p className="text-sm leading-relaxed text-foreground-secondary">
            {row.lead ? <span className="font-semibold text-foreground">{row.lead} </span> : null}
            {row.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Stats ───────────────────────────────────────────────────────────────── */
export function StatRow() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="bg-background p-6">
          <div className="font-display text-3xl font-semibold tracking-tight text-accent">{s.value}</div>
          <div className="mt-1 font-mono text-2xs uppercase tracking-widest text-foreground-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Carte d'article ─────────────────────────────────────────────────────── */
export function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden border border-border bg-background transition-colors hover:border-border-strong">
      {post.cover ? (
        <div className="aspect-[16/10] overflow-hidden bg-surface-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover.src}
            alt={post.cover.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-6">
        <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
          {post.categories[0] ? <span className="text-accent">{post.categories[0].name}</span> : null}
          <span>·</span>
          <span>{post.readingMinutes} min</span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-balance">{post.title}</h3>
        <p className="text-sm leading-relaxed text-foreground-secondary">{post.excerpt}</p>
        <div className="mt-auto pt-3 font-mono text-2xs text-foreground-muted">{formatPostDate(post.publishedAt)}</div>
      </div>
    </Link>
  );
}
