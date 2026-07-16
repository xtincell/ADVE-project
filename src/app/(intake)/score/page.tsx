// ============================================================================
// MODULE M35 — Quick Intake Portal: Score Reference Page
// Score: 92/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §5.2 + §2.1.4 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Public reference page explaining ADVE-RTIS score /200
// [x] REQ-2  5 classification tiers with ranges and descriptions
// [x] REQ-3  8 pillar explanations (A, D, V, E, R, T, I, S)
// [x] REQ-4  CTA to start free diagnostic (/intake)
//
// ROUTE: /score
// ============================================================================

import { Rocket, Shield, Star, Crown, Flame, Skull, Eye, Target, Heart, AlertTriangle, BarChart3, Settings, Compass } from "lucide-react";

// Bandes CANON (src/domain/brand-tier.ts classifyTier) — l'ancienne liste
// (5 tiers, « 0-80 Latent », sans FRAGILE) contredisait la classification
// réellement rendue au lead (audit 2026-07-16).
const TIERS = [
  {
    range: "0-40",
    label: "Latent",
    desc: "Invisible, pas d'identite distincte. Substituable a tout moment.",
    color: "var(--color-class-latent)",
    bgOpacity: "10%",
    icon: Skull,
  },
  {
    range: "41-80",
    label: "Fragile",
    desc: "Des intuitions justes mais un socle instable. La coherence ne tient pas seule.",
    color: "var(--color-class-fragile, var(--color-class-latent))",
    bgOpacity: "10%",
    icon: AlertTriangle,
  },
  {
    range: "81-120",
    label: "Ordinaire",
    desc: "Fonctionnel mais interchangeable. Pas de raison de vous choisir specifiquement.",
    color: "var(--color-class-ordinaire)",
    bgOpacity: "10%",
    icon: Eye,
  },
  {
    range: "121-160",
    label: "Forte",
    desc: "Reconnue et respectee. Vos clients vous preferent pour des raisons claires.",
    color: "var(--color-class-forte)",
    bgOpacity: "10%",
    icon: Shield,
  },
  {
    range: "161-180",
    label: "Culte",
    desc: "Adoree, inspire la devotion. Vos clients sont vos meilleurs ambassadeurs.",
    color: "var(--color-class-culte)",
    bgOpacity: "10%",
    icon: Flame,
  },
  {
    range: "181-200",
    label: "Icone",
    desc: "Legendaire, reference mondiale. Vous transcendez votre marche.",
    color: "var(--color-class-icone)",
    bgOpacity: "10%",
    icon: Crown,
  },
];

const PILLARS = [
  { key: "A", name: "Authenticite", question: "Qui etes-vous vraiment ?", color: "var(--color-pillar-a)", icon: Heart },
  { key: "D", name: "Distinction", question: "Pourquoi vous et pas un autre ?", color: "var(--color-pillar-d)", icon: Star },
  { key: "V", name: "Valeur", question: "Que promettez-vous au monde ?", color: "var(--color-pillar-v)", icon: Target },
  { key: "E", name: "Engagement", question: "Comment creer la devotion ?", color: "var(--color-pillar-e)", icon: Flame },
  { key: "R", name: "Risque", question: "Quels sont vos angles morts ?", color: "var(--color-pillar-r)", icon: AlertTriangle },
  { key: "T", name: "Track", question: "Comment mesurez-vous le succes ?", color: "var(--color-pillar-t)", icon: BarChart3 },
  // I = Innovation (canon produit) — « Implementation » était un drift.
  { key: "I", name: "Innovation", question: "Quel potentiel inexploite ?", color: "var(--color-pillar-i)", icon: Settings },
  { key: "S", name: "Strategie", question: "Comment assembler le tout ?", color: "var(--color-pillar-s)", icon: Compass },
];

export default function PublicScorePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
              <Rocket className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Score de marque <span className="text-gradient-star">/200</span>
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-foreground-secondary">
            Le standard de mesure de la force de marque. 8 piliers, un score composite,
            une classification claire.
          </p>
        </div>

        {/* Classification tiers */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Les 6 paliers de marque
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.label}
                  className="rounded-2xl border p-5 text-center transition-all hover:shadow-md"
                  style={{
                    borderColor: `color-mix(in oklch, ${tier.color} 30%, transparent)`,
                    backgroundColor: `color-mix(in oklch, ${tier.color} ${tier.bgOpacity}, transparent)`,
                  }}
                >
                  <Icon className="mx-auto h-6 w-6" style={{ color: tier.color }} />
                  <p className="mt-2 text-2xl font-bold" style={{ color: tier.color }}>
                    {tier.range}
                  </p>
                  <p className="font-semibold text-foreground">{tier.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{tier.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 8 Pillars */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">Les 8 piliers</h2>
          <p className="mx-auto mb-8 max-w-lg text-center text-sm text-foreground-muted">
            Chaque pilier est note sur 25 points. Les 4 premiers (ADVE) definissent l'ADN de votre marque.
            Les 4 suivants (R, T, I, S) mesurent sa capacite d'execution.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.key}
                  className="rounded-xl border p-4 transition-all hover:shadow-sm"
                  style={{
                    borderColor: `color-mix(in oklch, ${p.color} 25%, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.key}
                    </span>
                    <span className="font-semibold text-foreground">{p.name}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{p.question}</p>
                </div>
              );
            })}
          </div>

          {/* Formula note */}
          <div className="mt-6 rounded-lg bg-background-overlay p-4 text-center">
            <p className="text-xs text-foreground-muted">
              <strong>Score composite</strong> = A + D + V + E + R + T + I + S (chaque pilier /25, total /200)
            </p>
            <p className="mt-2 text-xs text-foreground-muted">
              Le diagnostic gratuit mesure votre <strong>socle ADVE</strong> (4 piliers, /100) —
              les piliers d&apos;exécution (R·T·I·S) se mesurent ensuite, dans votre espace.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <a
            href="/intake"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover sm:py-3"
          >
            <Rocket className="h-5 w-5" />
            Mesurer votre marque gratuitement
          </a>
          <p className="mt-3 text-xs text-foreground-muted">
            15 minutes · Gratuit · Confidentiel · Score instantane
          </p>
        </div>
      </div>
    </main>
  );
}
