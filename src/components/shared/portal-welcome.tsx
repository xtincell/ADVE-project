"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { Sparkles, Shield, Compass, Wallet, Users, Zap } from "lucide-react";

type PortalKind = "cockpit" | "creator";

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
