"use client";

/**
 * Phase 13 — Oracle 35-section UI components (B5, ADR-0014)
 * Phase 17 cleanup — sections Imhotep/Anubis promues CORE (ADR-0045).
 *
 * 14 composants pour les sections étendues de l'Oracle :
 * - 7 Big4 baseline (data-dense, neutre)
 * - 5 Distinctifs (mise en avant, tokens domain pillar/tier/classification)
 * - 2 Neteru actifs Ground Tier : Imhotep Crew Program (Phase 14, ADR-0019)
 *   + Anubis Plan Comms (Phase 15, ADR-0020)
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
import { PtahForgeButton } from "@/components/neteru/ptah-forge-button";
import { DevotionPyramid } from "../shared/devotion-pyramid";

// ─── Variants section tier (CVA — DS Phase 11 obligatoire) ──────────────────

export const phase13SectionVariants = cva("space-y-[var(--space-4)]", {
  variants: {
    tier: {
      CORE: "",
      BIG4_BASELINE: "",
      DISTINCTIVE: "",
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
  if (tier === "CORE") {
    return <Badge tone="neutral">Core</Badge>;
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
            {humanizeKey(k)}
          </Text>
          <Text variant="body">{v}</Text>
        </Stack>
      ))}
    </Grid>
  );
}

/** Format snake/camelCase storage keys to human labels: `seven_s_map` →
 * `Seven s map`, `riskScore` → `Risk score`. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Recursive structured renderer — replaces `JSON.stringify` placeholders.
 * Strips `_*` debug keys, renders arrays as bullets, scalars inline,
 * objects as nested key/value blocks. Depth-limited to avoid overwhelming
 * walls of nested content. */
function StructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <Text variant="caption" tone="muted">—</Text>;
  }
  if (typeof value === "string") return <Text variant="body">{value}</Text>;
  if (typeof value === "number") return <Text variant="body">{value.toLocaleString()}</Text>;
  if (typeof value === "boolean") return <Text variant="body">{value ? "Oui" : "Non"}</Text>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text variant="caption" tone="muted">—</Text>;
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <Stack direction="col" gap={1}>
          {value.map((v, i) => (
            <Text key={i} variant="body">• {String(v)}</Text>
          ))}
        </Stack>
      );
    }
    return (
      <Stack direction="col" gap={2}>
        {value.slice(0, 8).map((v, i) => (
          <Card key={i} surface="outlined">
            <CardBody>
              <StructuredValue value={v} depth={depth + 1} />
            </CardBody>
          </Card>
        ))}
      </Stack>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("_"),
    );
    if (entries.length === 0) return <Text variant="caption" tone="muted">—</Text>;
    // Audit galileo : à profondeur, ne plus afficher des boîtes vides « N champs »
    // (qui apparaissaient à la place des tableaux d'objets) — rendre plutôt un
    // résumé inline des valeurs scalaires réelles.
    if (depth >= 3) {
      const scalars = entries.filter(
        ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean",
      );
      if (scalars.length > 0) {
        return (
          <Text variant="caption" tone="muted">
            {scalars.map(([k, v]) => `${humanizeKey(k)} : ${String(v)}`).join(" · ")}
          </Text>
        );
      }
      return <Text variant="caption" tone="muted">—</Text>;
    }
    return (
      <Stack direction="col" gap={2}>
        {entries.map(([k, v]) => (
          <Stack key={k} direction="col" gap={1}>
            <Text variant="caption" tone="muted">{humanizeKey(k)}</Text>
            <StructuredValue value={v} depth={depth + 1} />
          </Stack>
        ))}
      </Stack>
    );
  }
  return <Text variant="body">{String(value)}</Text>;
}

// ─── Type relax Phase 13 (data structurelle issue de B4 writeback) ──────────

type Phase13SectionData = Record<string, unknown>;

interface Props {
  data: Phase13SectionData;
  /** Phase 13 (B8) — Required by Ptah forge buttons. Propagated by presentation-layout. */
  strategyId?: string;
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
      description="Diagnostic structuré 7 dimensions — alignement et écarts vs trajectoire cible."
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
        <EmptyState message="Analyse 7S à produire — déclarer la vision stratégique (S), l'équipe dirigeante (A) et le catalogue d'actions (I)." />
      )}
    </SectionShell>
  );
}

export function BcgPortfolio({ data, strategyId }: Props) {
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
        <EmptyState message="Portefeuille de marques non encore tracé. Un visuel de présentation associé peut être généré à la demande." />
      )}
      {strategyId && portfolio ? (
        <Stack direction="row" justify="end" gap={2}>
          <PtahForgeButton
            strategyId={strategyId}
            sectionId="bcg-portfolio"
            brandAssetKind="BCG_PORTFOLIO"
            forgeKind="design"
            providerHint="figma"
            modelHint="deck"
            label="Forger Portfolio Figma"
          />
        </Stack>
      ) : null}
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
  const dg = (data.deloitteGreenhouse ?? data) as {
    team_profiles?: Array<{ nom?: string; role?: string | null; competences?: string[] }>;
    complementarity_score?: number;
    execution_capacity?: string;
    skill_gaps?: string[];
  } | null;
  const profiles = Array.isArray(dg?.team_profiles) ? dg.team_profiles : [];
  const score = typeof dg?.complementarity_score === "number" ? dg.complementarity_score : null;
  const capacity = typeof dg?.execution_capacity === "string" ? dg.execution_capacity : "";
  const gaps = Array.isArray(dg?.skill_gaps) ? dg.skill_gaps : [];
  const hasAny = profiles.length > 0 || score !== null || capacity || gaps.length > 0;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="Deloitte Greenhouse — Talent Program"
      description="Programme talent + benchmark équipe + culture marque."
    >
      {hasAny ? (
        <Stack direction="col" gap={3}>
          {score !== null || capacity ? (
            <Stack direction="row" align="center" gap={3}>
              {score !== null ? (
                <Stack direction="row" align="center" gap={2}>
                  <Text variant="caption" tone="muted">Complémentarité</Text>
                  <Progress value={score} max={10} />
                  <Badge tone="accent">{score}/10</Badge>
                </Stack>
              ) : null}
              {capacity ? <Tag>{capacity}</Tag> : null}
            </Stack>
          ) : null}
          {profiles.length > 0 ? (
            <Grid cols={2} gap={3}>
              {profiles.map((p, i) => (
                <Card key={i} surface="outlined">
                  <CardBody>
                    <Stack direction="col" gap={1}>
                      <Heading level={5}>{p.nom || `Profil ${i + 1}`}</Heading>
                      {p.role ? <Text variant="caption" tone="muted">{p.role}</Text> : null}
                      {Array.isArray(p.competences) && p.competences.length > 0 ? (
                        <Stack direction="row" gap={1}>
                          {p.competences.map((c) => <Tag key={c}>{c}</Tag>)}
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          ) : null}
          {gaps.length > 0 ? (
            <Stack direction="col" gap={1}>
              <Heading level={5}>Gaps de compétences</Heading>
              {gaps.map((g, i) => <Text key={i} variant="caption">• {g}</Text>)}
            </Stack>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Greenhouse program non encore renseigné — déclarer l'équipe dirigeante (pilier A) ou la teamStructure (pilier I/S)." />
      )}
    </SectionShell>
  );
}

export function Mckinsey3Horizons({ data, strategyId }: Props) {
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
                  <StructuredValue value={m3h[h]} />
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Stack>
      ) : (
        <EmptyState message="Trois Horizons non encore cartographiés — déclarer les initiatives (pilier I) et la vision stratégique (pilier S)." />
      )}
      {strategyId && m3h ? (
        <Stack direction="row" justify="end" gap={2}>
          <PtahForgeButton
            strategyId={strategyId}
            sectionId="mckinsey-3-horizons"
            brandAssetKind="MCK_3H"
            forgeKind="design"
            providerHint="figma"
            modelHint="deck"
            label="Forger 3-Horizons Deck"
          />
        </Stack>
      ) : null}
    </SectionShell>
  );
}

export function BcgStrategyPalette({ data }: Props) {
  const palette = (data.bcgStrategyPalette ?? data) as {
    environnement?: string;
    approche_recommandee?: string;
    signaux_utilises?: { tendances_macro?: number; signaux_faibles?: number; concurrents_declares?: number };
    justification?: string;
  } | null;
  const env = typeof palette?.environnement === "string" ? palette.environnement : "";
  const approche = typeof palette?.approche_recommandee === "string" ? palette.approche_recommandee : "";
  const sig = palette?.signaux_utilises ?? null;
  const justification = typeof palette?.justification === "string" ? palette.justification : "";
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="BCG Strategy Palette"
      description="Environnement stratégique (prévisibilité × malléabilité) → approche recommandée."
    >
      {env || approche ? (
        <Stack direction="col" gap={3}>
          {env ? (
            <Stack direction="row" align="center" gap={2}>
              <Text variant="caption" tone="muted">Environnement</Text>
              <Badge tone="accent">{env}</Badge>
            </Stack>
          ) : null}
          {approche ? (
            <Card surface="outlined">
              <CardBody>
                <Stack direction="col" gap={1}>
                  <Text variant="caption" tone="muted">Approche recommandée</Text>
                  <Text variant="body">{approche}</Text>
                </Stack>
              </CardBody>
            </Card>
          ) : null}
          {sig ? (
            <Grid cols={3} gap={2}>
              <Stack direction="col" gap={1}>
                <Heading level={4}>{sig.tendances_macro ?? 0}</Heading>
                <Text variant="caption" tone="muted">Tendances macro</Text>
              </Stack>
              <Stack direction="col" gap={1}>
                <Heading level={4}>{sig.signaux_faibles ?? 0}</Heading>
                <Text variant="caption" tone="muted">Signaux faibles</Text>
              </Stack>
              <Stack direction="col" gap={1}>
                <Heading level={4}>{sig.concurrents_declares ?? 0}</Heading>
                <Text variant="caption" tone="muted">Concurrents déclarés</Text>
              </Stack>
            </Grid>
          ) : null}
          {justification ? <Text variant="caption" tone="muted">{justification}</Text> : null}
        </Stack>
      ) : (
        <EmptyState message="Strategy palette non encore déterminable — déclarer les tendances/signaux marché (pilier T) et le paysage concurrentiel (pilier D)." />
      )}
    </SectionShell>
  );
}

export function DeloitteBudget({ data }: Props) {
  const budget = (data.deloitteBudget ?? data) as {
    total_budget?: string;
    allocation_par_categorie?: Record<string, number>;
    repartition_initiatives_par_intensite?: Record<string, number>;
    alternatives_economiques?: string[];
    methodologie?: string;
  } | null;
  const total = typeof budget?.total_budget === "string" ? budget.total_budget : "";
  const allocation = budget?.allocation_par_categorie ?? {};
  const allocEntries = Object.entries(allocation).filter(([, v]) => typeof v === "number");
  const histo = budget?.repartition_initiatives_par_intensite ?? {};
  const INTENSITES = ["LOW", "MEDIUM", "HIGH"] as const;
  const INTENSITE_LABEL: Record<string, string> = { LOW: "Économique", MEDIUM: "Modéré", HIGH: "Intensif" };
  const histoTotal = Object.values(histo).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
  const alternatives = Array.isArray(budget?.alternatives_economiques) ? budget.alternatives_economiques : [];
  const methodologie = typeof budget?.methodologie === "string" ? budget.methodologie : "";
  const hasAny = total || allocEntries.length > 0 || histoTotal > 0 || alternatives.length > 0;
  return (
    <SectionShell
      tier="BIG4_BASELINE"
      title="Deloitte Budget Framework"
      description="Budget consolidation + allocation par poste + intensités du catalogue."
    >
      {hasAny ? (
        <Stack direction="col" gap={3}>
          {total ? (
            <Stack direction="row" align="center" gap={2}>
              <Text variant="caption" tone="muted">Budget total engagé</Text>
              <Badge tone="accent">{total}</Badge>
            </Stack>
          ) : null}
          {allocEntries.length > 0 ? (
            <Stack direction="col" gap={1}>
              <Heading level={5}>Allocation par poste</Heading>
              {allocEntries.map(([k, v]) => (
                <Stack key={k} direction="row" align="center" justify="between" gap={2}>
                  <Text variant="caption">{k}</Text>
                  <Text variant="body">{v.toLocaleString("fr-FR")}</Text>
                </Stack>
              ))}
            </Stack>
          ) : null}
          {histoTotal > 0 ? (
            <Stack direction="col" gap={2}>
              <Heading level={5}>Initiatives par intensité budgétaire</Heading>
              <Grid cols={3} gap={2}>
                {INTENSITES.map((lvl) => (
                  <Stack key={lvl} direction="col" gap={1}>
                    <Heading level={4}>{typeof histo[lvl] === "number" ? histo[lvl] : 0}</Heading>
                    <Text variant="caption" tone="muted">{INTENSITE_LABEL[lvl]}</Text>
                  </Stack>
                ))}
              </Grid>
            </Stack>
          ) : null}
          {alternatives.length > 0 ? (
            <Stack direction="col" gap={1}>
              <Heading level={5}>Alternatives économiques</Heading>
              {alternatives.map((a, i) => <Text key={i} variant="caption">• {a}</Text>)}
            </Stack>
          ) : null}
          {methodologie ? <Text variant="caption" tone="muted">{methodologie}</Text> : null}
        </Stack>
      ) : (
        <EmptyState message="Budget framework non encore consolidé — déclarer un budget campagnes/lignes budgétaires ou des intensités au catalogue I." />
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
      title="Indice d'attachement"
      description="Mesure de la ferveur de la communauté autour de la marque : engagement, rituels d'usage, vocabulaire propre, ennemi commun, récit fondateur."
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
        <EmptyState message="Indice d'attachement — à mesurer dès le lancement : il se calcule sur les premières données réelles de communauté et d'engagement. Cible alignée sur le palier de marque visé." />
      )}
    </SectionShell>
  );
}

export function ManipulationMatrix({ data, strategyId }: Props) {
  const mm = data.manipulationMatrix as {
    evaluations?: Array<{ mode?: string; weight?: number; observed?: string }>;
    summary?: { dominantMode?: string; mixSource?: string } & Record<string, unknown>;
  } | null;
  // Le composeur écrit les données par mode dans `evaluations` (mode → weight +
  // observed) ; lire `summary[mode]` (clés inexistantes) affichait "—" partout.
  const byMode = new Map((mm?.evaluations ?? []).map((ev) => [String(ev.mode), ev]));
  const dominantMode = mm?.summary?.dominantMode;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Modes d'engagement — 4 leviers d'audience"
      description="Les 4 leviers par lesquels la marque engage son audience et la transforme en communauté active."
    >
      {mm ? (
        <Stack direction="col" gap={3}>
          <Grid cols={4} gap={2}>
            {(["peddler", "dealer", "facilitator", "entertainer"] as const).map((mode) => {
              const ev = byMode.get(mode);
              const pct = typeof ev?.weight === "number" ? Math.round(ev.weight * 100) : null;
              const isDominant = dominantMode === mode;
              return (
                <Card key={mode} surface="outlined">
                  <CardBody>
                    <Heading level={5}>{isDominant ? `★ ${mode}` : mode}</Heading>
                    <Text variant="caption" tone="muted">
                      {pct !== null ? `${pct}% du mix` : "—"}
                      {ev?.observed ? ` · ${String(ev.observed)}` : ""}
                    </Text>
                  </CardBody>
                </Card>
              );
            })}
          </Grid>
          <Banner tone="neutral">
            Visualisation de la matrice générable à la demande.
          </Banner>
          {strategyId ? (
            <Stack direction="row" justify="end" gap={2}>
              <PtahForgeButton
                strategyId={strategyId}
                sectionId="manipulation-matrix"
                brandAssetKind="MANIPULATION_MATRIX"
                forgeKind="image"
                providerHint="magnific"
                modelHint="nano-banana-pro"
                label="Forger visualisation Matrix"
              />
            </Stack>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Modes d'engagement non encore évalués." />
      )}
    </SectionShell>
  );
}

/** Niveau Devotion Ladder (libellé canon, accents tolérés) → clé DevotionPyramid. */
const DEVOTION_KEY: Record<string, string> = {
  spectateur: "spectateur",
  interesse: "interesse", "intéressé": "interesse",
  participant: "participant",
  engage: "engage", "engagé": "engage",
  ambassadeur: "ambassadeur",
  evangeliste: "evangeliste", "évangéliste": "evangeliste",
};

export function DevotionLadder({ data }: Props) {
  const dl = (data.devotionLadder ?? data) as {
    distribution?: Array<{ niveau?: string; valeur?: number }>;
    devotionScore?: number;
    superfansTrackes?: number;
    conversionTriggers?: Array<Record<string, unknown>>;
    portraitSuperfan?: Record<string, unknown>;
  } | null;

  // distribution[] (libellés canon) → Record<key,number> consommé par la pyramide.
  const distribution: Record<string, number> = {};
  for (const d of dl?.distribution ?? []) {
    const key = DEVOTION_KEY[String(d.niveau ?? "").trim().toLowerCase()];
    if (key && typeof d.valeur === "number") distribution[key] = d.valeur;
  }
  const hasPyramid = Object.keys(distribution).length > 0;
  const triggers = Array.isArray(dl?.conversionTriggers) ? dl.conversionTriggers : [];
  const portrait = dl?.portraitSuperfan ?? null;
  const superfans = typeof dl?.superfansTrackes === "number" ? dl.superfansTrackes : null;
  const hasAny = hasPyramid || triggers.length > 0 || portrait || (superfans ?? 0) > 0;

  const tstr = (o: Record<string, unknown>, keys: string[]): string => {
    for (const k of keys) { const v = o[k]; if (typeof v === "string" && v.trim()) return v.trim(); }
    return "";
  };
  const tarr = (o: Record<string, unknown> | null, keys: string[]): string[] => {
    if (!o) return [];
    for (const k of keys) { const v = o[k]; if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string"); }
    return [];
  };

  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Échelle d'engagement — du spectateur au prescripteur"
      description="Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Prescripteur. Mesure la montée en engagement de la communauté autour de la marque."
    >
      {hasAny ? (
        <Stack direction="col" gap={4}>
          {hasPyramid ? (
            <DevotionPyramid data={distribution} score={dl?.devotionScore ?? 0} />
          ) : null}
          {superfans !== null ? (
            <Stack direction="row" align="center" gap={2}>
              <Text variant="caption" tone="muted">Superfans trackés en orbite</Text>
              <Badge tone="accent">{superfans}</Badge>
            </Stack>
          ) : null}
          {triggers.length > 0 ? (
            <Stack direction="col" gap={2}>
              <Heading level={5}>Déclencheurs de conversion</Heading>
              {triggers.slice(0, 6).map((t, i) => {
                const from = tstr(t, ["fromLevel", "from", "palier"]);
                const to = tstr(t, ["toLevel", "to"]);
                const trig = tstr(t, ["trigger", "declencheur"]);
                const channel = tstr(t, ["channel", "canal"]);
                return (
                  <Card key={i} surface="outlined">
                    <CardBody>
                      <Stack direction="row" align="center" gap={2}>
                        {from || to ? (
                          <Stack direction="row" align="center" gap={1}>
                            {from ? <Tag>{from}</Tag> : null}
                            <Text variant="caption" tone="muted">→</Text>
                            {to ? <Badge tone="accent">{to}</Badge> : null}
                          </Stack>
                        ) : null}
                        <Text variant="body">{trig || "—"}</Text>
                        {channel ? <Tag>{channel}</Tag> : null}
                      </Stack>
                    </CardBody>
                  </Card>
                );
              })}
            </Stack>
          ) : null}
          {portrait ? (
            <Card surface="outlined">
              <CardHeader>
                <CardTitle>Portrait du superfan</CardTitle>
              </CardHeader>
              <CardBody>
                <Stack direction="col" gap={2}>
                  {tstr(portrait, ["profile", "description", "profil"]) ? (
                    <Text variant="body">{tstr(portrait, ["profile", "description", "profil"])}</Text>
                  ) : null}
                  <Grid cols={2} gap={3}>
                    {tarr(portrait, ["motivations", "jobsToBeDone"]).length > 0 ? (
                      <Stack direction="col" gap={1}>
                        <Text variant="caption" tone="muted">Motivations</Text>
                        {tarr(portrait, ["motivations", "jobsToBeDone"]).map((m, i) => (
                          <Text key={i} variant="caption">+ {m}</Text>
                        ))}
                      </Stack>
                    ) : null}
                    {tarr(portrait, ["barriers", "freins", "fears"]).length > 0 ? (
                      <Stack direction="col" gap={1}>
                        <Text variant="caption" tone="muted">Freins</Text>
                        {tarr(portrait, ["barriers", "freins", "fears"]).map((b, i) => (
                          <Text key={i} variant="caption">− {b}</Text>
                        ))}
                      </Stack>
                    ) : null}
                  </Grid>
                </Stack>
              </CardBody>
            </Card>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Échelle d'engagement — à mesurer dès le lancement : elle se renseigne sur l'engagement réel de la communauté, ou via les déclencheurs de conversion déclarés dans le pilier Engagement." />
      )}
    </SectionShell>
  );
}

// Phase 23 Story 3.6 — discriminated payload from
// services/strategy-presentation/overton-real-signal.ts. Kept structural
// here (UI consumer) to avoid a server-only import in a client component ;
// the server type is the source of truth.
type OvertonRealSignal =
  | {
      state: "OK";
      meanShiftScore: number;
      measurableCampaigns: number;
      observedAt: string;
      samples: ReadonlyArray<{ campaignName: string; shift: { overtonShiftScore: number | null; degradationCodes: readonly string[] } }>;
    }
  | {
      state: "INSUFFICIENT_DATA";
      reason: "NO_CAMPAIGNS" | "ALL_DEGRADED";
      degradationCodes: readonly string[];
      observedAt: string;
    };

const SHIFT_SCORE_FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function OvertonRealSignalBlock({ signal }: { signal: OvertonRealSignal }) {
  if (signal.state === "INSUFFICIENT_DATA") {
    const cause =
      signal.reason === "NO_CAMPAIGNS"
        ? "Aucune campagne avec hypothèse Overton enregistrée — la mesure démarre à la première campagne LIVE."
        : "Mesures dégradées sur toutes les campagnes — secteur axis ou hypothèse manquant.";
    return (
      <Banner tone="neutral">
        <Stack direction="col" gap={1}>
          <Heading level={5}>État Overton sectoriel — signal en attente</Heading>
          <Text variant="body">{cause}</Text>
          {signal.degradationCodes.length > 0 ? (
            <Text variant="caption" tone="muted">
              Codes : {signal.degradationCodes.join(" · ")}
            </Text>
          ) : null}
        </Stack>
      </Banner>
    );
  }

  return (
    <Card surface="outlined">
      <CardBody>
        <Stack direction="col" gap={2}>
          <Stack direction="row" align="center" gap={2}>
            <Heading level={5}>État Overton sectoriel</Heading>
            <Badge tone="accent">
              Δ {SHIFT_SCORE_FORMATTER.format(signal.meanShiftScore)}
            </Badge>
          </Stack>
          <Text variant="caption" tone="muted">
            Moyenne sur {signal.measurableCampaigns} campagne
            {signal.measurableCampaigns > 1 ? "s" : ""} mesurable
            {signal.measurableCampaigns > 1 ? "s" : ""} · observé {signal.observedAt}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
}

export function OvertonDistinctive({ data }: Props) {
  const od = data.overtonDistinctive as { axes?: Array<{ name?: string; current_position?: string; target_position?: string; gap?: string }>; maneuvers?: unknown[]; realSignal?: OvertonRealSignal } | null;
  const realSignal = od?.realSignal;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Overton Distinctive — Position fenêtre culturelle"
      description="Cartographie culturelle du secteur — position actuelle, palier cible et manœuvres pour déplacer la fenêtre."
    >
      <Stack direction="col" gap={3}>
        {realSignal ? <OvertonRealSignalBlock signal={realSignal} /> : null}
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
        ) : !realSignal ? (
          <EmptyState message="Overton mapping non encore généré." />
        ) : null}
      </Stack>
    </SectionShell>
  );
}

export function TarsisWeakSignals({ data }: Props) {
  const tarsis = data.tarsisWeakSignals as { signals?: Array<{ description?: string; category?: string; impact?: number; horizon?: string; action?: string; confidence?: number }>; top3?: unknown[] } | null;
  return (
    <SectionShell
      tier="DISTINCTIVE"
      title="Signaux faibles sectoriels"
      description="Détection des signaux faibles du secteur, scoring d'impact et horizon de matérialisation (J+30 / 90 / 180 / 365+)."
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
        <EmptyState message="Aucun signal faible détecté pour l'instant." />
      )}
    </SectionShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE — Imhotep Crew Program (Phase 14, ADR-0019) + Anubis Plan Comms (Phase 15, ADR-0020)
// ═══════════════════════════════════════════════════════════════════════════

export function ImhotepCrewProgram({ data, strategyId }: Props) {
  // Gouvernance : ADR-0010 (pré-réserve) + ADR-0019 (full activation).
  // Les réfs vivent ICI (traçabilité code) — jamais dans les chaînes rendues
  // au client (ADR-0123, audit 2026-07-16 `oracle-jargon-neteru-client`).
  // Audit 2026-06-11 — contenu réel : draft Imhotep (status + rôles requis +
  // budget estimé) produit par imhotep.draftCrewProgram pendant l'enrichissement.
  const crew = data.crewProgram as {
    status?: string;
    summary?: string;
    rolesRequired?: string[];
    estimatedBudgetUsd?: number | null;
  } | null;
  const legacyPlaceholder = data.imhotepCrewProgramPlaceholder as string | undefined;
  const roles = Array.isArray(crew?.rolesRequired) ? crew.rolesRequired : [];
  return (
    <SectionShell
      tier="CORE"
      title="Programme équipe"
      description="Programme équipe — sélection des talents, composition, montée en compétence et contrôle qualité."
    >
      {crew?.summary || legacyPlaceholder ? (
        <Stack direction="col" gap={3}>
          <Stack direction="row" align="center" gap={2}>
            {crew?.status ? <Badge tone="accent">{crew.status}</Badge> : null}
            <Text variant="body">{crew?.summary ?? legacyPlaceholder}</Text>
          </Stack>
          {roles.length > 0 ? (
            <Stack direction="col" gap={2}>
              <Text variant="caption" tone="muted">
                Rôles requis ({roles.length})
              </Text>
              <Stack direction="row" gap={2}>
                {roles.map((r) => (
                  <Tag key={r}>{r}</Tag>
                ))}
              </Stack>
            </Stack>
          ) : null}
          {typeof crew?.estimatedBudgetUsd === "number" ? (
            <Text variant="caption" tone="muted">
              Budget crew estimé : {crew.estimatedBudgetUsd.toLocaleString("fr-FR")} USD
            </Text>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Programme équipe non encore généré — lancez l'assemblage de la stratégie." />
      )}
      {strategyId ? (
        <Stack direction="row" justify="end" gap={2}>
          <PtahForgeButton
            strategyId={strategyId}
            sectionId="imhotep-crew-program"
            brandAssetKind="GENERIC"
            forgeKind="icon"
            label="Forger badge crew"
          />
        </Stack>
      ) : null}
    </SectionShell>
  );
}

export function AnubisPlanComms({ data }: Props) {
  // Gouvernance : ADR-0011 (pré-réserve) + ADR-0020 (full activation).
  // Réfs en commentaire code uniquement (ADR-0123 — vocabulaire client).
  // Audit 2026-06-11 — contenu réel : draft Anubis (status + canaux proposés)
  // produit par anubis.draftCommsPlan pendant l'enrichissement.
  const plan = data.commsPlan as {
    status?: string;
    summary?: string;
    channels?: string[];
  } | null;
  const legacyPlaceholder = data.anubisPlanCommsPlaceholder as string | undefined;
  const channels = Array.isArray(plan?.channels) ? plan.channels : [];
  return (
    <SectionShell
      tier="CORE"
      title="Plan de diffusion"
      description="Plan de diffusion multi-canal — réseaux sociaux, campagnes média, email et notifications."
    >
      {plan?.summary || legacyPlaceholder ? (
        <Stack direction="col" gap={3}>
          <Stack direction="row" align="center" gap={2}>
            {plan?.status ? <Badge tone="accent">{plan.status}</Badge> : null}
            <Text variant="body">{plan?.summary ?? legacyPlaceholder}</Text>
          </Stack>
          {channels.length > 0 ? (
            <Stack direction="col" gap={2}>
              <Text variant="caption" tone="muted">
                Canaux proposés ({channels.length})
              </Text>
              <Stack direction="row" gap={2}>
                {channels.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      ) : (
        <EmptyState message="Plan de diffusion non encore généré — lancez l'assemblage de la stratégie." />
      )}
    </SectionShell>
  );
}
