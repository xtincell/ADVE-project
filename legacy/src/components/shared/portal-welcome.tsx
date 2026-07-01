"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import {
  Sparkles, Shield, Compass, Wallet, Users, Zap,
  Terminal, Settings, GitBranch, Building2, BarChart3, Briefcase,
} from "lucide-react";
import { startPortalTour, hasTourSteps } from "./portal-tour";

type PortalKind = "cockpit" | "creator" | "console" | "agency";

function firstNameOf(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!;
  return "Toi";
}

interface Highlight {
  icon: React.ElementType;
  title: string;
  body: string;
}

interface PortalCopy {
  badge: string;
  title: (firstName: string) => string;
  intro: string;
  highlights: Highlight[];
  cta: string;
  accentVar: string;
}

const COPY: Record<PortalKind, PortalCopy> = {
  cockpit: {
    badge: "Brand OS",
    title: (n) => `Bienvenue ${n}.`,
    intro:
      "Ton cockpit de pilotage marque. Voici les trois leviers que tu peux activer dès maintenant.",
    highlights: [
      {
        icon: Compass,
        title: "Diagnostic ADVE",
        body: "Mesure les 4 piliers fondateurs (Authenticité, Distinction, Valeur, Engagement) et obtiens un brand level avec recommandations actionnables.",
      },
      {
        icon: Sparkles,
        title: "Big Idea + briefs créatifs",
        body: "De l'insight à l'asset : transforme ta stratégie en briefs Artemis, puis matérialise en KV/manifesto/oracle via la forge Ptah.",
      },
      {
        icon: Zap,
        title: "Cascade RTIS automatique",
        body: "Une fois ADVE renseigné, les piliers Risk/Track/Innovation/Strategy se calculent sans effort — tu pilotes, le système orchestre.",
      },
    ],
    cta: "Entrer dans le cockpit",
    accentVar: "var(--color-portal-cockpit, #ef4444)",
  },
  creator: {
    badge: "Guild OS",
    title: (n) => `Bienvenue ${n}.`,
    intro:
      "Ton espace créatif. Voici les trois portes d'entrée vers ta vie de freelance avec La Fusée.",
    highlights: [
      {
        icon: Users,
        title: "Missions disponibles",
        body: "Liste des briefs des marques de l'écosystème, matchés sur tes skills et ton tier. Postule en un clic.",
      },
      {
        icon: Shield,
        title: "Profil + portfolio",
        body: "Soigne ta vitrine : skills, drivers de motivation, réalisations passées. Imhotep matche en fonction.",
      },
      {
        icon: Wallet,
        title: "Earnings + Académie",
        body: "Suivi des paiements mission par mission + accès aux formations ADVE pour monter de tier.",
      },
    ],
    cta: "Explorer le portail",
    accentVar: "var(--color-portal-creator, #8b5cf6)",
  },
  console: {
    badge: "Fixer Industry",
    title: (n) => `Console ${n}.`,
    intro:
      "Cockpit opérateur UPgraders. Trois entrées clés pour orchestrer l'écosystème.",
    highlights: [
      {
        icon: Terminal,
        title: "Gouvernance Mestor",
        body: "Intent Catalog 350+, error vault, audits anti-drift, manifests des Neteru. Tout ce qui pilote la cascade en backstage.",
      },
      {
        icon: GitBranch,
        title: "Glory tools + séquences",
        body: "56 outils rédactionnels indexés, sequences orchestrées, BrandAssets matériels via la forge Ptah.",
      },
      {
        icon: Settings,
        title: "Config + intégrations",
        body: "Variable bible, thresholds, credentials vault Anubis, MCP servers. Le câblage technique de l'OS.",
      },
    ],
    cta: "Entrer en console",
    accentVar: "var(--color-portal-console, #10b981)",
  },
  agency: {
    badge: "Partner Console",
    title: (n) => `Bienvenue ${n}.`,
    intro:
      "Ton espace agence partenaire. Trois leviers pour piloter ton portefeuille de marques.",
    highlights: [
      {
        icon: Building2,
        title: "Multi-marques",
        body: "Vue consolidée de tes clients founders, navigation rapide entre leurs cockpits, reporting agrégé.",
      },
      {
        icon: Briefcase,
        title: "Campagnes coordonnées",
        body: "Coordination des campagnes inter-marques, accès au réseau Imhotep pour staffer les missions.",
      },
      {
        icon: BarChart3,
        title: "Facturation + analytics",
        body: "Reporting Thot par client, marges agence, attribution canal, performance par mission.",
      },
    ],
    cta: "Ouvrir la console agence",
    accentVar: "var(--color-portal-agency, #f59e0b)",
  },
};

interface PortalWelcomeProps {
  portal: PortalKind;
}

export function PortalWelcome({ portal }: PortalWelcomeProps) {
  const { data: session, status } = useSession();
  const storageKey = `lafusee:welcome:${portal}:v1`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (window.localStorage.getItem(storageKey) === "seen") return;
      setOpen(true);
    } catch {
      // localStorage indisponible (private mode) → on n'affiche pas le welcome
      // pour éviter les loops, le user perd juste le tour d'horizon.
    }
  }, [storageKey, status]);

  const firstName = firstNameOf(session?.user?.name, session?.user?.email);

  function handleClose() {
    try {
      window.localStorage.setItem(storageKey, "seen");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  const copy = COPY[portal];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      size="lg"
      dismissible
    >
      <div className="space-y-5">
        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: copy.accentVar }}
          >
            {copy.badge}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {copy.title(firstName)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            {copy.intro}
          </p>
        </div>

        <ul className="space-y-3">
          {copy.highlights.map((h) => {
            const Icon = h.icon;
            return (
              <li
                key={h.title}
                className="flex items-start gap-3 rounded-lg border border-border-subtle bg-background-subtle p-3"
              >
                <div
                  className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${copy.accentVar} 15%, transparent)`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: copy.accentVar }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                    {h.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-foreground-muted hover:text-foreground"
          >
            Plus tard
          </button>
          {hasTourSteps(portal) && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                // Délai court pour laisser le modal disparaître avant de spotlight
                setTimeout(() => startPortalTour(portal), 250);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-foreground-muted hover:text-foreground"
            >
              Faire le tour
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{ backgroundColor: copy.accentVar }}
          >
            {copy.cta}
          </button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
