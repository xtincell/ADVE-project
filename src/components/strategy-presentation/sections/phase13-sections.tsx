"use client";

/**
 * Phase 13 — Oracle 35-section UI components (B5, ADR-0014)
 *
 * 14 composants pour les sections étendues de l'Oracle :
 * - 7 Big4 baseline (data-dense, neutre)
 * - 5 Distinctifs (mise en avant, tokens domain pillar/tier/classification)
 * - 2 Dormants (Banner "Dormant — pré-réservé Imhotep/Anubis ADR-0017/0018")
 *
 * **Design System Phase 11 strict** (cf. CLAUDE.md §"DS three forbiddens") :
 * - Composition primitives `src/components/primitives/` uniquement
 * - Tokens cascade Component + Domain (jamais Reference --ref-*)
 * - CVA pour variants (jamais .join(" ") inline)
 * - Aucune classe Tailwind couleur brute (text-zinc-*, bg-violet-*, hex direct)
 *
 * APOGEE : Sous-système Guidance (Mission #2). Pilier 6 (Layer 6 components)
 * consomme uniquement via tRPC ; les sections lisent leur data depuis
 * StrategyPresentationDocument assemblé serveur-side (B4 writeback).
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Banner,
  Heading,
  Text,
  Stack,
  Grid,
  Separator,
  Progress,
  Tag,
} from "@/components/primitives";

// ─── Variants section tier (CVA — DS Phase 11 obligatoire) ──────────────────

export const phase13SectionVariants = cva("space-y-[var(--space-4)]", {
  variants: {
    tier: {
      BIG4_BASELINE: "",
      DISTINCTIVE: "",
      DORMANT: "opacity-[var(--opacity-dormant,0.7)]",
    },
  },
  defaultVariants: { tier: "BIG4_BASELINE" },
});

export type Phase13SectionTier = NonNullable<
  VariantProps<typeof phase13SectionVariants>["tier"]
>;

// ─── Generic display helpers ────────────────────────────────────────────────

interface SectionShellProps {
  tier: Phase13SectionTier;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionShell({ tier, title, description, children }: SectionShellProps) {
  return (
    <div className={phase13SectionVariants({ tier })}>
      <Card surface={tier === "DISTINCTIVE" ? "elevated" : "raised"}>
        <CardHeader>
          <Stack direction="row" align="center" justify="between" gap={2}>
            <CardTitle>{title}</CardTitle>
            <SectionTierBadge tier={tier} />
          </Stack>
          {description ? (
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          ) : null}
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card>
    </div>
  );
}

function SectionTierBadge({ tier }: { tier: Phase13SectionTier }) {
  if (tier === "DISTINCTIVE") {
    return <Badge tone="accent">Distinctif La Fusée</Badge>;
  }
  if (tier === "DORMANT") {
    return <Badge tone="neutral">Dormant — pré-réservé</Badge>;
  }
  return <Badge tone="neutral">Big4 baseline</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <Text variant="body" tone="muted">
      {message}
    </Text>
  );
}

function KeyValueGrid({ entries }: { entries: Array<[string, React.ReactNode]> }) {
  if (entries.length === 0) return null;
  return (
    <Grid cols={2} gap={3}>
      {entries.map(([k, v]) => (
        <Stack key={k} direction="col" gap={1}>
          <Text variant="caption" tone="muted">
            {k}
          </Text>
          <Text variant="body">{v}</Text>
        </Stack>
      ))}
    </Grid>
  );
}

// ─── Type relax Phase 13 (data structurelle issue de B4 writeback) ──────────

type Phase13SectionData = Record<string, unknown>;

interface Props {
  data: Phase13SectionData;
}

// ═══════════════════════════════════════════════════════════════════════════
// BIG4 BASELINE (7) — frameworks consulting one-shot, data-dense neutre
// ═══════════════════════════════════════════════════════════════════════════

export function Mckinsey7s({ data }: Props) {
  const sevenS = (data.mckinsey7s ?? data) as Record<string, { state?: string; gap?: string; recommendation?: string; score?: number }>;
  const dimensions = ["strategy", "structure", "systems", "shared_values", "style", "staff", "skills"];
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="McKinsey 7S Framework"
      description="Diagnostic structuré 7 dimensions — alignement et gaps vs APOGEE target."
    >
      {sevenS && Object.keys(sevenS).length > 0 ? (
        <Stack direction="col" gap={3}>
          {dimensions.map((d) => {
            const dim = sevenS[d];
            if (!dim) return null;
            return (
              <Card key={d} surface="outlined">
                <CardBody>
                  <Stack direction="row" align="center" justify="between" gap={2}>
                    <Heading level={4}>{d.replace("_", " ")}</Heading>
                    {dim.score !== undefined ? <Badge tone="neutral">{dim.score}/10</Badge> : null}
                  </Stack>
                  {dim.state ? <Text variant="body">{dim.state}</Text> : null}
                  {dim.gap ? (
                    <Text variant="caption" tone="muted">
                      Gap : {dim.gap}
                    </Text>
                  ) : null}
                  {dim.recommendation ? (
                    <Text variant="caption">→ {dim.recommendation}</Text>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <EmptyState message="Section non encore enrichie. Lance un enrich-oracle pour produire le 7S." />
      )}
    </SectionShell>
  );
}

export function BcgPortfolio({ data }: Props) {
  const portfolio = (data.bcgPortfolio ?? null) as Record<string, unknown[]> | null;
  const health = data.bcgHealthScore as number | undefined;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="BCG Growth-Share Matrix"
      description="Portefeuille business — 4 quadrants (Stars / Cash Cows / Question Marks / Dogs)."
    >
      {portfolio ? (
        <Stack direction="col" gap={3}>
          {health !== undefined ? (
            <Stack direction="row" align="center" gap={2}>
              <Text variant="caption" tone="muted">
                Portfolio health score
              </Text>
              <Progress value={health} max={100} />
              <Badge tone="accent">{health}</Badge>
            </Stack>
          ) : null}
          <Grid cols={2} gap={3}>
            {(["stars", "cash_cows", "question_marks", "dogs"] as const).map((q) => {
              const items = portfolio[q] ?? [];
              return (
                <Card key={q} surface="outlined">
                  <CardHeader>
                    <CardTitle>{q.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Text variant="caption" tone="muted">
                      {items.length} BU
                    </Text>
                    <Stack direction="col" gap={1}>
                      {items.slice(0, 5).map((bu, i) => (
                        <Text key={i} variant="caption">
                          • {typeof bu === "string" ? bu : (bu as { name?: string }).name ?? "Unnamed"}
                        </Text>
                      ))}
                    </Stack>
                  </CardBody>
                </Card>
              );
            })}
          </Grid>
        </Stack>
      ) : (
        <EmptyState message="Portfolio non encore tracé. Le bouton 'Forge now' permet de générer un deck Figma associé (B8)." />
      )}
    </SectionShell>
  );
}

export function BainNps({ data }: Props) {
  const nps = (data.bainNps ?? null) as { score?: number; promoters?: number; drivers?: { promoters?: string[]; detractors?: string[] } } | null;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="Bain Net Promoter System"
      description="NPS calculation + segmentation Promoters/Passives/Detractors + cohort drift."
    >
      {nps ? (
        <Stack direction="col" gap={3}>
          <KeyValueGrid
            entries={[
              ["NPS Score", <Badge key="s" tone="accent">{nps.score ?? "—"}</Badge>],
              ["Promoters", `${nps.promoters ?? "—"}%`],
            ]}
          />
          {nps.drivers ? (
            <Grid cols={2} gap={3}>
              <Stack direction="col" gap={1}>
                <Heading level={5}>Drivers Promoters</Heading>
                {(nps.drivers.promoters ?? []).map((d, i) => (
                  <Text key={i} variant="caption">+ {d}</Text>
                ))}
              </Stack>
              <Stack direction="col" gap={1}>
                <Heading level={5}>Drivers Detractors</Heading>
                {(nps.drivers.detractors ?? []).map((d, i) => (
                  <Text key={i} variant="caption">- {d}</Text>
                ))}
              </Stack>
            </Grid>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="NPS non encore calculé." />
      )}
    </SectionShell>
  );
}

export function DeloitteGreenhouse({ data }: Props) {
  const dg = data.deloitteGreenhouse as Record<string, unknown> | null;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="Deloitte Greenhouse — Talent Program"
      description="Programme talent + benchmark équipe + culture marque."
    >
      {dg ? (
        <KeyValueGrid
          entries={Object.entries(dg).map(([k, v]) => [
            k,
            typeof v === "string" ? v : JSON.stringify(v).slice(0, 80),
          ])}
        />
      ) : (
        <EmptyState message="Greenhouse program non encore généré." />
      )}
    </SectionShell>
  );
}

export function Mckinsey3Horizons({ data }: Props) {
  const m3h = data.mckinsey3Horizons as { h1?: unknown; h2?: unknown; h3?: unknown; allocation?: Record<string, number> } | null;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="McKinsey Three Horizons of Growth"
      description="H1 core / H2 emerging / H3 transformational."
    >
      {m3h ? (
        <Stack direction="col" gap={3}>
          {m3h.allocation ? (
            <Stack direction="row" align="center" gap={3}>
              {Object.entries(m3h.allocation).map(([k, v]) => (
                <Tag key={k}>
                  {k}: {v}%
                </Tag>
              ))}
            </Stack>
          ) : null}
          <Grid cols={3} gap={3}>
            {(["h1", "h2", "h3"] as const).map((h) => (
              <Card key={h} surface="outlined">
                <CardHeader>
                  <CardTitle>{h.toUpperCase()}</CardTitle>
                </CardHeader>
                <CardBody>
                  <Text variant="caption">
                    {m3h[h] ? JSON.stringify(m3h[h]).slice(0, 120) : "—"}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Stack>
      ) : (
        <EmptyState message="3-Horizons non encore mappé. Bouton 'Forge now' peut générer un deck Figma (B8)." />
      )}
    </SectionShell>
  );
}

export function BcgStrategyPalette({ data }: Props) {
  const palette = data.bcgStrategyPalette as Record<string, unknown> | null;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="BCG Strategy Palette"
      description="5 environnements stratégiques (Classical / Adaptive / Visionary / Shaping / Renewal)."
    >
      {palette ? (
        <Text variant="body">
          {typeof palette === "object" ? JSON.stringify(palette).slice(0, 300) : String(palette)}
        </Text>
      ) : (
        <EmptyState message="Strategy palette non encore générée." />
      )}
    </SectionShell>
  );
}

export function DeloitteBudget({ data }: Props) {
  const budget = data.deloitteBudget as Record<string, unknown> | null;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="Deloitte Budget Framework"
      description="Budget consolidation + allocation par livrable + alternatives économiques."
    >
      {budget ? (
        <KeyValueGrid
          entries={Object.entries(budget).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v).slice(0, 80)])}
        />
      ) : (
        <EmptyState message="Budget framework non encore consolidé." />
      )}
    </SectionShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DISTINCTIFS (5) — valeur ajoutée La Fusée vs Big4
// ═══════════════════════════════════════════════════════════════════════════

export function CultIndex({ data }: Props) {
  const ci = data.cultIndex as { score?: number; tier?: string; components?: Record<string, number> } | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Cult Index — Score de masse culturelle"
      description="Score composite Devotion + Rituals + Vocabulary + Enemy + Manifesto. Distinctif La Fusée vs frameworks Big4."
    >
      {ci ? (
        <Stack direction="col" gap={3}>
          <Stack direction="row" align="center" gap={3}>
            <Heading level={2}>{ci.score ?? "—"}</Heading>
            {ci.tier ? <Badge tone="accent">{ci.tier}</Badge> : null}
          </Stack>
          <Separator />
          {ci.components ? (
            <Grid cols={2} gap={2}>
              {Object.entries(ci.components).map(([k, v]) => (
                <Stack key={k} direction="row" align="center" gap={2}>
                  <Text variant="caption" tone="muted">
                    {k}
                  </Text>
                  <Progress value={v} max={100} />
                </Stack>
              ))}
            </Grid>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Cult Index non encore calculé. Le pipeline invoque cult-index-engine SESHAT." />
      )}
    </SectionShell>
  );
}

export function ManipulationMatrix({ data }: Props) {
  const mm = data.manipulationMatrix as { evaluations?: unknown[]; summary?: Record<string, unknown> } | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Manipulation Matrix — 4 modes d'engagement"
      description="Peddler / Dealer / Facilitator / Entertainer — comment la marque transforme l'audience en propellant superfan."
    >
      {mm ? (
        <Stack direction="col" gap={3}>
          <Grid cols={4} gap={2}>
            {(["peddler", "dealer", "facilitator", "entertainer"] as const).map((mode) => (
              <Card key={mode} surface="outlined">
                <CardBody>
                  <Heading level={5}>{mode}</Heading>
                  <Text variant="caption" tone="muted">
                    {mm.summary && (mm.summary as Record<string, unknown>)[mode]
                      ? String((mm.summary as Record<string, unknown>)[mode]).slice(0, 60)
                      : "—"}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </Grid>
          <Banner tone="neutral">
            Visualisation matrice forgeable via bouton &quot;Forge now&quot; (B8) — Magnific Banana KV.
          </Banner>
        </Stack>
      ) : (
        <EmptyState message="Manipulation Matrix non encore évaluée." />
      )}
    </SectionShell>
  );
}

export function DevotionLadder({ data }: Props) {
  const dl = data.devotionLadder as Record<string, unknown> | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Devotion Ladder — Hiérarchie superfans"
      description="Visiteur → Suiveur → Fan → Superfan → Ambassadeur. Échelle de progression devotion La Fusée."
    >
      {dl ? (
        <Text variant="body">{JSON.stringify(dl).slice(0, 300)}</Text>
      ) : (
        <EmptyState message="Devotion Ladder non encore mappée — séquence DEVOTION-LADDER en cours de refactor (B5+ post-merge)." />
      )}
    </SectionShell>
  );
}

export function OvertonDistinctive({ data }: Props) {
  const od = data.overtonDistinctive as { axes?: Array<{ name?: string; current_position?: string; target_position?: string; gap?: string }>; maneuvers?: unknown[] } | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Overton Distinctive — Position fenêtre culturelle"
      description="Mapping Overton sectoriel + position actuelle + cible APOGEE + manœuvres pour déplacer la fenêtre."
    >
      {od && od.axes ? (
        <Stack direction="col" gap={3}>
          {od.axes.map((axis, i) => (
            <Card key={i} surface="outlined">
              <CardBody>
                <Stack direction="row" align="center" gap={2}>
                  <Heading level={5}>{axis.name ?? `Axe ${i + 1}`}</Heading>
                  <Badge tone="neutral">{axis.current_position ?? "—"}</Badge>
                  <Text variant="caption">→</Text>
                  <Badge tone="accent">{axis.target_position ?? "—"}</Badge>
                </Stack>
                {axis.gap ? (
                  <Text variant="caption" tone="muted">
                    Gap : {axis.gap}
                  </Text>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Overton mapping non encore généré." />
      )}
    </SectionShell>
  );
}

export function TarsisWeakSignals({ data }: Props) {
  const tarsis = data.tarsisWeakSignals as { signals?: Array<{ description?: string; category?: string; impact?: number; horizon?: string; action?: string; confidence?: number }>; top3?: unknown[] } | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Tarsis — Signaux faibles sectoriels"
      description="Détection signaux faibles via seshat/tarsis + scoring impact + horizon J+30/90/180/365+."
    >
      {tarsis && tarsis.signals ? (
        <Stack direction="col" gap={2}>
          {tarsis.signals.slice(0, 8).map((s, i) => (
            <Card key={i} surface="outlined">
              <CardBody>
                <Stack direction="row" align="center" justify="between" gap={2}>
                  <Stack direction="col" gap={1}>
                    <Text variant="body">{s.description ?? "—"}</Text>
                    <Stack direction="row" gap={2}>
                      {s.category ? <Tag>{s.category}</Tag> : null}
                      {s.horizon ? <Tag>{s.horizon}</Tag> : null}
                      {s.action ? <Tag>{s.action}</Tag> : null}
                    </Stack>
                  </Stack>
                  {s.impact !== undefined ? (
                    <Badge tone={s.impact > 5 ? "accent" : "neutral"}>
                      Impact {s.impact}
                    </Badge>
                  ) : null}
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Aucun signal faible Tarsis détecté pour l'instant." />
      )}
    </SectionShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DORMANT (2) — Imhotep + Anubis pré-réservés Oracle-stub (B9 + ADRs 0017/0018)
// ═══════════════════════════════════════════════════════════════════════════

export function ImhotepCrewProgramDormant({ data }: Props) {
  const placeholder = data.imhotepCrewProgramPlaceholder as string | undefined;
  return (
    <SectionShell
      tier="DORMANT"
      title="Crew Program — Imhotep (pré-réservé)"
      description="Section dormante. Activation Phase 7+ (ADR-0010 Imhotep Crew Programs)."
    >
      <Banner tone="neutral">
        <Stack direction="col" gap={1}>
          <Text variant="body">
            <strong>Sortie partielle Oracle-only</strong> — Imhotep reste pré-réservé dans le panthéon
            Neteru (cap 7 BRAINS respecté). Cette section affiche un placeholder en attendant
            l&apos;activation complète du sous-système Crew Programs.
          </Text>
          <Text variant="caption" tone="muted">
            ADR-0010 (pré-réserve) + ADR-0017 (sortie partielle Oracle-stub).
          </Text>
        </Stack>
      </Banner>
      {placeholder ? (
        <Text variant="caption" tone="muted">
          {placeholder}
        </Text>
      ) : null}
    </SectionShell>
  );
}

export function AnubisCommsDormant({ data }: Props) {
  const placeholder = data.anubisCommsPlaceholder as string | undefined;
  return (
    <SectionShell
      tier="DORMANT"
      title="Plan Comms — Anubis (pré-réservé)"
      description="Section dormante. Activation Phase 8+ (ADR-0011 Anubis Comms)."
    >
      <Banner tone="neutral">
        <Stack direction="col" gap={1}>
          <Text variant="body">
            <strong>Sortie partielle Oracle-only</strong> — Anubis reste pré-réservé dans le panthéon
            Neteru (cap 7 BRAINS respecté). Cette section affiche un placeholder en attendant
            l&apos;activation complète du sous-système Comms (broadcast, notifications, ad-networks).
          </Text>
          <Text variant="caption" tone="muted">
            ADR-0011 (pré-réserve) + ADR-0018 (sortie partielle Oracle-stub).
          </Text>
        </Stack>
      </Banner>
      {placeholder ? (
        <Text variant="caption" tone="muted">
          {placeholder}
        </Text>
      ) : null}
    </SectionShell>
  );
}
