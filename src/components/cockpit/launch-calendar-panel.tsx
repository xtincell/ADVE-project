"use client";

/**
 * LaunchCalendarPanel — renders the launch/social Glory deliverables
 * (`launch-timeline-planner` + `content-calendar-strategist` + `naming-generator`
 * + `social-copy-engine` GloryOutputs) as a consumable cockpit surface, instead
 * of leaving them as dormant JSON in the vault. Read-only projection via
 * `trpc.glory.launchCalendar`. (Phase 24.)
 */

import { type LucideIcon, CalendarDays, Flag, Radio, Hash, Ban, CheckCircle2, Megaphone, Sparkles, AtSign, Quote, Link2, Star } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import type { LaunchTimelineWeek, SocialNaming, SocialCopy } from "@/lib/types/launch-calendar";

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
          <span>Plan de prélancement digital &amp; social</span>
          {brand ? (<><span className="opacity-50">·</span><span>{brand}</span></>) : null}
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          Le plan de lancement.
        </h1>
        <p className="mt-3 text-foreground-secondary max-w-[62ch]" style={{ fontSize: "var(--text-lg)" }}>
          Go-to-market J-ancré, cadence éditoriale, hashtags et présence social — prêts à exécuter
          {generatedAt ? ` · ${generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
        </p>
      </header>

      {query.isLoading ? <SkeletonPage /> : null}

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-foreground-secondary">Aucun plan de lancement dans le vault.</p>
          <p className="mt-2 text-xs text-foreground-muted">
            Lance les Glory tools <strong>launch-timeline-planner</strong>, <strong>content-calendar-strategist</strong>, <strong>naming-generator</strong> et <strong>social-copy-engine</strong> sur cette marque pour générer le plan.
          </p>
        </div>
      ) : null}

      {/* ═══ Rétroplanning (timeline) ═════════════════════════════ */}
      {timeline ? (
        <section className="mb-16">
          <SectionHeader icon={Flag} label="Rétroplanning" suffix={`${timeline.weeks.length} phases`} />
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
              <SectionHeader icon={Radio} label="Cadence éditoriale par canal" />
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

          {calendar.themesParPhaseOverton.length > 0 ? (
            <div>
              <SectionHeader icon={Sparkles} label="Thèmes par phase Overton" />
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
              <SectionHeader icon={Hash} label="Hashtags" />
              <div className="space-y-3">
                {calendar.hashtags.signature.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">Signature</span>
                    {calendar.hashtags.signature.map((h) => (
                      <span key={h} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">{h}</span>
                    ))}
                  </div>
                ) : null}
                {calendar.hashtags.local.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">Local</span>
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
              <SectionHeader icon={Ban} label="Interdits de marque" />
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
          <SectionHeader icon={AtSign} label="Comptes recommandés" suffix={`${naming.handles.length} plateformes`} />
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
              <span className="font-semibold">À vérifier (dispo)&nbsp;:</span> {naming.availabilityToVerify.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Bios par plateforme */}
      {social && social.profiles.length > 0 ? (
        <div>
          <SectionHeader icon={Quote} label="Bios & copy par plateforme" suffix={`${social.profiles.length} profils`} />
          {social.voice ? (
            <p className="mb-4 text-xs italic text-foreground-secondary max-w-[72ch]">Voix&nbsp;: {social.voice}</p>
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
                      {p.pinned ? <><span className="font-semibold">Épinglé&nbsp;:</span> {p.pinned}</> : null}
                      {p.pinned && p.contentAngle ? " · " : null}
                      {p.contentAngle ? <><span className="font-semibold">Angle&nbsp;:</span> {p.contentAngle}</> : null}
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
          <SectionHeader icon={Link2} label="Link-in-bio" />
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
