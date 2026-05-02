/**
 * Console Design System Preview — Phase 11 PR-9.
 * Live preview tokens / primitives / patterns + drift status.
 *
 * Cf. DESIGN-SYSTEM.md §17.D.45 + ADR-0013.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: Visualisation interne pour ops/dev qui veulent
 *   inspecter rapidement les tokens DS sans builder Storybook complet.
 */

import { Button, Card, CardHeader, CardTitle, CardDescription, CardBody, Badge, Heading, Text } from "@/components/primitives";
import { PILLAR_KEYS } from "@/domain";

const REFERENCE_TOKENS = [
  { name: "--ref-ink-0", v: "#0a0a0a", role: "bg primaire" },
  { name: "--ref-ink-1", v: "#121212", role: "surface raised" },
  { name: "--ref-ink-2", v: "#1a1a1a", role: "surface elevated" },
  { name: "--ref-ink-3", v: "#222222", role: "surface overlay" },
  { name: "--ref-bone", v: "#f5f1ea", role: "text primaire" },
  { name: "--ref-bone-2", v: "#e8e2d6", role: "fg brightened" },
  { name: "--ref-bone-3", v: "#c9c3b6", role: "text secondaire" },
  { name: "--ref-mute", v: "#6b6b6b", role: "fg muted" },
  { name: "--ref-rouge", v: "#e63946", role: "accent signature" },
  { name: "--ref-rouge-2", v: "#ff4d5e", role: "hover" },
  { name: "--ref-ember", v: "#ff6b3d", role: "secondaire chaud" },
  { name: "--ref-green", v: "#4ade80", role: "success" },
  { name: "--ref-amber", v: "#f5b942", role: "warning" },
  { name: "--ref-blue", v: "#5fa8e8", role: "info" },
  { name: "--ref-gold", v: "#d4a24c", role: "ICONE / tier-maitre" },
];

const DOMAIN_PILLARS = [...PILLAR_KEYS];
const DOMAIN_DIVISIONS = ["mestor", "artemis", "seshat", "thot", "ptah"];
const DOMAIN_TIERS = ["apprenti", "compagnon", "maitre", "associe"];
const DOMAIN_CLASSES = ["zombie", "fragile", "ordinaire", "forte", "culte", "icone"];

export default function DesignSystemPreviewPage() {
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col gap-2">
        <Text variant="label" tone="accent">phase 11 · DS panda + rouge fusée</Text>
        <Heading level={1}>Design System preview</Heading>
        <Text variant="lead">
          Live inspection des 4 couches token cascade (Reference → System → Component → Domain) +
          primitives + patterns. Source de vérité : <a href="/docs/governance/DESIGN-SYSTEM.md" className="text-accent underline">DESIGN-SYSTEM.md</a>.
        </Text>
      </header>

      <section className="space-y-4">
        <Heading level={2}>Tier 0 — Reference Tokens (immuables hors ADR)</Heading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {REFERENCE_TOKENS.map((t) => (
            <Card key={t.name} surface="raised">
              <div className="h-16 w-full" style={{ background: `var(${t.name})` }} />
              <CardBody>
                <Text variant="mono">{t.name}</Text>
                <Text variant="caption" tone="muted">{t.v}</Text>
                <Text variant="caption">{t.role}</Text>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Heading level={2}>Tier 3 — Domain Tokens</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card surface="raised">
            <CardHeader>
              <CardTitle>Piliers ADVE-RTIS (8)</CardTitle>
              <CardDescription>Cascade A→D→V→E→R→T→I→S</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2 flex-wrap">
                {DOMAIN_PILLARS.map((p) => (
                  <span
                    key={p}
                    className="inline-flex h-12 w-12 items-center justify-center font-display font-semibold text-xl rounded"
                    style={{ background: `var(--pillar-${p})`, color: "var(--ref-ink-0)" }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card surface="raised">
            <CardHeader>
              <CardTitle>Divisions Neteru (5 actifs)</CardTitle>
              <CardDescription>Cohérent BRAINS const · Imhotep/Anubis pré-réservés (pas de token)</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2 flex-wrap">
                {DOMAIN_DIVISIONS.map((d) => (
                  <span
                    key={d}
                    className="inline-flex px-3 h-8 items-center font-mono text-xs uppercase tracking-wider rounded"
                    style={{ background: `var(--division-${d})`, color: "var(--ref-ink-0)" }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card surface="raised">
            <CardHeader>
              <CardTitle>Tiers Creator (4)</CardTitle>
              <CardDescription>apprenti → associé</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2 flex-wrap">
                {DOMAIN_TIERS.map((t) => (
                  <span key={t} className="inline-flex px-3 h-8 items-center font-mono text-xs uppercase tracking-wider rounded" style={{ background: `var(--tier-${t})`, color: "var(--ref-ink-0)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card surface="raised">
            <CardHeader>
              <CardTitle>Classifications APOGEE (6)</CardTitle>
              <CardDescription>ZOMBIE → ICONE</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2 flex-wrap">
                {DOMAIN_CLASSES.map((c) => (
                  <span key={c} className="inline-flex px-3 h-8 items-center font-mono text-xs uppercase tracking-wider rounded" style={{ background: `var(--classification-${c})`, color: "var(--ref-ink-0)" }}>
                    {c}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <Heading level={2}>Primitives — variants showcase</Heading>
        <Card surface="raised">
          <CardHeader>
            <CardTitle>Button</CardTitle>
            <CardDescription>6 variants × 4 sizes</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex gap-3 flex-wrap mb-3">
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardBody>
        </Card>

        <Card surface="raised">
          <CardHeader>
            <CardTitle>Badge</CardTitle>
            <CardDescription>6 tones × 3 variants</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2 flex-wrap">
              <Badge tone="neutral">ZOMBIE</Badge>
              <Badge tone="info">FRAGILE</Badge>
              <Badge tone="warning">ORDINAIRE</Badge>
              <Badge tone="success">FORTE</Badge>
              <Badge tone="accent">CULTE</Badge>
              <Badge tone="error">VETOED</Badge>
              <Badge tone="accent" variant="outline">ICONE</Badge>
            </div>
          </CardBody>
        </Card>
      </section>

      <footer className="pt-6 border-t border-border">
        <Text variant="caption" tone="muted">
          Auto-régénéré : <code className="font-mono text-xs">npm run ds:components-map</code> + <code className="font-mono text-xs">npm run ds:tokens-map</code>.
          Audit dette : <code className="font-mono text-xs">npm run audit:design</code>.
        </Text>
      </footer>
    </div>
  );
}
