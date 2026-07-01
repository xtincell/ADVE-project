"use client";

/**
 * La Guilde — carte mission (mur public). ADR-0098.
 * Présentationnel : consomme une PublicGuildMission (projection sans contact).
 */

import Link from "next/link";
import { MapPin, Wallet, Clock, Globe2 } from "lucide-react";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import type { PublicGuildMission } from "@/lib/types/guild-mission-brief";

export function formatBudget(amount: number | null, currency: string): string | null {
  if (amount == null) return null;
  const label = currency === "XAF" || currency === "XOF" ? "FCFA" : currency;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${label}`;
}

export function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function GuildMissionCard({ mission }: { mission: PublicGuildMission }) {
  const budget = formatBudget(mission.budget, mission.budgetCurrency);
  const deadline = formatDeadline(mission.deadline);
  const href = mission.slug ? `/LaGuilde/m/${mission.slug}` : "/LaGuilde";

  return (
    <Link href={href} className="group block focus:outline-none">
      <Card surface="raised" interactive className="h-full">
        <CardBody className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="accent">{mission.categoryLabel}</Badge>
            {mission.remoteOk && (
              <Badge tone="neutral" className="gap-1">
                <Globe2 className="h-3 w-3" /> Remote OK
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="line-clamp-2 font-semibold tracking-tight text-foreground group-hover:text-accent">
              {mission.title}
            </h3>
            <p className="text-xs text-muted-foreground">{mission.brandName}</p>
          </div>

          <p className="line-clamp-3 text-sm text-foreground-secondary">{mission.summary}</p>

          {mission.skillsRequired.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mission.skillsRequired.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-background-subtle px-2 py-0.5 text-xs text-foreground-secondary"
                >
                  {s}
                </span>
              ))}
              {mission.skillsRequired.length > 4 && (
                <span className="px-1 text-xs text-muted-foreground">
                  +{mission.skillsRequired.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
            {mission.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {mission.location}
              </span>
            )}
            {budget && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground-secondary">
                <Wallet className="h-3.5 w-3.5" /> {budget}
              </span>
            )}
            {deadline && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {deadline}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
