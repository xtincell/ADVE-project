"use client";

/**
 * <GuildBriefBlock /> — rendu du brief guilde COMPLET dans les modals mission
 * du portail creator (audit 2026-07-16 `guild-brief-invisible-to-assigned-
 * talent` : le talent attribué ne voyait ni budget, ni échéance, ni contexte,
 * ni livrables attendus — sa seule voie était de retrouver l'URL publique).
 * S'auto-masque si le briefData n'est pas un brief guilde.
 */

interface GuildBrief {
  _kind?: string;
  summary?: string;
  context?: string;
  targetAudience?: string;
  deliverables?: Array<{ title: string; description?: string }>;
  channels?: string[];
  skillsRequired?: string[];
  qualityCriteria?: string[];
  budgetCurrency?: string;
}

export function GuildBriefBlock({
  briefData,
  budget,
  slaDeadline,
}: {
  briefData: unknown;
  budget?: number | null;
  slaDeadline?: string | Date | null;
}) {
  const brief = (briefData && typeof briefData === "object" ? briefData : null) as GuildBrief | null;
  if (!brief || brief._kind !== "GUILD_MISSION_BRIEF") return null;

  const deliverables = Array.isArray(brief.deliverables) ? brief.deliverables : [];
  const channels = Array.isArray(brief.channels) ? brief.channels : [];
  const skills = Array.isArray(brief.skillsRequired) ? brief.skillsRequired : [];
  const quality = Array.isArray(brief.qualityCriteria) ? brief.qualityCriteria : [];

  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <h4 className="mb-2 text-sm font-medium text-foreground">Brief de la mission</h4>
      <div className="space-y-2 text-sm text-foreground-secondary">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {budget != null && (
            <span>
              <span className="text-foreground-muted">Budget : </span>
              <span className="font-medium text-foreground">
                {budget.toLocaleString("fr-FR")} {brief.budgetCurrency ?? "FCFA"}
              </span>
            </span>
          )}
          {slaDeadline && (
            <span>
              <span className="text-foreground-muted">Échéance : </span>
              <span className="font-medium text-foreground">
                {new Date(slaDeadline).toLocaleDateString("fr-FR")}
              </span>
            </span>
          )}
        </div>
        {brief.summary && <p>{brief.summary}</p>}
        {brief.context && (
          <p><span className="font-medium text-foreground">Contexte : </span>{brief.context}</p>
        )}
        {brief.targetAudience && (
          <p><span className="font-medium text-foreground">Audience : </span>{brief.targetAudience}</p>
        )}
        {deliverables.length > 0 && (
          <div>
            <p className="font-medium text-foreground">Livrables attendus :</p>
            <ul className="ml-4 list-disc">
              {deliverables.map((d, i) => (
                <li key={i}>{d.title}{d.description ? ` — ${d.description}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
        {channels.length > 0 && (
          <p><span className="font-medium text-foreground">Canaux : </span>{channels.join(", ")}</p>
        )}
        {skills.length > 0 && (
          <p><span className="font-medium text-foreground">Compétences : </span>{skills.join(", ")}</p>
        )}
        {quality.length > 0 && (
          <div>
            <p className="font-medium text-foreground">Critères de qualité :</p>
            <ul className="ml-4 list-disc">
              {quality.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
