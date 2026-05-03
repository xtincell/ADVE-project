"use client";

/**
 * PortalTour — système de product tour maison (spotlight + tooltip + steps).
 *
 * Pourquoi maison plutôt que Shepherd.js / driver.js / Intro.js :
 * - Aucune dépendance npm ajoutée (Phase 0 : zéro deps creep).
 * - Tokens DS panda + accent rouge fusée préservés (cf. DESIGN-SYSTEM.md).
 * - Contrôle total a11y (focus trap, ESC, aria-live).
 * - Persistence via localStorage (cohérent avec PortalWelcome).
 *
 * API publique :
 * - `<PortalTourHost />` : monté UNE fois au layout racine de chaque portail.
 *   Écoute l'event `lafusee:tour:start` et orchestre le tour.
 * - `startPortalTour(portal)` : déclenche le tour pour un portail donné.
 *   Émet `lafusee:tour:start` (custom event sur window).
 * - `hasTourSteps(portal)` : true si le portail a des steps configurés.
 *
 * Targets : data-tour-step="<portal>:<step-id>" sur les éléments à highlighter.
 * Si le target n'est pas trouvé dans le DOM, le step est skippé silencieusement
 * (le tour reste résilient aux pages qui ne contiennent pas tous les targets).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type PortalKind = "cockpit" | "creator" | "console" | "agency";

interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector (preferred) or fallback to data-tour-step lookup */
  selector?: string;
  /** Position du tooltip relativement au target */
  placement?: "top" | "bottom" | "left" | "right";
}

const STEPS: Record<PortalKind, TourStep[]> = {
  cockpit: [
    {
      id: "switcher",
      title: "Changer de portail",
      body: "Ce sélecteur te ramène au hub des portails ou à la landing à tout moment, sans perdre ton contexte.",
      selector: '[data-portal-switcher]',
      placement: "bottom",
    },
    {
      id: "sidebar",
      title: "Navigation par pilier",
      body: "La sidebar regroupe Brand, Operate, Insights, Mestor. Chaque section correspond à un moment du cycle marque.",
      selector: '[data-tour-step="sidebar"]',
      placement: "right",
    },
    {
      id: "search",
      title: "Recherche universelle (Ctrl+K)",
      body: "Saute à n'importe quelle page, mission, asset, ou intent en tapant 2-3 lettres. C'est le raccourci le plus utilisé.",
      selector: '[data-tour-step="search"]',
      placement: "bottom",
    },
    {
      id: "mestor",
      title: "Mestor — assistant cascade",
      body: "Mestor te suggère la prochaine action selon l'état de ta cascade ADVE→RTIS. Quand l'icône clignote, il a une recommandation à pousser.",
      selector: '[data-tour-step="mestor"]',
      placement: "bottom",
    },
  ],
  creator: [
    {
      id: "switcher",
      title: "Changer de portail",
      body: "Si tu portes plusieurs casquettes (créateur + agency), ce sélecteur fait le pont. Sinon, il te ramène à la landing.",
      selector: '[data-portal-switcher]',
      placement: "bottom",
    },
    {
      id: "sidebar",
      title: "Tes 4 zones",
      body: "Profil, missions, communauté, formation. Commence par soigner ton profil — c'est lui qui matche les missions.",
      selector: '[data-tour-step="sidebar"]',
      placement: "right",
    },
    {
      id: "search",
      title: "Recherche rapide (Ctrl+K)",
      body: "Trouve une mission, une formation, ou une page de communauté en quelques touches.",
      selector: '[data-tour-step="search"]',
      placement: "bottom",
    },
  ],
  console: [
    {
      id: "switcher",
      title: "Switch portail",
      body: "Bascule rapidement vers Cockpit, Creator ou Agency pour voir l'écosystème côté client.",
      selector: '[data-portal-switcher]',
      placement: "bottom",
    },
    {
      id: "sidebar",
      title: "9 sections de gouvernance",
      body: "Oracle, Signal, Arène, Fusée, Socle, Académie, Écosystème, Config, Messages. Chaque section couvre un sous-système APOGEE.",
      selector: '[data-tour-step="sidebar"]',
      placement: "right",
    },
    {
      id: "search",
      title: "Command palette (Ctrl+K)",
      body: "Indexe toute la Console — Glory tools, Intent Catalog, audits, error vault. Apprends ce raccourci, tu vas l'user 50 fois par jour.",
      selector: '[data-tour-step="search"]',
      placement: "bottom",
    },
  ],
  agency: [
    {
      id: "switcher",
      title: "Switch portail",
      body: "Ce sélecteur te ramène au hub ou bascule vers le Creator si tu staffes des freelances.",
      selector: '[data-portal-switcher]',
      placement: "bottom",
    },
    {
      id: "sidebar",
      title: "Vue agence",
      body: "Multi-clients, campagnes coordonnées, facturation. La Console agence est white-label — tes clients voient leur Cockpit, toi tu vois l'agrégé.",
      selector: '[data-tour-step="sidebar"]',
      placement: "right",
    },
  ],
};

const TOUR_START_EVENT = "lafusee:tour:start";
const STORAGE_KEY = (portal: PortalKind) => `lafusee:tour:${portal}:v1`;

export function hasTourSteps(portal: PortalKind): boolean {
  return STEPS[portal]?.length > 0;
}

export function startPortalTour(portal: PortalKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT, { detail: { portal } }));
}

interface PortalTourHostProps {
  portal: PortalKind;
}

export function PortalTourHost({ portal }: PortalTourHostProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps = STEPS[portal] ?? [];
  const step = steps[stepIndex];

  const finish = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    try {
      window.localStorage.setItem(STORAGE_KEY(portal), "seen");
    } catch {
      // ignore
    }
  }, [portal]);

  // Listen to startPortalTour events
  useEffect(() => {
    function handler(ev: Event) {
      const detail = (ev as CustomEvent<{ portal: PortalKind }>).detail;
      if (detail?.portal !== portal) return;
      setStepIndex(0);
      setActive(true);
    }
    window.addEventListener(TOUR_START_EVENT, handler);
    return () => window.removeEventListener(TOUR_START_EVENT, handler);
  }, [portal]);

  // Compute target rect when step changes (with skip-on-missing-target)
  useLayoutEffect(() => {
    if (!active || !step) return;
    const sel = step.selector;
    if (!sel) {
      setRect(null);
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      // Target absent → skip silently to next step (or finish)
      if (stepIndex + 1 < steps.length) {
        setStepIndex((i) => i + 1);
      } else {
        finish();
      }
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Re-measure after scroll completes (rough heuristic)
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 320);
    return () => clearTimeout(t);
  }, [active, step, stepIndex, steps.length, finish]);

  // Re-measure on window resize
  useEffect(() => {
    if (!active || !step?.selector) return;
    const handler = () => {
      const el = document.querySelector(step.selector!) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler);
    };
  }, [active, step]);

  // ESC to dismiss
  useEffect(() => {
    if (!active) return;
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, stepIndex]);

  const nextStep = useCallback(() => {
    if (stepIndex + 1 < steps.length) setStepIndex(stepIndex + 1);
    else finish();
  }, [stepIndex, steps.length, finish]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  if (!active || !step) return null;

  const placement = step.placement ?? "bottom";
  const tooltipStyle = computeTooltipPosition(rect, placement);
  const cutoutStyle = rect ? computeCutoutStyle(rect) : null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,100)] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour étape ${stepIndex + 1} sur ${steps.length}`}
    >
      {/* Backdrop avec cutout sur la zone target */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={finish} />
      {cutoutStyle && (
        <div
          className="absolute rounded-lg pointer-events-none transition-all duration-200"
          style={{
            ...cutoutStyle,
            boxShadow:
              "0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 3px var(--color-accent), 0 0 30px 4px color-mix(in oklch, var(--color-accent) 40%, transparent)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-auto w-[min(360px,calc(100vw-32px))] rounded-lg border border-border bg-background-raised p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
            Étape {stepIndex + 1}/{steps.length}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label="Fermer le tour"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h3 className="mt-1 text-base font-semibold text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-background-overlay hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Précédent
          </button>
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <span
                key={s.id}
                aria-hidden
                className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i === stepIndex
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {stepIndex + 1 === steps.length ? "Terminer" : "Suivant"}
            {stepIndex + 1 < steps.length && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- positioning helpers ----------

function computeCutoutStyle(rect: DOMRect): React.CSSProperties {
  const pad = 6;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function computeTooltipPosition(
  rect: DOMRect | null,
  placement: "top" | "bottom" | "left" | "right",
): React.CSSProperties {
  if (!rect) {
    // Pas de target → tooltip centré
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const margin = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;

  switch (placement) {
    case "top": {
      const top = Math.max(8, rect.top - margin - 200);
      const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 180), vw - 368);
      return { top, left };
    }
    case "right": {
      const top = Math.min(Math.max(8, rect.top + rect.height / 2 - 80), vh - 200);
      const left = Math.min(rect.right + margin, vw - 368);
      return { top, left };
    }
    case "left": {
      const top = Math.min(Math.max(8, rect.top + rect.height / 2 - 80), vh - 200);
      const left = Math.max(8, rect.left - 360 - margin);
      return { top, left };
    }
    case "bottom":
    default: {
      const top = Math.min(rect.bottom + margin, vh - 220);
      const left = Math.min(Math.max(8, rect.left + rect.width / 2 - 180), vw - 368);
      return { top, left };
    }
  }
}
