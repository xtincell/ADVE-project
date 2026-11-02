"use client";

import { initiativeBudgetLabel, ROUTE_SPECS } from "@/lib/strategy/roadmap-routes";

/**
 * Pilier S (Stratégie) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-s.jsx). Régime DASHBOARD CALCULÉ :
 * S consolide tout en un plan chiffré et séquencé. Synthèse & vision, fenêtre
 * d'Overton + jalons, axes & FCS, sprint 90j, roadmap, KPI dashboard + North Star,
 * budget (ventilation + par dévotion), équipe, cohérence calculée. Hue S = pink.
 *
 * NB — le sélecteur d'ambition (3 trajectoires, Intent gouverné SELECT_ROADMAP_ROUTE)
 * est rendu par le shell `pillar-page.tsx` au-dessus de ce body ; ComputedBanner
 * ci-dessous en est le miroir lecture-seule (cohérence, ambition retenue, budget).
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, ProofList,
  isEmpty, asArr, asRec, str, makeStatusFor, type Rec,
} from "./pillar-kit";

const FREQUENCY_LABEL: Record<string, string> = { DAILY: "Quotidien", WEEKLY: "Hebdomadaire", MONTHLY: "Mensuel", QUARTERLY: "Trimestriel", YEARLY: "Annuel", ONE_SHOT: "Une fois", ROLLING: "En continu" };
const KPI_DETAIL_FIELDS: Array<[string, string]> = [["definition", "Définition"], ["observationWindow", "Fenêtre d’observation"], ["targetContext", "Périmètre de l’objectif"], ["sourceNotes", "Précisions de la source"]];
const kpiQualification = (k: Rec) => k.qualification === "PROPOSED" ? "Proposition à valider" : k.qualification === "DECLARED" ? "Objectif déclaré" : "Qualification non renseignée";
const kpiTarget = (value: unknown) => /^-?\d+(\.\d+)?$/.test(str(value))
  ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 10 }).format(Number(value)) : str(value);

function KpiSourceDetails({ value }: { value: Rec }) {
  const fields = KPI_DETAIL_FIELDS.filter(([key]) => !isEmpty(value[key]));
  if (!fields.length) return null;
  return <details className="ck-s-details">
    <summary>Définition et sources</summary>
    <dl>{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{str(value[key])}</dd></div>)}</dl>
  </details>;
}

function SStatement({ label, value, status, big }: { label: string; value: unknown; status?: string; big?: boolean }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(value)}>
      {isEmpty(value) ? <EmptyBody /> : <p className={`ck-a-stmt${big ? " ck-a-stmt--big" : ""}`}>{str(value)}</p>}
    </ACard>
  );
}

// ── Fenêtre d'Overton ──────────────────────────────────────────────────

function FenetreOverton({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  return (
    <ACard title="Fenêtre d'Overton" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-s-overton">
          <div className="ck-s-overton__flow">
            <div className="ck-s-overton__box ko"><span>Perception actuelle</span>{str(o.perceptionActuelle)}</div>
            <div className="ck-s-overton__arr">→</div>
            <div className="ck-s-overton__box ok"><span>Perception cible</span>{str(o.perceptionCible)}</div>
          </div>
          {!isEmpty(o.ecart) ? <p className="ck-s-overton__gap"><i>Écart à combler</i>{str(o.ecart)}</p> : null}
          {!isEmpty(o.strategieDeplacement) ? <div className="ck-s-overton__strat"><i>Stratégie de déplacement</i>{Array.isArray(o.strategieDeplacement) ? <ol>{asArr(o.strategieDeplacement).map((step, i) => <li key={i}>{str(step.action)} · {str(step.canal)} · {str(step.horizon) || "Échéance à préciser"}</li>)}</ol> : str(o.strategieDeplacement)}</div> : null}
        </div>
      )}
    </ACard>
  );
}

// ── Jalons d'Overton ───────────────────────────────────────────────────

function OvertonMilestones({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Jalons d'Overton" status={status} empty={empty} span>
      {empty ? <p className="text-sm text-foreground-muted">Les jalons ne sont pas encore déductibles du socle de marque. Vérifier et compléter les objectifs et perceptions de l’ADVE, puis recalculer le plan. Aucun résultat constaté n’est inventé.</p> : (
        <div className="ck-s-miles">
          {arr.map((m, i) => (
            <div className="ck-s-mile" key={i}>
              <div className="ck-s-mile__rail"><span className="ck-s-mile__dot" /></div>
              <div className="ck-s-mile__b">
                <span className="ck-s-mile__phase">{str(m.phase)}</span>
                <span className="ck-s-mile__move">{str(m.currentPerception)} <b>→</b> {str(m.targetPerception)}</span>
                {!isEmpty(m.measurementMethod) ? <span className="ck-s-mile__meth">{str(m.measurementMethod)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Roadmap ────────────────────────────────────────────────────────────

function Roadmap({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Roadmap" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-s-road">
          {arr.map((p, i) => (
            <div className="ck-s-phase" key={i} style={{ "--i": i } as React.CSSProperties}>
              <div className="ck-s-phase__head">
                <span className="ck-s-phase__name">{str(p.phase)}</span>
                {!isEmpty(p.duree) ? <span className="ck-s-phase__when">{str(p.duree)}</span> : null}
                {!isEmpty(p.cadence) ? <span className="ck-s-phase__when">{FREQUENCY_LABEL[str(p.cadence)] ?? str(p.cadence)}</span> : null}
              </div>
              {!isEmpty(p.objectif) ? <p className="ck-s-phase__obj">{str(p.objectif)}</p> : null}
              <div className="ck-s-phase__meta">
                {!isEmpty(p.objectifDevotion) ? <span className="ck-fc__tag" data-tone="pink">→ {str(p.objectifDevotion)}</span> : null}
                {!isEmpty(p.budget) || !isEmpty(p.budgetSummary) ? <span className="ck-s-phase__budget">{initiativeBudgetLabel(p.budget, p.budgetSummary)}</span> : null}
              </div>
              {!isEmpty(p.actions) ? <ol className="ck-s-phase__acts">{(Array.isArray(p.actions) ? p.actions : []).map((a, j) => <li className="ck-s-phase__a" key={j}>{str(a)}</li>)}</ol> : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Sprint 90 jours ────────────────────────────────────────────────────

function Sprint90({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Sprint 90 jours" status={status} empty={empty} span>
      {empty ? <p className="text-sm text-foreground-muted">L’horizon de 90 jours n’est pas encore déductible des informations de marque. Compléter les objectifs, contraintes et moyens dans l’ADVE, puis recalculer. Les actions proposées restent conservées.</p> : (
        <div className="ck-s-sprint">
          {arr.map((a, i) => (
            <div className="ck-s-sprint__row" key={i}>
              <span className="ck-s-sprint__p">{str(a.priority) || i + 1}</span>
              <span className="ck-s-sprint__action">{str(a.action)}</span>
              <div className="ck-s-sprint__meta">
                {!isEmpty(a.owner) ? <span className="ck-fc__tag" data-tone="pink">{str(a.owner)}</span> : null}
                {!isEmpty(a.kpi) ? <span className="ck-s-sprint__kpi">{str(a.kpi)}</span> : null}
                {String(a.isRiskMitigation) === "true" ? <span className="ck-s-sprint__risk">⛨ mitigation</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Dashboard KPI ──────────────────────────────────────────────────────

function KpiDashboard({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Dashboard KPI" status={status} empty={empty} span>
      {empty ? <p className="text-sm text-foreground-muted">Aucun objectif avec cible et fréquence n’a pu être repris depuis Engagement. Compléter ces champs du socle ADVE à partir des sources, puis recalculer le suivi.</p> : (
        <>
        <p className="mb-3 text-sm text-foreground-muted">Objectifs repris d’Engagement. Ces cibles ne sont pas des résultats mesurés.</p>
        <div className="ck-s-kpis">
          {arr.map((k, i) => (
            <div className="ck-s-kpi" key={i}>
              <span className="ck-s-kpi__pillar">{str(k.pillar)}</span>
              <div className="ck-s-kpi__body">
                <p className="ck-s-kpi__name">{str(k.name)}</p>
                <p className="ck-s-kpi__qualification">{kpiQualification(k)}</p>
                <KpiSourceDetails value={k} />
              </div>
              <span className="ck-s-kpi__target">{[kpiTarget(k.target), str(k.unit)].filter(Boolean).join(" · ")}</span>
              <span className="ck-s-kpi__freq"><span>Suivi</span>{FREQUENCY_LABEL[str(k.frequency)] ?? str(k.frequency)}</span>
            </div>
          ))}
        </div>
        </>
      )}
    </ACard>
  );
}

function NorthStarCard({ value, status }: { value: unknown; status?: string }) {
  const k = asRec(value);
  const fields = [
    ["Cible", isEmpty(k.target) ? "À définir dans Engagement" : [kpiTarget(k.target), str(k.unit)].filter(Boolean).join(" · ")],
    ["Fréquence de suivi", isEmpty(k.frequency) ? "À définir dans Engagement" : FREQUENCY_LABEL[str(k.frequency)] ?? str(k.frequency)],
    ["Valeur mesurée", isEmpty(k.currentValue) ? "Mesure non disponible" : str(k.currentValue)],
  ];
  return <ACard title="North Star KPI" status={status} empty={isEmpty(value)}>
    {isEmpty(value) ? <p className="text-sm text-foreground-muted">L’indicateur principal n’est pas encore identifié sans ambiguïté dans Engagement. Compléter la fondation puis recalculer.</p> : <>
      <p className="ck-s-kpi__name">{str(k.name)}</p>
      <p className="ck-s-kpi__qualification">{kpiQualification(k)}</p>
      <dl className="ck-s-north-star">{fields.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
      <KpiSourceDetails value={k} />
    </>}
  </ACard>;
}

// ── Budget (ventilation + par dévotion) ────────────────────────────────

function BudgetPanel({ breakdown, byDevotion, total, summary, status }: { breakdown: unknown; byDevotion: unknown; total: unknown; summary: unknown; status?: string }) {
  const empty = isEmpty(breakdown) && isEmpty(byDevotion);
  const bk = asRec(breakdown);
  const bd = asRec(byDevotion);
  const totalN = typeof total === "number" ? total : null;
  const BK: Array<[string, string]> = [["production", "Production"], ["media", "Média"], ["talent", "Talent"], ["logistics", "Logistique"], ["technology", "Technologie"], ["contingency", "Contingence"]];
  const BD: Array<[string, string]> = [["acquisition", "Acquisition"], ["conversion", "Conversion"], ["retention", "Rétention"], ["evangelisation", "Évangélisation"]];
  return (
    <ACard title={"Budget" + (totalN ? ` · ${new Intl.NumberFormat("fr-FR").format(totalN)} FCFA` : "")} status={status} empty={empty} span>
      <p className="mb-3 text-sm text-foreground-muted">{initiativeBudgetLabel(total, summary)}. Estimations des actions retenues ; les devis et dépenses restent distincts.</p>
      {empty ? <p className="text-sm text-foreground-muted">La ventilation production, média, talent, logistique et technologie n’est pas encore déductible des moyens renseignés. Vérifier et compléter le socle ADVE, puis recalculer le chiffrage des actions. Aucun montant n’est affecté arbitrairement à une catégorie.</p> : (
        <div className="ck-s-budget">
          <div className="ck-s-budget__col">
            <span className="ck-s-budget__h">Ventilation</span>
            {isEmpty(breakdown) ? <EmptyValue /> : BK.map(([k, label]) => (!isEmpty(bk[k]) && bk[k] !== "—" ? (
              <div className="ck-s-budget__r" key={k}><span>{label}</span><b>{str(bk[k])}</b></div>
            ) : null))}
          </div>
          <div className="ck-s-budget__col">
            <span className="ck-s-budget__h">Par étape de dévotion</span>
            {isEmpty(byDevotion) ? <EmptyValue /> : BD.map(([k, label]) => (!isEmpty(bd[k]) ? (
              <div className="ck-s-budget__bar" key={k}><span className="ck-s-budget__bl">{label}</span><div className="ck-s-budget__bt"><div className="ck-s-budget__bf" style={{ width: str(bd[k]) }} /></div><span className="ck-s-budget__bv">{str(bd[k])}</span></div>
            ) : null))}
          </div>
        </div>
      )}
    </ACard>
  );
}

// ── Bandeau de cohérence calculée ──────────────────────────────────────

function ComputedBanner({ computed, score }: { computed: unknown; score: unknown }) {
  if (isEmpty(computed)) return null;
  const c = asRec(computed);
  const numericScore = (value: unknown): number | null => {
    if (isEmpty(value) || (typeof value !== "number" && typeof value !== "string")) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const pct = numericScore(score) ?? numericScore(c.coherenceScore);
  const totalBudget = typeof c.totalBudget === "number" ? c.totalBudget : null;
  return (
    <div className="ck-s-computed">
      <div className="ck-s-computed__score">
        <div className="ck-s-computed__ring" style={{ "--p": pct ?? 0 } as React.CSSProperties}><div className="ck-s-computed__hole" /><span>{pct ?? "—"}<i>/100</i></span></div>
        <span className="ck-s-computed__lbl">{typeof c.coherenceIssueCount === "number" ? `${c.coherenceIssueCount} observation(s) de cohérence à examiner` : "Cohérence non mesurée"}</span>
      </div>
      <div className="ck-s-computed__cells">
        <div className="ck-s-computed__c"><span>Scénario courant</span><b>{ROUTE_SPECS.find(r => r.key === c.selectedRouteKey)?.label ?? "À recalculer"}</b></div>
        <div className="ck-s-computed__c"><span>Initiatives</span><b>{isEmpty(c.selectedInitiativeCount) ? "—" : str(c.selectedInitiativeCount)}</b></div>
        <div className="ck-s-computed__c"><span>Budget du plan</span><b>{initiativeBudgetLabel(totalBudget, c.budgetSummary)}</b></div>
        {typeof asRec(c.budgetSummary).unassignedTimeframeCount === "number" && Number(asRec(c.budgetSummary).unassignedTimeframeCount) > 0 ? <div className="ck-s-computed__c"><span>Échéances à préciser</span><b>{str(asRec(c.budgetSummary).unassignedTimeframeCount)}</b></div> : null}
        <div className="ck-s-computed__c"><span>Risques associés à une action</span><b>{isEmpty(c.riskCoverage) ? "—" : `${str(c.riskCoverage)} %`}</b></div>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarSFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "s", content._fieldProvenance);
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.S as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;
  const coherence = isEmpty(v.coherenceScore) ? "—" : str(v.coherenceScore);

  return (
    <>
      <Section title="Tableau de bord calculé" sub="La synthèse stratégique — cohérence, ambition et budget consolidés">
        <ComputedBanner computed={v.computed} score={v.coherenceScore} />
      </Section>

      <Section title="Vision & synthèse" sub="Le récit stratégique et la fenêtre d'Overton">
        <div className="ck-a-grid">
          <SStatement label="Synthèse exécutive" value={v.syntheseExecutive} status={st("syntheseExecutive")} big />
          <SStatement label="Vision stratégique" value={v.visionStrategique} status={st("visionStrategique")} big />
          <FenetreOverton value={v.fenetreOverton} status={st("fenetreOverton")} />
          <OvertonMilestones items={v.overtonMilestones} status={st("overtonMilestones")} />
        </div>
      </Section>

      <Section title="Axes & exécution" sub="Les axes stratégiques, facteurs clés, sprint 90 jours et roadmap">
        <div className="ck-a-grid">
          <ProofList title="Axes stratégiques" items={v.axesStrategiques} status={st("axesStrategiques")}
            cols={[["axe", "Axe"], ["pillarsLinked", "Piliers liés"], ["kpis", "KPIs"]]} />
          <ACard title="Facteurs clés de succès" status={st("facteursClesSucces")} empty={isEmpty(v.facteursClesSucces)}>
            {isEmpty(v.facteursClesSucces) ? <EmptyBody /> : <ol className="ck-s-prose-list">{(Array.isArray(v.facteursClesSucces) ? v.facteursClesSucces : []).map((f, i) => <li key={i}>{str(f)}</li>)}</ol>}
          </ACard>
          <Sprint90 items={v.sprint90Days} status={st("sprint90Days")} />
          <Roadmap items={v.roadmap} status={st("roadmap")} />
          <ProofList title="Actions du scénario courant" items={v.selectedFromI} status={st("selectedFromI")}
            cols={[["action", "Action"], ["phase", "Phase"], ["priority", "Priorité"]]} />
          {isEmpty(v.rejectedFromI) ? <ACard title="Actions rejetées dans le catalogue" empty={false}><p className="text-sm text-foreground-muted">Aucune action rejetée dans le catalogue. Les actions absentes de ce scénario restent disponibles pour les autres scénarios.</p></ACard> :
            <ProofList title="Actions rejetées dans le catalogue" items={v.rejectedFromI} status={st("rejectedFromI")} cols={[["action", "Action"], ["reason", "Raison"]]} />}
        </div>
      </Section>

      <Section title="Pilotage & budget" sub="Le dashboard KPI, la North Star, le budget et l'équipe mobilisée">
        <div className="ck-a-grid">
          <KpiDashboard items={v.kpiDashboard} status={st("kpiDashboard")} />
          <NorthStarCard value={v.northStarKPI} status={st("northStarKPI")} />
          <BudgetPanel breakdown={v.budgetBreakdown} byDevotion={v.budgetByDevotion} total={v.globalBudget} summary={asRec(v.computed).budgetSummary} status={st(!isEmpty(v.budgetBreakdown) ? "budgetBreakdown" : typeof v.globalBudget === "number" ? "globalBudget" : "computed")} />
          <ProofList title="Équipe documentée" items={v.teamStructure} status={st("teamStructure")}
            cols={[["name", "Nom"], ["title", "Titre"], ["responsibility", "Profil / contribution documentée"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · score de cohérence {coherence}/100 · pilier S (calculé)</p>
      </Section>
    </>
  );
}
