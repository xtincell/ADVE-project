"use client";

/**
 * Pilier R (Risque / Diagnostic) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-r.jsx). Régime ANALYSE INTERNE :
 * R consolide les angles morts du diagnostic ADVE en un score de risque.
 * Matrice probabilité × impact, plan de mitigation, gauge de synthèse, lacunes
 * par pilier, cohérence inter-piliers, Overton, dévotion, micro-SWOTs. Palette R = corail.
 */

import { Fragment } from "react";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, ObjCard, ProofList,
  isEmpty, asArr, asRec, str, makeStatusFor, type Rec,
} from "./pillar-kit";

const RLVL: Record<string, number> = { HIGH: 2, MEDIUM: 1, LOW: 0, "ÉLEVÉ": 2, MOYEN: 1, FAIBLE: 0 };
const rlvl = (x: unknown): number => RLVL[str(x).toUpperCase()] ?? 1;

// ── Matrice probabilité × impact ───────────────────────────────────────

function RiskMatrix({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  const cellRisks = (impactRow: number, probCol: number) => arr.filter((r) => (2 - rlvl(r.impact)) === impactRow && rlvl(r.probability) === probCol);
  const zone = (impactRow: number, probCol: number) => {
    const sev = (2 - impactRow) + probCol;
    return sev >= 3 ? "hot" : sev === 2 ? "warm" : "cool";
  };
  const impactLabels = ["Élevé", "Moyen", "Faible"];
  const probLabels = ["Faible", "Moyen", "Élevé"];
  return (
    <ACard title="Matrice probabilité × impact" status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-r-mxwrap">
          <div className="ck-r-mx">
            <div className="ck-r-mx__axisY">Impact →</div>
            {impactLabels.map((ilbl, row) => (
              <Fragment key={row}>
                <div className="ck-r-mx__ylbl">{ilbl}</div>
                {probLabels.map((_, col) => (
                  <div className={`ck-r-mx__cell ${zone(row, col)}`} key={col}>
                    {cellRisks(row, col).map((r, i) => <span className="ck-r-mx__chip" key={i} title={str(r.risk)}>{str(r.risk)}</span>)}
                  </div>
                ))}
              </Fragment>
            ))}
            <div className="ck-r-mx__corner" />
            {probLabels.map((p, i) => <div className="ck-r-mx__xlbl" key={i}>{p}</div>)}
          </div>
          <div className="ck-r-mx__axisX">Probabilité →</div>
        </div>
      )}
    </ACard>
  );
}

// ── Plan de mitigation ─────────────────────────────────────────────────

function Mitigation({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Plan de mitigation" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-r-mit">
          {arr.map((m, i) => (
            <div className="ck-r-mit__row" key={i}>
              <div className="ck-r-mit__action">{str(m.action)}</div>
              <div className="ck-r-mit__meta">
                {!isEmpty(m.owner) ? <span className="ck-fc__tag" data-tone="coral">{str(m.owner)}</span> : null}
                {!isEmpty(m.timeline) ? <span className="ck-fc__tag" data-tone="neutral">{str(m.timeline)}</span> : null}
                {!isEmpty(m.investment) ? <span className="ck-r-mit__inv">{str(m.investment)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Détail des risques ─────────────────────────────────────────────────

function RiskList({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  const sevTone = (r: Rec) => { const s = rlvl(r.impact) + rlvl(r.probability); return s >= 3 ? "hot" : s === 2 ? "warm" : "cool"; };
  return (
    <ACard title={"Détail des risques" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-r-list">
          {arr.map((r, i) => (
            <div className={`ck-r-risk ${sevTone(r)}`} key={i}>
              <div className="ck-r-risk__top">
                <span className="ck-r-risk__name">{str(r.risk)}</span>
                {!isEmpty(r.category) ? <span className="ck-r-risk__cat">{str(r.category)}</span> : null}
                {!isEmpty(r.status) ? <span className="ck-r-risk__status" data-s={str(r.status)}>{str(r.status)}</span> : null}
              </div>
              <div className="ck-r-risk__bars">
                <span className="ck-r-risk__b"><i>Probabilité</i><b data-l={rlvl(r.probability)}>{str(r.probability)}</b></span>
                <span className="ck-r-risk__b"><i>Impact</i><b data-l={rlvl(r.impact)}>{str(r.impact)}</b></span>
              </div>
              {!isEmpty(r.mitigation) ? <p className="ck-r-risk__mit">↳ {str(r.mitigation)}</p> : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Lacunes par pilier ─────────────────────────────────────────────────

function PillarGaps({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const P: Array<[string, string]> = [["a", "A · Authenticité"], ["d", "D · Distinction"], ["v", "V · Valeur"], ["e", "E · Engagement"]];
  return (
    <ACard title="Lacunes par pilier (ADVE)" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-r-gaps">
          {P.map(([k, label]) => (
            <div className="ck-r-gap" key={k}>
              <span className="ck-r-gap__k">{label}</span>
              <span className="ck-r-gap__v">{isEmpty(o[k]) ? <span className="ck-af__empty">aucune lacune notée</span> : (Array.isArray(o[k]) ? (o[k] as unknown[]).map(str).join(", ") : str(o[k]))}</span>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Score de synthèse R (gauge) ────────────────────────────────────────

function RiskScoreGauge({ score }: { score: unknown }) {
  const empty = isEmpty(score);
  const n = Number(score);
  const pct = empty || !Number.isFinite(n) ? 0 : Math.max(0, Math.min(100, n));
  const qual = pct >= 70 ? "Risque élevé" : pct >= 45 ? "Risque modéré" : "Risque maîtrisé";
  return (
    <div className="ck-r-gauge">
      <div className="ck-r-gauge__ring" style={{ "--p": pct } as React.CSSProperties}>
        <div className="ck-r-gauge__hole" />
        <div className="ck-r-gauge__num">{empty ? "—" : str(score)}<i>/100</i></div>
      </div>
      <div className="ck-r-gauge__t">
        <span className="ck-r-gauge__lbl">Score de risque (synthèse R)</span>
        <span className="ck-r-gauge__q">{empty ? "À calculer" : qual}</span>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarRFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "r");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.R as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Synthèse du risque" sub="R consolide les angles morts du diagnostic ADVE en un score de risque">
        <div className="ck-r-synthrow">
          <RiskScoreGauge score={v.riskScore} />
          <PillarGaps value={v.pillarGaps} status={st("pillarGaps")} />
        </div>
      </Section>

      <Section title="Cartographie des risques" sub="La matrice probabilité × impact et le plan de mitigation">
        <div className="ck-a-grid">
          <RiskMatrix items={v.probabilityImpactMatrix} status={st("probabilityImpactMatrix")} />
          <RiskList items={v.probabilityImpactMatrix} status={st("probabilityImpactMatrix")} />
          <Mitigation items={v.mitigationPriorities} status={st("mitigationPriorities")} />
        </div>
      </Section>

      <Section title="Angles morts spécifiques" sub="Cohérence inter-piliers, Overton, dévotion, micro-SWOTs">
        <div className="ck-a-grid">
          <ProofList title="Risques de cohérence" items={v.coherenceRisks} status={st("coherenceRisks")}
            cols={[["pillar1", "Pilier 1"], ["pillar2", "Pilier 2"], ["contradiction", "Contradiction"], ["severity", "Sévérité"]]} />
          <ProofList title="Bloqueurs d'Overton" items={v.overtonBlockers} status={st("overtonBlockers")}
            cols={[["risk", "Risque"], ["blockingPerception", "Perception bloquante"], ["mitigation", "Mitigation"], ["devotionLevelBlocked", "Niveau bloqué"]]} />
          <ProofList title="Vulnérabilités de dévotion" items={v.devotionVulnerabilities} status={st("devotionVulnerabilities")}
            cols={[["level", "Niveau"], ["churnCause", "Cause d'attrition"], ["mitigation", "Mitigation"]]} />
          <ObjCard title="Micro-SWOTs par pilier" value={v.microSWOTs} status={st("microSWOTs")}
            fields={[["a", "SWOT A"], ["d", "SWOT D"], ["v", "SWOT V"], ["e", "SWOT E"]]} />
          <ObjCard title="SWOT global (consolidé)" value={v.globalSwot} status={st("globalSwot")}
            fields={[["strengths", "Forces"], ["weaknesses", "Faiblesses"], ["opportunities", "Opportunités"], ["threats", "Menaces"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier R (synthèse)</p>
      </Section>
    </>
  );
}
