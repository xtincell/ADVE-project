"use client";

/**
 * La Guilde — vue détail d'une mission (publique). ADR-0093.
 * Consomme laGuilde.getMissionBySlug + monte ApplyPanel.
 */

import Link from "next/link";
import { ArrowLeft, MapPin, Wallet, Clock, Globe2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/primitives/badge";
import { Card, CardBody } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { ApplyPanel } from "./apply-panel";
import { formatBudget, formatDeadline } from "./guild-mission-card";

function MetaRow({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" /> {children}
    </span>
  );
}

export function MissionDetailView({ slug }: { slug: string }) {
  const q = trpc.laGuilde.getMissionBySlug.useQuery({ slug });

  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-[var(--card-radius)]" />
      </div>
    );
  }

  if (!q.data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-foreground">Mission introuvable ou non disponible.</p>
        <Link href="/LaGuilde" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour au mur
        </Link>
      </div>
    );
  }

  const { mission, isOpen } = q.data;
  const budget = formatBudget(mission.budget, mission.budgetCurrency);
  const deadline = formatDeadline(mission.deadline);

  return (
    <article className="flex flex-col gap-6">
      <Link href="/LaGuilde" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Le mur des missions
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{mission.categoryLabel}</Badge>
          {mission.mode && <Badge tone="neutral">{mission.mode === "DISPATCH" ? "Dispatch" : "Collaboratif"}</Badge>}
          {mission.remoteOk && (
            <Badge tone="neutral" className="gap-1">
              <Globe2 className="h-3 w-3" /> Remote OK
            </Badge>
          )}
          {!isOpen && <Badge tone="warning">Clôturée</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{mission.title}</h1>
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <span className="font-medium text-foreground">{mission.brandName}</span>
          {mission.brandWebsite && (
            <a href={mission.brandWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              site <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {mission.location && <MetaRow icon={MapPin}>{mission.location}</MetaRow>}
          {budget && <MetaRow icon={Wallet}>{budget}</MetaRow>}
          {deadline && <MetaRow icon={Clock}>Échéance {deadline}</MetaRow>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section title="Objectif">
            <p className="text-foreground-secondary">{mission.summary}</p>
          </Section>
          <Section title="Contexte & enjeu">
            <p className="whitespace-pre-line text-foreground-secondary">{mission.context}</p>
          </Section>
          {mission.targetAudience && (
            <Section title="Cible">
              <p className="text-foreground-secondary">{mission.targetAudience}</p>
            </Section>
          )}
          {mission.deliverables.length > 0 && (
            <Section title="Livrables attendus">
              <ul className="flex flex-col gap-2">
                {mission.deliverables.map((d, i) => (
                  <li key={i} className="rounded-[var(--card-radius)] border border-border-subtle px-4 py-3">
                    <p className="font-medium text-foreground">{d.title}</p>
                    {d.description && <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {mission.qualityCriteria.length > 0 && (
            <Section title="Critères de qualité">
              <ul className="list-disc pl-5 text-foreground-secondary">
                {mission.qualityCriteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <ApplyPanel missionId={mission.id} isOpen={isOpen} />

          {(mission.skillsRequired.length > 0 || mission.channels.length > 0) && (
            <Card surface="raised">
              <CardBody className="flex flex-col gap-4">
                {mission.skillsRequired.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compétences</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mission.skillsRequired.map((s) => (
                        <span key={s} className="rounded-full bg-background-subtle px-2 py-0.5 text-xs text-foreground-secondary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {mission.channels.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canaux</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mission.channels.map((c) => (
                        <span key={c} className="rounded-full bg-background-subtle px-2 py-0.5 text-xs text-foreground-secondary">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
