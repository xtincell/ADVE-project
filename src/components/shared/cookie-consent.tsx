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

  return (
    <div
      role="dialog"
      aria-label="Préférences cookies"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-toast,90)] border-t border-border bg-background-raised/95 backdrop-blur-md shadow-2xl"
    >
      <div className="mx-auto flex max-w-[var(--maxw-content)] flex-col gap-4 px-[var(--pad-page)] py-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-start gap-3 md:flex-1">
          <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" aria-hidden />
          <p className="text-sm leading-relaxed text-foreground-secondary">
            On utilise des cookies pour la session de connexion (essentiels) et,
            avec ton accord, pour mesurer l&apos;usage afin d&apos;améliorer La Fusée.
            Aucun tracking publicitaire tiers.{" "}
            <Link href="/legal/privacy" className="underline hover:text-foreground">
              En savoir plus
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-foreground-muted hover:text-foreground"
          >
            Essentiels uniquement
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Tout accepter
          </button>
          <button
            type="button"
            onClick={handleEssentialOnly}
            aria-label="Fermer"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
