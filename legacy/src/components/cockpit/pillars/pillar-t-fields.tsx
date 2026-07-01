"use client";

/**
 * Pilier T (Tracking / Réalité Marché) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-t.jsx). Régime ÉTUDE DE MARCHÉ :
 * T confronte la VALEUR MARQUE à la VALEUR MARCHÉ. Brand-Market Fit + TAM/SAM/SOM,
 * Overton (position, écart, concurrents), triangulation, hypothèses, signaux faibles,
 * validation des risques, sources, traction. Palette T = sky (var(--info)).
 */

import type { ReactNode } from "react";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, ObjCard, ProofList,
  isEmpty, asArr, asRec, str, makeStatusFor, type Rec,
} from "./pillar-kit";

// ── Helpers ────────────────────────────────────────────────────────────

function formatMarketValue(entry: unknown): ReactNode {
  const o = asRec(entry);
  if (isEmpty(o.value)) return "—";
  const num = Number(o.value);
  if (Number.isNaN(num)) return str(o.value);
  const isUsd = typeof o.description === "string" && o.description.toUpperCase().includes("USD");
  const suffix = isUsd ? " USD" : " XAF";
  return (
    <span title={o.description ? String(o.description) : undefined}>
      {num.toLocaleString("fr-FR")}{suffix}
      {o.source === "ai_estimate" && <span className="opacity-50 text-2xs ml-1.5 font-normal">(estimation IA)</span>}
    </span>
  );
}

// ── Confrontation VALEUR MARQUE ↔ VALEUR MARCHÉ ────────────────────────

function BrandVsMarket({ fit, tam, perception }: { fit: unknown; tam: unknown; perception: unknown }) {
  const fitEmpty = isEmpty(fit);
  const n = Number(fit);
  const pct = fitEmpty || !Number.isFinite(n) ? 0 : Math.max(0, Math.min(100, n));
  const tamO = asRec(tam);
  const perceptionO = asRec(perception);
  return (
    <div className="ck-t-bvm">
      <div className="ck-t-bvm__side brand">
        <span className="ck-t-bvm__tag">Valeur marque</span>
        <div className="ck-t-bvm__fit">
          <div className="ck-t-bvm__fitnum">{fitEmpty ? "—" : str(fit)}<i>/100</i></div>
          <span className="ck-t-bvm__fitlbl">Brand-Market Fit</span>
          <div className="ck-t-bvm__track"><div className="ck-t-bvm__fill" style={{ width: `${pct}%` }} /></div>
        </div>
        {!isEmpty(perceptionO.currentPerception) ? <p className="ck-t-bvm__perc"><i>Perçue comme</i>{str(perceptionO.currentPerception)}</p> : null}
      </div>
      <div className="ck-t-bvm__vs">↔</div>
      <div className="ck-t-bvm__side market">
        <span className="ck-t-bvm__tag">Valeur marché</span>
        {isEmpty(tam) ? <div className="ck-a-empty">À saisir</div> : (
          <div className="ck-t-funnel">
            <div className="ck-t-funnel__l" data-t="tam"><span>TAM</span>{formatMarketValue(tamO.tam)}</div>
            <div className="ck-t-funnel__l" data-t="sam"><span>SAM</span>{formatMarketValue(tamO.sam)}</div>
            <div className="ck-t-funnel__l" data-t="som"><span>SOM</span>{formatMarketValue(tamO.som)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function OvertonPanel({ gap }: { gap: unknown }) {
  if (isEmpty(gap)) return <EmptyBody />;
  const o = asRec(gap);
  return (
    <div className="ck-t-overton">
      <div className="ck-t-overton__box ko"><span className="ck-t-overton__l">Perception actuelle</span>{str(o.currentPerception)}</div>
      <div className="ck-t-overton__arr">→</div>
      <div className="ck-t-overton__box ok"><span className="ck-t-overton__l">Perception cible</span>{str(o.targetPerception)}</div>
      {!isEmpty(o.gapScore) ? <div className="ck-t-overton__score">Écart · {str(o.gapScore)}</div> : null}
      {!isEmpty(o.gapDescription) ? <div className="ck-t-overton__gap">{str(o.gapDescription)}</div> : null}
    </div>
  );
}

function Triangulation({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const S: Array<[string, string, string]> = [
    ["customerInterviews", "Interviews clients", "🗣"], ["competitiveAnalysis", "Analyse concurrentielle", "⚔"],
    ["trendAnalysis", "Analyse tendances", "📈"], ["financialBenchmarks", "Benchmarks financiers", "💰"],
  ];
  return (
    <ACard title="Triangulation marché" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-t-tri">
          {S.map(([k, label, sym]) => (
            <div className="ck-t-tri__s" key={k}><span className="ck-t-tri__sym">{sym}</span><span className="ck-t-tri__k">{label}</span><span className="ck-t-tri__v">{isEmpty(o[k]) ? <EmptyValue /> : str(o[k])}</span></div>
          ))}
        </div>
      )}
    </ACard>
  );
}

function Hypotheses({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  const stTone: Record<string, string> = { VALIDATED: "ok", TESTING: "warn", HYPOTHESIS: "neutral", INVALIDATED: "ko" };
  return (
    <ACard title={"Hypothèses" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-t-hyp">
          {arr.map((h, i) => (
            <div className="ck-t-hyp__row" key={i}>
              <div className="ck-t-hyp__main">
                <span className="ck-t-hyp__h">{str(h.hypothesis)}</span>
                {!isEmpty(h.validationMethod) ? <span className="ck-t-hyp__m">{str(h.validationMethod)}</span> : null}
              </div>
              {!isEmpty(h.evidence) ? <span className="ck-t-hyp__ev">{str(h.evidence)}</span> : null}
              {!isEmpty(h.status) ? <span className={`ck-t-hyp__st ${stTone[str(h.status)] ?? "neutral"}`}>{str(h.status)}</span> : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

function MarketReality({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  return (
    <ACard title="Réalité marché" status={status} empty={empty}>
      {empty ? <EmptyBody /> : (
        <div className="ck-t-real">
          <div className="ck-t-real__col"><span className="ck-t-real__k">Macro-tendances</span><div className="ck-fc__tags">{(Array.isArray(o.macroTrends) ? o.macroTrends : []).map((x, i) => <span className="ck-fc__tag" data-tone="sky" key={i}>{str(x)}</span>)}</div></div>
          <div className="ck-t-real__col"><span className="ck-t-real__k">Signaux faibles</span><div className="ck-fc__tags">{(Array.isArray(o.weakSignals) ? o.weakSignals : []).map((x, i) => <span className="ck-fc__tag" data-tone="neutral" key={i}>{str(x)}</span>)}</div></div>
        </div>
      )}
    </ACard>
  );
}

function Traction({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const K: Array<[string, string]> = [
    ["loisSignees", "LOI / pilotes"], ["utilisateursInscrits", "Inscrits"], ["utilisateursActifs", "Actifs"],
    ["croissanceHebdo", "Croissance hebdo"], ["revenusRecurrents", "Revenus récurrents"],
  ];
  return (
    <ACard title="Traction (signaux précoces)" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-t-trac">
          {K.map(([k, label]) => (!isEmpty(o[k]) ? <div className="ck-t-trac__c" key={k}><span className="ck-t-trac__k">{label}</span><span className="ck-t-trac__v">{str(o[k])}</span></div> : null))}
          {!isEmpty(o.tractionScore) ? <div className="ck-t-trac__c score"><span className="ck-t-trac__k">Score traction</span><span className="ck-t-trac__v">{str(o.tractionScore)}/10</span></div> : null}
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarTFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "t");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.T as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Marque ↔ Marché" sub="L'étude de marché confronte la valeur de la marque à la valeur du marché">
        <BrandVsMarket fit={v.brandMarketFitScore} tam={v.tamSamSom} perception={v.overtonPosition} />
      </Section>

      <Section title="Fenêtre d'Overton" sub="La perception à déplacer et la position des concurrents">
        <div className="ck-a-grid">
          <ACard title="Bascule de perception" status={st("perceptionGap")} empty={isEmpty(v.perceptionGap)} span><OvertonPanel gap={v.perceptionGap} /></ACard>
          <ProofList title="Position d'Overton des concurrents" items={v.competitorOvertonPositions} status={st("competitorOvertonPositions")}
            cols={[["competitorName", "Concurrent"], ["overtonPosition", "Position"], ["relativeToUs", "Vs nous"]]} />
          <ObjCard title="Position d'Overton mesurée" value={v.overtonPosition} status={st("overtonPosition")}
            fields={[["currentPerception", "Perception actuelle"], ["marketSegments", "Segments"], ["measurementMethod", "Méthode"], ["measuredAt", "Mesuré le"]]} />
        </div>
      </Section>

      <Section title="Validation marché" sub="Triangulation, hypothèses, signaux faibles et confrontation des risques">
        <div className="ck-a-grid">
          <Triangulation value={v.triangulation} status={st("triangulation")} />
          <Hypotheses items={v.hypothesisValidation} status={st("hypothesisValidation")} />
          <MarketReality value={v.marketReality} status={st("marketReality")} />
          <Traction value={v.traction} status={st("traction")} />
          <ProofList title="Analyse des signaux faibles" items={v.weakSignalAnalysis} status={st("weakSignalAnalysis")}
            cols={[["thesis", "Thèse"], ["rawEvent", "Événement"], ["impactCategory", "Impact"], ["brandImpact", "Effet marque"], ["urgency", "Urgence"], ["recommendedAction", "Action"]]} />
          <ProofList title="Validation des risques" items={v.riskValidation} status={st("riskValidation")}
            cols={[["riskRef", "Risque"], ["marketEvidence", "Évidence marché"], ["status", "Statut"], ["source", "Source"]]} />
          <ProofList title="Sources de données marché" items={v.marketDataSources} status={st("marketDataSources")}
            cols={[["sourceType", "Type"], ["title", "Titre"], ["collectedAt", "Collecté"], ["reliability", "Fiabilité"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier T (étude de marché)</p>
      </Section>
    </>
  );
}
