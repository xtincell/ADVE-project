"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook that applies CSS animation classes when elements scroll into view.
 * Targets children with `data-reveal` attribute.
 * Optionally uses `data-reveal-delay` for stagger (e.g. "100", "200").
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const ref = useRef<T>(null);
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((child) => {
        child.style.opacity = "1";
      });
      return;
    }

    // Initially hide all reveal targets
    el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((child) => {
      child.style.opacity = "0";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          const animation = target.dataset.reveal || "slide-up";
          const delay = target.dataset.revealDelay || "0";
          const duration = target.dataset.revealDuration || "600";

          target.style.animation = `${animation} ${duration}ms var(--ease-out) ${delay}ms forwards`;

          if (once) observer.unobserve(target);
        });
      },
      { threshold, rootMargin },
    );

    el.querySelectorAll("[data-reveal]").forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}
