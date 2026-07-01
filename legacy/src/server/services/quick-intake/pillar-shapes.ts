/**
 * quick-intake/pillar-shapes.ts — per-pillar JSON shape contracts (RTIS).
 *
 * Leaf module extracted from `rtis-draft.ts` to break the import cycle
 * `rtis-draft ⇄ multi-agent-orchestrator` (madge --circular). Both the V3
 * RTIS drafter and the multi-agent orchestrator consume `SHAPE_PER_PILLAR`;
 * hosting it here (a dependency-free leaf) lets the orchestrator import the
 * contract without pulling in `rtis-draft` (which lazily imports the
 * orchestrator back).
 */

export type Pillar = "r" | "t" | "i" | "s";

export const SHAPE_PER_PILLAR: Record<Pillar, string> = {
  r: `{
  "criticalRisks": [{ "name": "...", "severity": "P0"|"P1"|"P2", "evidence": "...", "anchor": "ADVE.<pillar>.<field>" }],
  "vulnerabilities": ["..."],
  "blindSpots": ["..."],
  "narrative": "<2-3 phrases qui synthétisent les risques>"
}`,
  t: `{
  "marketSize": { "value": "...", "source": "Seshat|ADVE|inferred" },
  "competitivePressure": [{ "name": "...", "share": "...", "threat": "..." }],
  "weakSignals": ["..."],
  "tractionGap": "<phrase>",
  "narrative": "<2-3 phrases sur le marché réel>"
}`,
  i: `{
  "marketingActionsDatabase": [
    {
      "title": "...",
      "description": "...",
      "aarrrPrimary": "Acquisition|Activation|Retention|Revenue|Referral",
      "aarrrSecondary": "Acquisition|Activation|Retention|Revenue|Referral",
      "overtonRole": "...",
      "maslowClient": "...",
      "maslowBrand": "...",
      "costEstimation": "...",
      "assetsInvolved": ["..."],
      "idealTiming": "...",
      "kpi": "..."
    }
  ],
  "narrative": "<2-3 phrases sur le potentiel des actions>"
}`,
  s: `{
  "strategicPosture": "<une phrase qui définit la posture>",
  "winningMove": "<le pari central>",
  "yearlyRoadmap": {
    "Q1": [{"title": "...", "focus": "..."}],
    "Q2": [{"title": "...", "focus": "..."}],
    "Q3": [{"title": "...", "focus": "..."}],
    "Q4": [{"title": "...", "focus": "..."}]
  },
  "rtisSynthesis": { "fromRisk": "...", "fromTrack": "...", "fromInnovation": "..." },
  "narrative": "<2-3 phrases stratégiques cohérentes>"
}`,
};
