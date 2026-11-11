"use client";

/**
 * Argos — vue publique d'un dossier de référence. ADR-0100 / SHK-0002 point 5 :
 * fiche de la bibliothèque canonique si raccordée, sinon dossier publié par
 * La Fusée ; la source et sa fraîcheur sont toujours affichées.
 */

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Skeleton } from "@/components/primitives/skeleton";
import { coerceDna, coerceEditorial, formatArgosDate } from "./argos-display";
import { ArgosSourceNotice } from "./argos-source-notice";

function Chips({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="rounded-full bg-background-subtle px-2.5 py-1 text-xs text-foreground-secondary">
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ArgosDossierView({ refId }: { refId: string }) {
  const q = trpc.argos.getPublicByRef.useQuery({ ref: refId });

  if (q.isLoading) return <Skeleton className="h-64 w-full rounded-[var(--card-radius)]" />;

  if (!q.data?.dossier) {
    return (
      <div className="flex flex-col items-start gap-4">
        {q.data && <ArgosSourceNotice source={q.data.source} scope="dossier" />}
        <p className="text-foreground">
          {q.isError ? "Ce dossier ne peut pas être affiché pour le moment." : "Dossier introuvable ou non publié."}
        </p>
        <Link href="/argos" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à Argos
        </Link>
      </div>
    );
  }

  const d = q.data.dossier;
  const source = q.data.source;
  const dna = coerceDna(d.dna);
  const editorial = coerceEditorial(d.editorial);
  // Une fiche de la bibliothèque n'a pas de DNA au format La Fusée : pas d'encart vide.
  const hasDna = [dna.keyPhrases, dna.axes, dna.visualCodes, dna.palette, dna.typography].some((l) => l.length > 0);

  return (
    <article className="flex flex-col gap-6">
      <Link href="/argos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Argos
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {d.sector && <Badge tone="accent">{d.sector}</Badge>}
          {d.market && <Badge tone="neutral">{d.market}</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{d.brand}</h1>
        {d.campaign && <p className="text-foreground-secondary">{d.campaign}</p>}
        <ArgosSourceNotice source={source} scope="dossier" />
        {source.origin === "STUDIO" && d.updatedAt && (
          <p className="text-xs text-muted-foreground">Fiche mise à jour le {formatArgosDate(d.updatedAt)}.</p>
        )}
        {d.libraryUrl && (
          <a href={d.libraryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            Voir la fiche complète dans la bibliothèque Argos <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {dna.voice && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Voix de marque</h2>
              <p className="text-foreground-secondary">{dna.voice}</p>
            </section>
          )}
          {editorial.sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h2>
              <p className="whitespace-pre-line text-foreground-secondary">{s.body}</p>
            </section>
          ))}
          {d.sources.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sources</h2>
              <ul className="flex flex-col gap-1">
                {d.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                      {s.title} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {hasDna && (
          <aside className="flex flex-col gap-5">
            <Card surface="raised">
              <CardBody className="flex flex-col gap-4">
                <Chips label="Formules clés" items={dna.keyPhrases} />
                <Chips label="Axes culturels" items={dna.axes} />
                <Chips label="Codes visuels" items={dna.visualCodes} />
                <Chips label="Palette" items={dna.palette} />
                <Chips label="Typographie" items={dna.typography} />
              </CardBody>
            </Card>
          </aside>
        )}
      </div>
    </article>
  );
}
