"use client";

/**
 * LaunchCalendarPanel — renders the launch/social Glory deliverables
 * (`launch-timeline-planner` + `content-calendar-strategist` + `naming-generator`
 * + `social-copy-engine` GloryOutputs) as a consumable cockpit surface, instead
 * of leaving them as dormant JSON in the vault. Read-only projection via
 * `trpc.glory.launchCalendar`. (Phase 24.)
 */

import { useState } from "react";
import { type LucideIcon, CalendarDays, Flag, Radio, Hash, Ban, CheckCircle2, Megaphone, Sparkles, AtSign, Quote, Link2, Star, ChevronDown, MessageSquareText, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import type { LaunchTimelineWeek, SocialNaming, SocialCopy, ContentPost } from "@/lib/types/launch-calendar";

/** Locale d'affichage des dates — source unique. */
const LOCALE = "fr-FR";

/**
 * Toute la copy de la surface — source unique de vérité, zéro littéral de
 * contenu dispersé dans le JSX (anti-hardcode NEFER). Les séparateurs purement
 * décoratifs (·, →, ›) et la ponctuation grammaticale restent inline.
 */
const COPY = {
  header: {
    kicker: "Plan de prélancement digital & social",
    title: "Le plan de lancement.",
    subtitle:
      "Go-to-market J-ancré, cadence éditoriale, hashtags et présence social — prêts à exécuter",
  },
  empty: {
    title: "Aucun plan de lancement dans le vault.",
    helpPrefix: "Lance les Glory tools",
    helpSuffix: "sur cette marque pour générer le plan.",
  },
  /** Slugs des Glory tools producteurs du plan (référence d'affichage). */
  tools: [
    "launch-timeline-planner",
    "content-calendar-strategist",
    "naming-generator",
    "social-copy-engine",
  ],
  sections: {
    timeline: "Rétroplanning",
    cadence: "Cadence éditoriale par canal",
    posts: "Calendrier de publication",
    overton: "Thèmes par phase Overton",
    hashtags: "Hashtags",
    doNot: "Interdits de marque",
    accounts: "Comptes recommandés",
    bios: "Bios & copy par plateforme",
    linkInBio: "Link-in-bio",
  },
  counts: {
    phases: (n: number) => `${n} phases`,
    posts: (n: number) => `${n} posts`,
    platforms: (n: number) => `${n} plateformes`,
    profiles: (n: number) => `${n} profils`,
  },
  hashtagKinds: { signature: "Signature", local: "Local" },
  labels: {
    availability: "À vérifier (dispo)",
    voice: "Voix",
    pinned: "Épinglé",
    angle: "Angle",
    caption: "Caption",
    illustration: "Brief illustration",
  },
  post: { titleFallback: "Publication" },
  /** Marqueur "valeur vide" — convention UI unique. */
  emptyMark: "—",
} as const;

function isGate(kpi: string): boolean {
  return /gate|go\s*\/\s*no[- ]?go/i.test(kpi);
}

export function LaunchCalendarPanel() {
  const strategyId = useCurrentStrategyId();
  const query = trpc.glory.launchCalendar.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  if (!strategyId) return <SkeletonPage />;

  const data = query.data;
  const timeline = data?.timeline ?? null;
  const calendar = data?.calendar ?? null;
  const naming = data?.naming ?? null;
  const social = data?.social ?? null;
  const brand = timeline?.brand ?? calendar?.brand ?? naming?.brandName ?? social?.brand ?? "";
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : null;
  const isEmpty = !query.isLoading && !timeline && !calendar && !naming && !social;

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header className="border-b border-border-subtle pb-6 mb-10">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted mb-3">
          <CalendarDays className="h-3.5 w-3.5 text-accent" />
          <span>{COPY.header.kicker}</span>
          {brand ? (<><span className="opacity-50">·</span><span>{brand}</span></>) : null}
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          {COPY.header.title}
        </h1>
        <p className="mt-3 text-foreground-secondary max-w-[62ch]" style={{ fontSize: "var(--text-lg)" }}>
          {COPY.header.subtitle}
          {generatedAt ? ` · ${generatedAt.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" })}` : ""}.
        </p>
      </header>

      {query.isLoading ? <SkeletonPage /> : null}

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-foreground-secondary">{COPY.empty.title}</p>
          <p className="mt-2 text-xs text-foreground-muted">
            {COPY.empty.helpPrefix}{" "}
            {COPY.tools.map((t, i) => (
              <span key={t}>
                {i > 0 ? (i === COPY.tools.length - 1 ? " et " : ", ") : ""}
                <strong>{t}</strong>
              </span>
            ))}{" "}
            {COPY.empty.helpSuffix}
          </p>
        </div>
      ) : null}

      {/* ═══ Rétroplanning (timeline) ═════════════════════════════ */}
      {timeline ? (
        <section className="mb-16">
          <SectionHeader icon={Flag} label={COPY.sections.timeline} suffix={COPY.counts.phases(timeline.weeks.length)} />
          <ol className="space-y-3">
            {timeline.weeks.map((w, i) => (
              <WeekRow key={`${w.semaine}-${i}`} week={w} isLast={i === timeline.weeks.length - 1} />
            ))}
          </ol>
        </section>
      ) : null}

      {/* ═══ Cadence éditoriale ═══════════════════════════════════ */}
      {calendar ? (
        <section className="space-y-12">
          {Object.keys(calendar.cadenceParCanal).length > 0 ? (
            <div>
              <SectionHeader icon={Radio} label={COPY.sections.cadence} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(calendar.cadenceParCanal).map(([canal, c]) => (
                  <div key={canal} className="rounded-lg border border-white/5 bg-surface-raised p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{canal}</span>
                      {c.rythme ? <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">{c.rythme}</span> : null}
                    </div>
                    {c.format ? <p className="mb-2 text-xs text-foreground-secondary">{c.format}</p> : null}
                    {(c.piliers.length > 0 || c.formats.length > 0) ? (
                      <ul className="space-y-1">
                        {[...c.piliers, ...c.formats].map((item, j) => (
                          <li key={j} className="flex gap-2 text-xs text-foreground-muted">
                            <span className="text-accent">·</span><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {calendar.posts.length > 0 ? (
            <div>
              <SectionHeader icon={CalendarDays} label={COPY.sections.posts} suffix={COPY.counts.posts(calendar.posts.length)} />
              <div className="space-y-6">
                {groupPostsByWeek(calendar.posts).map(([week, posts]) => (
                  <div key={week}>
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">{week}</div>
                    <ol className="space-y-1.5">
                      {posts.map((p, i) => (
                        <PostRow key={i} post={p} />
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {calendar.themesParPhaseOverton.length > 0 ? (
            <div>
              <SectionHeader icon={Sparkles} label={COPY.sections.overton} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {calendar.themesParPhaseOverton.map((p, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-surface-raised p-4">
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">{p.phase}</div>
                    <ul className="space-y-1.5">
                      {p.contenus.map((contenu, j) => (
                        <li key={j} className="flex gap-2 text-xs text-foreground-secondary">
                          <Megaphone className="mt-0.5 h-3 w-3 shrink-0 text-foreground-muted" /><span>{contenu}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(calendar.hashtags.signature.length > 0 || calendar.hashtags.local.length > 0) ? (
            <div>
              <SectionHeader icon={Hash} label={COPY.sections.hashtags} />
              <div className="space-y-3">
                {calendar.hashtags.signature.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{COPY.hashtagKinds.signature}</span>
                    {calendar.hashtags.signature.map((h) => (
                      <span key={h} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">{h}</span>
                    ))}
                  </div>
                ) : null}
                {calendar.hashtags.local.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{COPY.hashtagKinds.local}</span>
                    {calendar.hashtags.local.map((h) => (
                      <span key={h} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-foreground-secondary">{h}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {calendar.doNot.length > 0 ? (
            <div>
              <SectionHeader icon={Ban} label={COPY.sections.doNot} />
              <ul className="space-y-1.5">
                {calendar.doNot.map((d, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground-secondary">
                    <Ban className="mt-0.5 h-3 w-3 shrink-0 text-error" /><span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ═══ Présence social (handles + bios) ═════════════════════ */}
      {(naming || social) ? (
        <SocialPresence naming={naming} social={social} />
      ) : null}
    </article>
  );
}

function SocialPresence({ naming, social }: { naming: SocialNaming | null; social: SocialCopy | null }) {
  return (
    <section className="mt-16 space-y-12">
      {/* Comptes recommandés */}
      {naming && naming.handles.length > 0 ? (
        <div>
          <SectionHeader icon={AtSign} label={COPY.sections.accounts} suffix={COPY.counts.platforms(naming.handles.length)} />
          {naming.handleStrategy ? (
            <p className="mb-4 text-xs text-foreground-secondary max-w-[72ch]">{naming.handleStrategy}</p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {naming.handles.map((h) => (
              <div key={h.key} className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-surface-raised p-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{h.platform}</div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{h.value}</div>
                  {h.fallbacks.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {h.fallbacks.map((f) => (
                        <span key={f} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{f}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <CopyButton value={h.value} label="" />
              </div>
            ))}
          </div>
          {naming.availabilityToVerify.length > 0 ? (
            <p className="mt-3 text-[11px] text-foreground-muted">
              <span className="font-semibold">{COPY.labels.availability}&nbsp;:</span> {naming.availabilityToVerify.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Bios par plateforme */}
      {social && social.profiles.length > 0 ? (
        <div>
          <SectionHeader icon={Quote} label={COPY.sections.bios} suffix={COPY.counts.profiles(social.profiles.length)} />
          {social.voice ? (
            <p className="mb-4 text-xs italic text-foreground-secondary max-w-[72ch]">{COPY.labels.voice}&nbsp;: {social.voice}</p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {social.profiles.map((p, i) => {
              const copyText = [p.displayName, p.handle, p.bio ?? p.shortDescription ?? p.about].filter(Boolean).join("\n");
              return (
                <div key={`${p.platform}-${i}`} className="rounded-lg border border-white/5 bg-surface-raised p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.platform}</span>
                    <div className="flex items-center gap-2">
                      {p.priority ? <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">{p.priority}</span> : null}
                      {copyText ? <CopyButton value={copyText} label="" /> : null}
                    </div>
                  </div>
                  {p.displayName ? <div className="text-xs font-medium text-foreground-secondary">{p.displayName}</div> : null}
                  {p.handle ? <div className="font-mono text-[11px] text-accent">{p.handle}</div> : null}
                  {(p.bio ?? p.about ?? p.shortDescription) ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-foreground-secondary leading-relaxed">{p.bio ?? p.about ?? p.shortDescription}</p>
                  ) : null}
                  {p.fullDescription ? (
                    <p className="mt-2 whitespace-pre-wrap text-[11px] text-foreground-muted leading-relaxed">{p.fullDescription}</p>
                  ) : null}
                  {p.highlights.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.highlights.map((h) => (
                        <span key={h} className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                          <Star className="h-2.5 w-2.5" />{h}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {p.keywords.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.keywords.map((k) => (
                        <span key={k} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{k}</span>
                      ))}
                    </div>
                  ) : null}
                  {(p.pinned || p.contentAngle) ? (
                    <p className="mt-2 text-[11px] text-foreground-muted">
                      {p.pinned ? <><span className="font-semibold">{COPY.labels.pinned}&nbsp;:</span> {p.pinned}</> : null}
                      {p.pinned && p.contentAngle ? " · " : null}
                      {p.contentAngle ? <><span className="font-semibold">{COPY.labels.angle}&nbsp;:</span> {p.contentAngle}</> : null}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Link-in-bio */}
      {social?.linkInBio?.recommendation ? (
        <div>
          <SectionHeader icon={Link2} label={COPY.sections.linkInBio} />
          <div className="rounded-lg border border-white/5 bg-surface-raised p-4">
            <p className="text-xs text-foreground-secondary"><span className="text-accent">→</span> {social.linkInBio.recommendation}</p>
            {social.linkInBio.avoid ? (
              <p className="mt-1.5 flex gap-2 text-[11px] text-foreground-muted"><Ban className="mt-0.5 h-3 w-3 shrink-0 text-error" /><span>{social.linkInBio.avoid}</span></p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SectionHeader({ icon: Icon, label, suffix }: { icon: LucideIcon; label: string; suffix?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Icon className="h-4 w-4 text-accent" />
      <h2 className="font-display font-semibold tracking-tight text-foreground" style={{ fontSize: "var(--text-xl)" }}>{label}</h2>
      <div className="h-px flex-1 bg-border-subtle" />
      {suffix ? <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{suffix}</span> : null}
    </div>
  );
}

function WeekRow({ week, isLast }: { week: LaunchTimelineWeek; isLast: boolean }) {
  const gate = isGate(week.kpi);
  return (
    <li className="relative flex gap-4 rounded-lg border border-white/5 bg-surface-raised p-4">
      {/* Rail */}
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
          {week.semaine}
        </div>
        {!isLast ? <div className="mt-1 w-px flex-1 bg-border-subtle" /> : null}
      </div>
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{week.dates}</span>
          {week.theme ? (<><span className="opacity-40">·</span><span className="font-serif text-xs italic text-foreground-secondary">{week.theme}</span></>) : null}
        </div>
        <p className="text-sm font-semibold text-foreground">{week.phase}</p>

        {week.kpi ? (
          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${gate ? "bg-accent/15 font-semibold text-accent" : "bg-white/5 text-foreground-muted"}`}>
            <Flag className="h-3 w-3" />{week.kpi}
          </div>
        ) : null}

        {week.canaux.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {week.canaux.map((c) => (
              <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{c}</span>
            ))}
          </div>
        ) : null}

        {week.actions.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {week.actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground-secondary">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" /><span>{a}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {week.opsDigitales.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5">
            {week.opsDigitales.map((o, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-foreground-muted">
                <span className="text-foreground-muted/50">›</span><span>{o}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/** Une ligne de post cliquable → déplie la caption + le brief illustration. */
function PostRow({ post }: { post: ContentPost }) {
  const [open, setOpen] = useState(false);
  const caption = post.caption ?? "";
  const title = post.theme ?? post.angle ?? post.format ?? COPY.post.titleFallback;
  return (
    <li className="overflow-hidden rounded-lg border border-white/5 bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="w-28 shrink-0 font-mono text-[10px] text-foreground-muted">{post.weekday} {formatPostDate(post.date)}</span>
        <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">{post.platform}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground-secondary">{title}</span>
        {post.format ? <span className="hidden shrink-0 text-[10px] text-foreground-muted md:inline">{post.format}</span> : null}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/5 px-3 py-3">
          {/* Méta */}
          <div className="flex flex-wrap items-center gap-2">
            {post.week ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{post.week}</span> : null}
            {post.format ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{post.format}</span> : null}
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{post.status}</span>
            {post.angle ? <span className="text-[10px] italic text-foreground-secondary">{COPY.labels.angle} : {post.angle}</span> : null}
          </div>

          {/* Caption */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                <MessageSquareText className="h-3 w-3" /> {COPY.labels.caption}
              </span>
              {caption ? <CopyButton value={caption} label="" /> : null}
            </div>
            <p className="whitespace-pre-wrap rounded-md bg-white/[0.02] p-3 text-xs leading-relaxed text-foreground-secondary">{caption || COPY.emptyMark}</p>
          </div>

          {/* Illustration */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                <ImageIcon className="h-3 w-3" /> {COPY.labels.illustration}
              </span>
              {post.illustration ? <CopyButton value={post.illustration} label="" /> : null}
            </div>
            <p className="rounded-md bg-white/[0.02] p-3 text-xs leading-relaxed text-foreground-secondary">{post.illustration ?? COPY.emptyMark}</p>
          </div>

          {/* Hashtags */}
          {post.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {post.hashtags.map((h) => (
                <span key={h} className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">{h}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
}

function groupPostsByWeek(posts: ContentPost[]): Array<[string, ContentPost[]]> {
  const groups = new Map<string, ContentPost[]>();
  for (const p of posts) {
    const key = p.week ?? COPY.emptyMark;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}
