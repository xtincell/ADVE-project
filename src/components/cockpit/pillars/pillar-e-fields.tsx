"use client";

/**
 * Pilier E (Engagement / Expérience) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-e.jsx). Palette E = amber (var(--warning)).
 * Promesse d'expérience, superfan, funnel AARRR, touchpoints, rituels, KPIs,
 * principes & gamification, et la couche « religion de marque » (commandements,
 * tabous, calendrier sacré, sacrements, rites, clergé, pèlerinages, évangélisation).
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, ObjCard, ProofList,
  isEmpty, asArr, asRec, str, makeStatusFor, type Rec,
} from "./pillar-kit";

function EStatement({ label, value, status, big }: { label: string; value: unknown; status?: string; big?: boolean }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(value)}>
      {isEmpty(value) ? <EmptyBody /> : <p className={`ck-a-stmt${big ? " ck-a-stmt--big" : ""}`}>{str(value)}</p>}
    </ACard>
  );
}

// ── Funnel AARRR ───────────────────────────────────────────────────────

function Aarrr({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const STAGES: Array<[string, string, string]> = [
    ["acquisition", "Acquisition", "A"], ["activation", "Activation", "A"],
    ["retention", "Rétention", "R"], ["revenue", "Revenue", "R"], ["referral", "Referral", "R"],
  ];
  return (
    <ACard title="Funnel AARRR" status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-e-funnel">
          {STAGES.map(([k, label, ltr], i) => (
            <div className="ck-e-funnel__stage" key={k} style={{ "--i": i, "--n": STAGES.length } as React.CSSProperties}>
              <div className="ck-e-funnel__bar">
                <span className="ck-e-funnel__ltr">{ltr}</span>
                <span className="ck-e-funnel__name">{label}</span>
              </div>
              <p className="ck-e-funnel__txt">{isEmpty(o[k]) ? <EmptyValue /> : str(o[k])}</p>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Touchpoints ────────────────────────────────────────────────────────

function Touchpoints({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Points de contact" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-e-tps">
          {arr.map((t, i) => (
            <div className="ck-e-tp" key={i}>
              <div className="ck-e-tp__head">
                <span className="ck-e-tp__canal">{str(t.canal)}</span>
                {!isEmpty(t.type) ? <span className="ck-e-tp__type">{str(t.type)}</span> : null}
              </div>
              {!isEmpty(t.role) ? <p className="ck-e-tp__role">{str(t.role)}</p> : null}
              <div className="ck-e-tp__meta">
                {!isEmpty(t.aarrStage) ? <span className="ck-fc__tag" data-tone="amber">{str(t.aarrStage)}</span> : null}
                {(Array.isArray(t.devotionLevel) ? t.devotionLevel : []).map((d, j) => <span className="ck-fc__tag" data-tone="neutral" key={j}>{str(d)}</span>)}
                {!isEmpty(t.frequency) ? <span className="ck-e-tp__freq">{str(t.frequency)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Rituels ────────────────────────────────────────────────────────────

function Rituels({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Rituels" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-e-rits">
          {arr.map((r, i) => (
            <div className="ck-e-rit" key={i}>
              <div className="ck-e-rit__head">
                <span className="ck-e-rit__name">{str(r.nom)}</span>
                {!isEmpty(r.type) ? <span className="ck-e-rit__type">{str(r.type)}</span> : null}
                {!isEmpty(r.frequency) ? <span className="ck-e-rit__freq">{str(r.frequency)}</span> : null}
              </div>
              {!isEmpty(r.description) ? <p className="ck-e-rit__desc">{str(r.description)}</p> : null}
              <div className="ck-e-rit__foot">
                {!isEmpty(r.aarrPrimary) ? <span className="ck-fc__tag" data-tone="amber">AARRR · {str(r.aarrPrimary)}</span> : null}
                {!isEmpty(r.kpiMeasure) ? <span className="ck-e-rit__kpi">📏 {str(r.kpiMeasure)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── KPIs (table) ───────────────────────────────────────────────────────

function Kpis({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"KPIs" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-e-kpis">
          <div className="ck-e-kpis__h"><span>Indicateur</span><span>Type</span><span>Objectif</span><span>Fréquence</span></div>
          {arr.map((k, i) => (
            <div className="ck-e-kpis__r" key={i}>
              <span className="ck-e-kpis__name">{str(k.name)}</span>
              <span className="ck-e-kpis__type">{str(k.metricType)}</span>
              <span className="ck-e-kpis__target">{str(k.target)}</span>
              <span className="ck-e-kpis__freq">{str(k.frequency)}</span>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Principes communautaires ───────────────────────────────────────────

function Principes({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Principes communautaires" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-e-princ">
          {arr.map((p, i) => (
            <div className="ck-e-princ__p" key={i}>
              <span className="ck-e-princ__t">{str(p.principle)}</span>
              {!isEmpty(p.enforcement) ? <span className="ck-e-princ__e">⚖ {str(p.enforcement)}</span> : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Liste « religion de marque » ───────────────────────────────────────

function RelList({ title, items, status, cols, span }: { title: string; items: unknown; status?: string; cols: Array<[string, string]>; span?: boolean }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={title + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span={span}>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-e-rel">
          {arr.map((it, i) => (
            <div className="ck-e-rel__row" key={i}>
              {cols.map(([k, label]) => (!isEmpty(it[k]) ? (
                <div className="ck-e-rel__cell" key={k}><span className="ck-e-rel__k">{label}</span><span className="ck-e-rel__v">{Array.isArray(it[k]) ? (it[k] as unknown[]).map(str).join(", ") : str(it[k])}</span></div>
              ) : null))}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarEFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "e");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.E as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Promesse d'expérience" sub="Ce que chaque interaction doit faire ressentir">
        <div className="ck-a-grid">
          <EStatement label="Promesse d'expérience" value={v.promesseExperience} status={st("promesseExperience")} big />
          <EStatement label="Canal principal" value={v.primaryChannel} status={st("primaryChannel")} />
          <ObjCard title="Portrait du superfan" value={v.superfanPortrait} status={st("superfanPortrait")} span
            fields={[["personaRef", "Persona réf."], ["profile", "Profil"], ["motivations", "Motivations"], ["barriers", "Barrières"]]} />
        </div>
      </Section>

      <Section title="Parcours d'engagement" sub="Le funnel AARRR, les points de contact et leur orchestration">
        <div className="ck-a-grid">
          <Aarrr value={v.aarrr} status={st("aarrr")} />
          <Touchpoints items={v.touchpoints} status={st("touchpoints")} />
          <ProofList title="Map produit × expérience" items={v.productExperienceMap} status={st("productExperienceMap")}
            cols={[["productRef", "Produit"], ["experienceDescription", "Expérience"], ["emotionalOutcome", "Résultat émotionnel"]]} />
          <ProofList title="Échelle dévotion × produit" items={v.ladderProductAlignment} status={st("ladderProductAlignment")}
            cols={[["devotionLevel", "Niveau"], ["productTierRef", "Palier"], ["entryAction", "Action d'entrée"], ["upgradeAction", "Action de montée"]]} />
          <ProofList title="Déclencheurs de conversion" items={v.conversionTriggers} status={st("conversionTriggers")}
            cols={[["fromLevel", "De"], ["toLevel", "Vers"], ["trigger", "Déclencheur"], ["channel", "Canal"]]} />
          <ProofList title="Barrières à l'engagement" items={v.barriersEngagement} status={st("barriersEngagement")}
            cols={[["level", "Niveau"], ["barrier", "Barrière"], ["mitigation", "Mitigation"]]} />
          <ProofList title="Canaux × points de contact" items={v.channelTouchpointMap} status={st("channelTouchpointMap")}
            cols={[["salesChannel", "Canal de vente"], ["touchpointRefs", "Points de contact"]]} />
        </div>
      </Section>

      <Section title="Rituels & mesure" sub="Les rituels récurrents, les KPIs et les principes de la communauté">
        <div className="ck-a-grid">
          <Rituels items={v.rituels} status={st("rituels")} />
          <Kpis items={v.kpis} status={st("kpis")} />
          <Principes items={v.principesCommunautaires} status={st("principesCommunautaires")} />
          <ObjCard title="Gamification" value={v.gamification} status={st("gamification")}
            fields={[["niveaux", "Niveaux"], ["recompenses", "Récompenses"]]} />
        </div>
      </Section>

      <Section title="Religion de marque" sub="La couche culte — commandements, tabous, calendrier sacré, clergé, évangélisation">
        <div className="ck-a-grid">
          <RelList title="Commandements" items={v.commandments} status={st("commandments")}
            cols={[["commandment", "Commandement"], ["justification", "Justification"]]} />
          <RelList title="Tabous" items={v.taboos} status={st("taboos")}
            cols={[["taboo", "Tabou"], ["consequence", "Conséquence"]]} />
          <RelList title="Calendrier sacré" items={v.sacredCalendar} status={st("sacredCalendar")}
            cols={[["name", "Événement"], ["date", "Date / période"], ["significance", "Signification"]]} />
          <RelList title="Sacrements" items={v.sacraments} status={st("sacraments")} span
            cols={[["nomSacre", "Nom sacré"], ["trigger", "Déclencheur"], ["action", "Action"], ["reward", "Récompense"], ["kpi", "KPI"], ["aarrStage", "Étape AARRR"]]} />
          <RelList title="Rites de passage" items={v.ritesDePassage} status={st("ritesDePassage")}
            cols={[["fromStage", "De"], ["toStage", "Vers"], ["rituelEntree", "Rituel d'entrée"], ["symboles", "Symboles"]]} />
          <RelList title="Pèlerinages" items={v.pelerinages} status={st("pelerinages")}
            cols={[["name", "Nom"], ["frequency", "Fréquence"], ["location", "Lieu"], ["expectedAttendance", "Affluence"], ["devotionLevelTarget", "Niveau cible"]]} />
          <ObjCard title="Structure du clergé" value={v.clergeStructure} status={st("clergeStructure")}
            fields={[["communityManager", "Community manager"], ["ambassadeurs", "Ambassadeurs"], ["supportTeam", "Équipe support"], ["specialists", "Spécialistes"]]} />
          <ObjCard title="Programme d'évangélisation" value={v.programmeEvangelisation} status={st("programmeEvangelisation")}
            fields={[["referralProgram", "Parrainage"], ["brandAdvocacyProgram", "Advocacy"], ["communityRecruitment", "Recrutement"]]} />
          <ObjCard title="Construction de communauté" value={v.communityBuilding} status={st("communityBuilding")}
            fields={[["platforms", "Plateformes"], ["moderationRules", "Modération"], ["growthMechanics", "Croissance"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier E</p>
      </Section>
    </>
  );
}
