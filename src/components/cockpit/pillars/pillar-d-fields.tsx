"use client";

/**
 * Pilier D (Distinction / Positionnement) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-d.jsx). Palette D = bleu (var(--info)).
 * Personas riches, paysage concurrentiel, ton de voix (on dit / on ne dit pas),
 * assets linguistiques, objets sacrés, direction artistique, proof points,
 * symboles, SWOT flash, ESOV, barrières, ratio histoire/preuve.
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, TagRow, ObjCard, ProofList,
  isEmpty, asRec, asArr, str, makeStatusFor, type Rec,
} from "./pillar-kit";

function DStatement({ label, value, status, big }: { label: string; value: unknown; status?: string; big?: boolean }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(value)}>
      {isEmpty(value) ? <EmptyBody /> : <p className={`ck-a-stmt${big ? " ck-a-stmt--big" : ""}`}>{str(value)}</p>}
    </ACard>
  );
}
function DTagCard({ label, items, status, tone }: { label: string; items: unknown; status?: string; tone?: string }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(items)}>
      {isEmpty(items) ? <EmptyBody /> : <TagRow items={items} tone={tone} />}
    </ACard>
  );
}

// ── Personas ───────────────────────────────────────────────────────────

function Personas({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  const ROWS: Array<[string, string]> = [
    ["lifestyle", "Style de vie"], ["familySituation", "Situation familiale"],
    ["whatTheyActuallyBuy", "Ce qu'ils achètent vraiment"], ["hiddenDesire", "Désir caché"],
    ["jobsToBeDone", "Jobs to be done"], ["decisionProcess", "Processus de décision"],
    ["mediaConsumption", "Conso média"], ["brandRelationships", "Relation aux marques"],
  ];
  return (
    <ACard title={"Personas" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-d-personas">
          {arr.map((p, i) => (
            <div className="ck-d-persona" key={i}>
              <div className="ck-d-persona__head">
                <div className="ck-d-persona__av">{(str(p.name) || "?").slice(0, 1).toUpperCase()}</div>
                <div className="ck-d-persona__id">
                  <span className="ck-d-persona__name">{str(p.name)}{!isEmpty(p.age) ? <i>· {str(p.age)} ans</i> : null}</span>
                  <span className="ck-d-persona__line">{[p.csp, p.location, p.income].filter((x) => !isEmpty(x)).map(str).join(" · ")}</span>
                </div>
                {!isEmpty(p.devotionPotential) ? <span className="ck-d-persona__dev" data-lvl={str(p.devotionPotential)}>{str(p.devotionPotential)}</span> : null}
              </div>
              <div className="ck-d-persona__chips">
                {!isEmpty(p.lf8Dominant) ? <span className="ck-fc__tag" data-tone="info">LF8 · {str(p.lf8Dominant)}</span> : null}
                {!isEmpty(p.tensionProfile) ? <span className="ck-fc__tag" data-tone="neutral">{str(p.tensionProfile)}</span> : null}
                {(Array.isArray(p.schwartzValues) ? p.schwartzValues : []).map((s, j) => <span className="ck-fc__tag" data-tone="neutral" key={`sv${j}`}>{str(s)}</span>)}
              </div>
              <div className="ck-d-persona__cols">
                {!isEmpty(p.motivations) ? <div className="ck-d-persona__col"><span className="ck-d-persona__k pos">Motivations</span><ul>{(Array.isArray(p.motivations) ? p.motivations : [p.motivations]).map((m, j) => <li key={j}>{str(m)}</li>)}</ul></div> : null}
                {!isEmpty(p.fears) ? <div className="ck-d-persona__col"><span className="ck-d-persona__k neg">Craintes</span><ul>{(Array.isArray(p.fears) ? p.fears : [p.fears]).map((m, j) => <li key={j}>{str(m)}</li>)}</ul></div> : null}
              </div>
              <div className="ck-d-persona__rows">
                {ROWS.map(([k, label]) => (!isEmpty(p[k]) ? (
                  <div className="ck-d-persona__row" key={k}>
                    <span className="ck-d-persona__rk">{label}</span>
                    <span className="ck-d-persona__rv">{Array.isArray(p[k]) ? (p[k] as unknown[]).map(str).join(", ") : str(p[k])}</span>
                  </div>
                ) : null))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Paysage concurrentiel ──────────────────────────────────────────────

function Concurrence({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Paysage concurrentiel" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-d-comp">
          {arr.map((c, i) => (
            <div className="ck-d-comp__row" key={i}>
              <div className="ck-d-comp__top">
                <span className="ck-d-comp__name">{str(c.name)}</span>
                {!isEmpty(c.partDeMarcheEstimee) ? <span className="ck-d-comp__pdm">PDM · {str(c.partDeMarcheEstimee)}</span> : null}
                {!isEmpty(c.strategiePos) ? <span className="ck-d-comp__pos">{str(c.strategiePos)}</span> : null}
              </div>
              <div className="ck-d-comp__sides">
                {!isEmpty(c.avantagesCompetitifs) ? <div className="ck-d-comp__side pos"><span>Forces</span>{(Array.isArray(c.avantagesCompetitifs) ? c.avantagesCompetitifs : [c.avantagesCompetitifs]).map(str).join(", ")}</div> : null}
                {!isEmpty(c.faiblesses) ? <div className="ck-d-comp__side neg"><span>Faiblesses</span>{(Array.isArray(c.faiblesses) ? c.faiblesses : [c.faiblesses]).map(str).join(", ")}</div> : null}
              </div>
              {!isEmpty(c.distinctiveAssets) ? <div className="ck-d-comp__assets">{(Array.isArray(c.distinctiveAssets) ? c.distinctiveAssets : [c.distinctiveAssets]).map((a, j) => <span className="ck-fc__tag" data-tone="neutral" key={j}>{str(a)}</span>)}</div> : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Ton de voix ────────────────────────────────────────────────────────

function TonDeVoix({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  return (
    <ACard title="Ton de voix" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-d-voice">
          {!isEmpty(obj.personnalite) ? (
            <div className="ck-d-voice__traits">
              {(Array.isArray(obj.personnalite) ? obj.personnalite : [obj.personnalite]).map((t, i) => <span className="ck-d-voice__trait" key={i}>{str(t)}</span>)}
            </div>
          ) : null}
          <div className="ck-d-voice__say">
            <div className="ck-d-voice__col pos">
              <span className="ck-d-voice__h">✓ On dit</span>
              {isEmpty(obj.onDit) ? <EmptyValue /> : <ul>{(Array.isArray(obj.onDit) ? obj.onDit : [obj.onDit]).map((x, i) => <li key={i}>{str(x)}</li>)}</ul>}
            </div>
            <div className="ck-d-voice__col neg">
              <span className="ck-d-voice__h">✕ On ne dit pas</span>
              {(() => { const v = obj.onNeditPas ?? obj.onNeDitPas; return isEmpty(v) ? <EmptyValue /> : <ul>{(Array.isArray(v) ? v : [v]).map((x, i) => <li key={i}>{str(x)}</li>)}</ul>; })()}
            </div>
          </div>
        </div>
      )}
    </ACard>
  );
}

// ── Assets linguistiques ───────────────────────────────────────────────

function AssetsLinguistiques({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  const SINGLE: Array<[string, string]> = [["slogan", "Slogan"], ["tagline", "Tagline"], ["motto", "Motto"]];
  return (
    <ACard title="Assets linguistiques" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-d-ling">
          {SINGLE.map(([k, label]) => (!isEmpty(obj[k]) ? (
            <div className="ck-d-ling__hero" key={k}><span className="ck-d-ling__k">{label}</span><span className="ck-d-ling__v">« {str(obj[k])} »</span></div>
          ) : null))}
          {!isEmpty(obj.mantras) ? <div className="ck-d-ling__row"><span className="ck-d-ling__k">Mantras</span><div className="ck-fc__tags">{(Array.isArray(obj.mantras) ? obj.mantras : [obj.mantras]).map((m, i) => <span className="ck-fc__tag" data-tone="info" key={i}>{str(m)}</span>)}</div></div> : null}
          {!isEmpty(obj.lexiquePropre) ? <div className="ck-d-ling__row"><span className="ck-d-ling__k">Lexique propre</span><div className="ck-fc__tags">{(Array.isArray(obj.lexiquePropre) ? obj.lexiquePropre : [obj.lexiquePropre]).map((m, i) => <span className="ck-fc__tag" data-tone="neutral" key={i}>{str(m)}</span>)}</div></div> : null}
        </div>
      )}
    </ACard>
  );
}

// ── Objets sacrés ──────────────────────────────────────────────────────

function SacredObjects({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Objets sacrés" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-d-sacred">
          {arr.map((o, i) => (
            <div className="ck-d-sacred__o" key={i}>
              <div className="ck-d-sacred__top"><span className="ck-d-sacred__name">{str(o.name)}</span>{!isEmpty(o.form) ? <span className="ck-d-sacred__form">{str(o.form)}</span> : null}</div>
              {!isEmpty(o.narrative) ? <p className="ck-d-sacred__nar">{str(o.narrative)}</p> : null}
              <div className="ck-d-sacred__meta">
                {!isEmpty(o.stage) ? <span className="ck-fc__tag" data-tone="neutral">{str(o.stage)}</span> : null}
                {!isEmpty(o.socialSignal) ? <span className="ck-fc__tag" data-tone="info">⚑ {str(o.socialSignal)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Direction artistique (forme compacte OU riche) ─────────────────────
// Deux formes légitimes coexistent : compacte `{univers, principes}` (canon /
// humain, la matière réelle d'un Brand Book) et riche `{semioticAnalysis,
// moodboard, chromaticStrategy, typographySystem, …}` (sortie des Glory
// créatifs). Le renderer affiche celle qui est présente — aucune n'écrase
// l'autre, aucune donnée n'est inventée.
function DirectionArtistique({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  const RICH: Array<[string, string]> = [
    ["semioticAnalysis", "Analyse sémiotique"], ["visualLandscape", "Paysage visuel"],
    ["moodboard", "Moodboard"], ["chromaticStrategy", "Stratégie chromatique"],
    ["typographySystem", "Système typographique"], ["logoTypeRecommendation", "Reco logotype"],
    ["logoValidation", "Validation logo"], ["designTokens", "Design tokens"],
    ["motionIdentity", "Identité motion"], ["brandGuidelines", "Brand guidelines"],
    ["lsiMatrix", "Matrice LSI"],
  ];
  const richPresent = RICH.filter(([k]) => !isEmpty(obj[k]));
  return (
    <ACard title="Direction artistique" status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-obj">
          {!isEmpty(obj.univers) ? (
            <div className="ck-a-obj__row">
              <span className="ck-a-obj__k">Univers</span>
              <div className="ck-a-obj__v"><p className="ck-a-stmt">{str(obj.univers)}</p></div>
            </div>
          ) : null}
          {!isEmpty(obj.principes) ? (
            <div className="ck-a-obj__row">
              <span className="ck-a-obj__k">Principes</span>
              <div className="ck-a-obj__v"><TagRow items={obj.principes} tone="info" /></div>
            </div>
          ) : null}
          {richPresent.map(([k, label]) => (
            <div className="ck-a-obj__row" key={k}>
              <span className="ck-a-obj__k">{label}</span>
              <div className="ck-a-obj__v">
                {Array.isArray(obj[k]) ? <TagRow items={obj[k]} /> : <span>{str(obj[k])}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Ratio histoire / preuve ────────────────────────────────────────────

function StoryRatio({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  const s = Number(obj.storytellingPct) || 0;
  const e = Number(obj.evidencePct) || (100 - s);
  return (
    <ACard title="Ratio histoire / preuve" status={status} empty={empty}>
      {empty ? <EmptyBody /> : (
        <div className="ck-d-ratio">
          <div className="ck-d-ratio__bar"><span className="ck-d-ratio__story" style={{ width: `${s}%` }}>{s}%</span><span className="ck-d-ratio__evi" style={{ width: `${e}%` }}>{e}%</span></div>
          <div className="ck-d-ratio__leg"><span><i className="story" /> Storytelling</span><span><i className="evi" /> Preuve</span>{!isEmpty(obj.target) ? <span className="ck-d-ratio__target">Cible · {str(obj.target)}</span> : null}</div>
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarDFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "d");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.D as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Positionnement" sub="La place revendiquée — promesse maître et sous-promesses">
        <div className="ck-a-grid">
          <DStatement label="Positionnement" value={v.positionnement} status={st("positionnement")} big />
          <DStatement label="Promesse maître" value={v.promesseMaitre} status={st("promesseMaitre")} big />
          <DTagCard label="Sous-promesses" items={v.sousPromesses} status={st("sousPromesses")} tone="info" />
          <DStatement label="Positionnement émotionnel" value={v.positionnementEmotionnel} status={st("positionnementEmotionnel")} />
          <ObjCard title="Expression archétypale" value={v.archetypalExpression} status={st("archetypalExpression")}
            fields={[["visualTranslation", "Traduction visuelle"], ["verbalTranslation", "Traduction verbale"], ["emotionalRegister", "Registre émotionnel"]]} />
        </div>
      </Section>

      <Section title="Cibles" sub="Les personas — qui adresse-t-on, et que cherchent-ils vraiment">
        <div className="ck-a-grid"><Personas items={v.personas} status={st("personas")} /></div>
      </Section>

      <Section title="Concurrence" sub="Le paysage concurrentiel et la défensabilité">
        <div className="ck-a-grid">
          <Concurrence items={v.paysageConcurrentiel} status={st("paysageConcurrentiel")} />
          <ObjCard title="SWOT flash" value={v.swotFlash} status={st("swotFlash")}
            fields={[["strength", "Force"], ["weakness", "Faiblesse"], ["opportunity", "Opportunité"], ["threat", "Menace"]]} />
          <ObjCard title="ESOV (part de voix)" value={v.esov} status={st("esov")}
            fields={[["value", "Valeur"], ["measurementMethod", "Méthode"], ["lastMeasured", "Dernière mesure"], ["source", "Source"]]} />
          <ProofList title="Barrières à l'imitation" items={v.barriersImitation} status={st("barriersImitation")}
            cols={[["barrier", "Barrière"], ["defensibility", "Défensabilité"], ["category", "Catégorie"], ["expectedDuration", "Durée estimée"]]} />
        </div>
      </Section>

      <Section title="Territoire verbal & visuel" sub="La voix, le lexique, la direction artistique, les symboles">
        <div className="ck-a-grid">
          <TonDeVoix value={v.tonDeVoix} status={st("tonDeVoix")} />
          <AssetsLinguistiques value={v.assetsLinguistiques} status={st("assetsLinguistiques")} />
          <DirectionArtistique value={v.directionArtistique} status={st("directionArtistique")} />
          <SacredObjects items={v.sacredObjects} status={st("sacredObjects")} />
          <ProofList title="Proof points" items={v.proofPoints} status={st("proofPoints")}
            cols={[["type", "Type"], ["claim", "Affirmation"], ["evidence", "Preuve"], ["source", "Source"]]} />
          <ProofList title="Symboles" items={v.symboles} status={st("symboles")}
            cols={[["symbol", "Symbole"], ["meanings", "Significations"], ["usageContexts", "Contextes d'usage"]]} />
          <StoryRatio value={v.storyEvidenceRatio} status={st("storyEvidenceRatio")} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier D</p>
      </Section>
    </>
  );
}
