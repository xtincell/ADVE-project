"use client";

/**
 * Checklist d'activation (audit onboarding 2026-07-19, P1-1) — le fil
 * conducteur qui manquait entre « compte créé » et « premier moment de
 * valeur ». États 100 % réels (query d'agrégation, jamais de fabriqué),
 * chaque item est une action cliquable. Se masque une fois tout coché.
 */

import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function ActivationChecklist({ strategyId }: { strategyId: string }) {
  const checklist = trpc.cockpitDashboard.getActivationChecklist.useQuery(
    { strategyId },
    { staleTime: 60_000 },
  );
  const data = checklist.data;
  if (!data || data.doneCount >= data.total) return null;

  const pct = Math.round((data.doneCount / data.total) * 100);
  const next = data.items.find((i) => !i.done);

  return (
    <section
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      aria-label="Activation de votre espace"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Activez votre marque — {data.doneCount}/{data.total}
        </p>
        <p className="text-xs text-foreground-muted" role="status" aria-live="polite">
          {pct} % · prochaine étape : {next?.label}
        </p>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-background)" }} aria-hidden>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(4, pct)}%`, background: "var(--color-accent)" }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-start gap-2.5 rounded-xl border p-3 transition-colors hover:border-[color:var(--color-accent)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-accent)]" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${item.done ? "text-foreground-muted line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
                {!item.done ? (
                  <span className="mt-0.5 block text-xs leading-snug text-foreground-muted">{item.detail}</span>
                ) : null}
              </span>
              {!item.done ? <ChevronRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" aria-hidden /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
