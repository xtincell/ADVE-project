"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "lafusee:cookie-consent:v1";

type ConsentChoice = "accepted" | "essential-only" | null;

function readChoice(): ConsentChoice {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "essential-only") return v;
  } catch {
    // localStorage may throw in private mode
  }
  return null;
}

function writeChoice(choice: Exclude<ConsentChoice, null>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readChoice() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    writeChoice("accepted");
    setVisible(false);
  };
  const handleEssentialOnly = () => {
    writeChoice("essential-only");
    setVisible(false);
  };

  // Mobile (18 novembre 2026) : une seule ligne en bas d'écran — le bandeau
  // couvrait un quart de l'écran (181 px sur 812). Même choix, mêmes deux
  // boutons, phrase courte ; la phrase complète reste à partir de 768 px.
  return (
    <div
      role="dialog"
      aria-label="Préférences cookies"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-toast,90)] border-t border-border bg-background-raised/95 backdrop-blur-md shadow-2xl print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[var(--maxw-content)] items-center gap-2 px-3 py-1.5 md:gap-6 md:px-[var(--pad-page)] md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:items-start md:gap-3">
          <Cookie className="hidden h-5 w-5 flex-shrink-0 text-accent md:mt-0.5 md:block" aria-hidden />
          <p className="min-w-0 text-xs leading-snug text-foreground-secondary md:text-sm md:leading-relaxed">
            <span className="md:hidden">Cookies de mesure&nbsp;?</span>
            <span className="hidden md:inline">
              On utilise des cookies pour la session de connexion (essentiels) et,
              avec ton accord, pour mesurer l&apos;usage afin d&apos;améliorer La Fusée.
              Aucun tracking publicitaire tiers.
            </span>{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              <span className="md:hidden">Détails</span>
              <span className="hidden md:inline">En savoir plus</span>
            </Link>
            <span className="hidden md:inline">.</span>
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-foreground-muted hover:text-foreground md:px-4 md:py-2 md:text-sm"
          >
            <span className="md:hidden">Refuser</span>
            <span className="hidden md:inline">Essentiels uniquement</span>
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover md:px-4 md:py-2 md:text-sm"
          >
            <span className="md:hidden">Accepter</span>
            <span className="hidden md:inline">Tout accepter</span>
          </button>
          <button
            type="button"
            onClick={handleEssentialOnly}
            aria-label="Fermer"
            className="ml-1 hidden h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground md:flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
