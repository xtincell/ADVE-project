"use client";

/**
 * <MyPostedMissions /> — suivi des missions déposées (marque connectée).
 * Consomme `laGuilde.myPostedMissions` (audit 2026-07-16
 * `guild-brand-no-tracking-surface` : la query n'avait aucun consommateur).
 * États honnêtes : non connecté → invitation à se connecter ; aucune mission →
 * EmptyState avec CTA dépôt ; rejet → motif affiché tel que tracé.
 */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";

const STATE_UI = {
  PENDING: { label: "En validation", tone: "warning" as const, Icon: Clock },
  PUBLISHED: { label: "Publiée", tone: "success" as const, Icon: CheckCircle2 },
  REJECTED: { label: "Non retenue", tone: "error" as const, Icon: XCircle },
};

export function MyPostedMissions() {
  const { status } = useSession();
  const missions = trpc.laGuilde.myPostedMissions.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  if (status === "loading" || (status === "authenticated" && missions.isLoading)) {
    return <p className="text-sm text-foreground-muted">Chargement…</p>;
  }

  if (status !== "authenticated") {
    return (
      <Card surface="raised">
        <CardBody className="flex flex-col items-start gap-3">
          <p className="text-sm text-foreground-secondary">
            Connectez-vous avec le compte utilisé lors du dépôt pour suivre vos missions.
          </p>
          <Link href="/login?callbackUrl=/LaGuilde/mes-missions">
            <Button size="sm">Se connecter</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const rows = missions.data ?? [];
  if (rows.length === 0) {
    return (
      <Card surface="raised">
        <CardBody className="flex flex-col items-start gap-3">
          <p className="text-sm text-foreground-secondary">
            Vous n&apos;avez pas encore déposé de mission avec ce compte.
          </p>
          <Link href="/LaGuilde/publier">
            <Button size="sm">Publier une mission</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((m) => {
        const ui = STATE_UI[m.moderationState];
        return (
          <Card key={m.id} surface="raised">
            <CardBody className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ui.tone}>
                    <ui.Icon className="mr-1 h-3.5 w-3.5" /> {ui.label}
                  </Badge>
                  <Badge tone="neutral">{m.categoryLabel}</Badge>
                </div>
                <span className="text-xs text-foreground-muted">
                  Déposée le {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <h2 className="font-semibold text-foreground">{m.title}</h2>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-foreground-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-foreground-muted" />
                  {m.applicationCount} candidature{m.applicationCount > 1 ? "s" : ""}
                </span>
                {m.assigned && <span>Talent attribué ✓</span>}
                {m.budget != null && <span>{m.budget.toLocaleString("fr-FR")} FCFA</span>}
              </div>

              {m.moderationState === "REJECTED" && (
                <p className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground-secondary">
                  <span className="font-medium text-foreground">Motif : </span>
                  {m.moderationNote ?? "non précisé — contactez-nous pour en savoir plus."}
                </p>
              )}

              {m.moderationState === "PUBLISHED" && m.slug && (
                <Link href={`/LaGuilde/m/${m.slug}`} className="text-sm text-accent hover:underline">
                  Voir sur le mur des missions →
                </Link>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
