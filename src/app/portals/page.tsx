import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import {
  Sparkles,
  Shield,
  Terminal,
  Building2,
  Rocket,
  ArrowRight,
} from "lucide-react";

interface PortalCard {
  id: string;
  href: string;
  label: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  accentVar: string;
  isVisible: (role: string) => boolean;
}

const PORTAL_CARDS: PortalCard[] = [
  {
    id: "cockpit",
    href: "/cockpit",
    label: "Cockpit — Brand OS",
    tagline: "Pour les fondateurs de marque",
    description:
      "Pilotez votre marque comme une fusée. Vault de marque, big idea, briefs créatifs, séquences ADVE → RTIS, oracle stratégique 35 sections.",
    icon: Sparkles,
    accentVar: "var(--color-portal-cockpit, #ef4444)",
    isVisible: (role) =>
      ["ADMIN", "OPERATOR", "USER", "FOUNDER", "BRAND", "CLIENT_RETAINER", "CLIENT_STATIC"].includes(role),
  },
  {
    id: "creator",
    href: "/creator",
    label: "Creator — Guild OS",
    tagline: "Pour les créateurs / freelances",
    description:
      "Espace créatif. Profil, missions disponibles, portfolio, formations Académie ADVE, communauté Guild, earnings.",
    icon: Shield,
    accentVar: "var(--color-portal-creator, #8b5cf6)",
    isVisible: (role) =>
      ["ADMIN", "OPERATOR", "USER", "CREATOR", "FREELANCE"].includes(role),
  },
  {
    id: "agency",
    href: "/agency",
    label: "Agency — Partner Console",
    tagline: "Pour les agences partenaires",
    description:
      "Gestion clients multi-marques, campagnes coordonnées, accès au réseau Imhotep, facturation Thot.",
    icon: Building2,
    accentVar: "var(--color-portal-agency, #f59e0b)",
    isVisible: (role) =>
      ["ADMIN", "OPERATOR", "AGENCY", "CLIENT_RETAINER", "CLIENT_STATIC"].includes(role),
  },
  {
    id: "console",
    href: "/console",
    label: "Console — Fixer Industry",
    tagline: "Réservé UPgraders (interne)",
    description:
      "Orchestration de l'écosystème. Gouvernance Mestor, Neteru, Glory tools, Intent Catalog, error vault, audits.",
    icon: Terminal,
    accentVar: "var(--color-portal-console, #10b981)",
    isVisible: (role) => ["ADMIN", "OPERATOR"].includes(role),
  },
];

function firstName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!;
  return "Toi";
}

export default async function PortalsHubPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/portals");
  }

  const role = (session.user as { role?: string }).role ?? "USER";
  const accessibleCards = PORTAL_CARDS.filter((c) => c.isVisible(role));
  const restrictedCards = PORTAL_CARDS.filter((c) => !c.isVisible(role));
  const userFirstName = firstName(session.user.name, session.user.email);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-[var(--maxw-content)] items-center justify-between px-[var(--pad-page)] py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="La Fusée">
            <Rocket className="h-5 w-5 text-accent" />
            <span className="font-semibold tracking-tight">
              La Fusée<span className="text-accent">.</span>
            </span>
          </Link>
          <Link
            href="/api/auth/signout?callbackUrl=/"
            className="text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            Déconnexion
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-12">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground-muted">
            Bienvenue
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Bonjour {userFirstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-foreground-secondary">
            Voici les portails auxquels tu as accès. Choisis celui qui correspond à ce
            que tu veux faire maintenant — tu pourras revenir ici à tout moment depuis
            le sélecteur de portail en haut à gauche de chaque interface.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {accessibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                href={card.href}
                className="group relative flex flex-col gap-4 rounded-xl border border-border bg-background-raised p-6 transition-all hover:-translate-y-0.5 hover:border-foreground-muted"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${card.accentVar} 15%, transparent)`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: card.accentVar }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground-muted transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {card.label}
                  </h2>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-foreground-muted">
                    {card.tagline}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-foreground-secondary">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </section>

        {restrictedCards.length > 0 && (
          <section className="mt-12">
            <p className="mb-3 text-xs uppercase tracking-wider text-foreground-muted">
              Non accessibles avec ton compte
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {restrictedCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="flex items-start gap-3 rounded-lg border border-border-subtle bg-background-subtle p-4 opacity-60"
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-foreground-muted" />
                    <div>
                      <p className="text-sm font-medium">{card.label}</p>
                      <p className="text-xs text-foreground-muted">{card.tagline}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-12 border-t border-border-subtle pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            ← Retour à la landing
          </Link>
        </div>
      </main>
    </div>
  );
}
