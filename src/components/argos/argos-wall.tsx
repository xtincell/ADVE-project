"use client";

/**
 * Argos — mur public des dossiers de référence (PASS + publiés). ADR-0100.
 */

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Skeleton } from "@/components/primitives/skeleton";
import { coerceDna } from "./argos-display";

export function ArgosWall() {
  const list = trpc.argos.listPublic.useQuery({});
  const dossiers = list.data ?? [];

  if (list.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-[var(--card-radius)]" />
        ))}
      </div>
    );
  }

  if (dossiers.length === 0) {
    return (
      <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-background-subtle px-6 py-16 text-center">
        <p className="text-foreground">Aucun dossier publié pour l'instant.</p>
        <p className="mt-1 text-sm text-muted-foreground">Les références arrivent — revenez bientôt.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dossiers.map((d) => {
        const dna = coerceDna(d.dna);
        return (
          <Link key={d.ref} href={`/argos/${d.ref}`} className="group block focus:outline-none">
            <Card surface="raised" interactive className="h-full">
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  {d.sector && <Badge tone="accent">{d.sector}</Badge>}
                  {d.market && <span className="text-xs text-muted-foreground">{d.market}</span>}
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-foreground group-hover:text-accent">
                    {d.brand}
                  </h3>
                  {d.campaign && <p className="text-sm text-foreground-secondary">{d.campaign}</p>}
                </div>
                {dna.voice && <p className="line-clamp-2 text-sm text-foreground-secondary">{dna.voice}</p>}
                {dna.keyPhrases.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {dna.keyPhrases.slice(0, 3).map((k) => (
                      <span key={k} className="rounded-full bg-background-subtle px-2 py-0.5 text-xs text-foreground-secondary">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
