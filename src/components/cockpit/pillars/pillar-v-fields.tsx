"use client";

/**
 * Pilier V (Valeur / Offre & Pricing) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-v.jsx). Palette V = emerald (var(--success)).
 * Modèle économique, couche gratuite, CATALOGUE PRODUITS avec matrice de valeur 2×2×2
 * (gain/coût × client/marque × concret/abstrait), échelle produit, unit economics,
 * matrice valeur/coût tangible-intangible, MVP, PI, ROI, multisensoriel, sacrifice, packaging.
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, TagRow, ObjCard, ProofList,
  isEmpty, asRec, asArr, str, makeStatusFor, type Rec,
} from "./pillar-kit";

const fcfa = (n: unknown): string => {
  if (typeof n !== "number") return str(n);
  return n === 0 ? "Gratuit" : `${new Intl.NumberFormat("fr-FR").format(n)} F`;
};

function VStatement({ label, value, status, big }: { label: string; value: unknown; status?: string; big?: boolean }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(value)}>
      {isEmpty(value) ? <EmptyBody /> : <p className={`ck-a-stmt${big ? " ck-a-stmt--big" : ""}`}>{str(value)}</p>}
    </ACard>
  );
}
function VTagCard({ label, items, status, tone }: { label: string; items: unknown; status?: string; tone?: string }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(items)}>
      {isEmpty(items) ? <EmptyBody /> : <TagRow items={items} tone={tone} />}
    </ACard>
  );
}

// ── Couche gratuite ────────────────────────────────────────────────────

function FreeLayer({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  return (
    <ACard title="Couche gratuite (freemium)" status={status} empty={empty}>
      {empty ? <EmptyBody /> : (
        <div className="ck-v-free">
          <div className="ck-v-free__cell pos"><span className="ck-v-free__k">Gratuit</span>{str(o.whatIsFree) || "—"}</div>
          <div className="ck-v-free__cell pay"><span className="ck-v-free__k">Payant</span>{str(o.whatIsPaid) || "—"}</div>
          {!isEmpty(o.conversionLever) ? <div className="ck-v-free__lever"><span className="ck-v-free__k">Levier de conversion</span>{str(o.conversionLever)}</div> : null}
        </div>
      )}
    </ACard>
  );
}

// ── Matrice de valeur 2×2×2 ────────────────────────────────────────────

function ValueMatrix({ p }: { p: Rec }) {
  const cell = (label: string, concret: unknown, abstrait: unknown, tone: string) => (
    <div className={`ck-v-mx__cell ${tone}`}>
      <span className="ck-v-mx__lbl">{label}</span>
      <div className="ck-v-mx__ca">
        <div className="ck-v-mx__ci"><i>Concret</i>{isEmpty(concret) ? <span className="ck-af__empty">—</span> : str(concret)}</div>
        <div className="ck-v-mx__ci"><i>Abstrait</i>{isEmpty(abstrait) ? <span className="ck-af__empty">—</span> : str(abstrait)}</div>
      </div>
    </div>
  );
  return (
    <div className="ck-v-mx">
      <div className="ck-v-mx__corner" />
      <div className="ck-v-mx__head">Client</div>
      <div className="ck-v-mx__head">Marque</div>
      <div className="ck-v-mx__rowh pos">Gain</div>
      {cell("Gain client", p.gainClientConcret, p.gainClientAbstrait, "pos")}
      {cell("Gain marque", p.gainMarqueConcret, p.gainMarqueAbstrait, "pos")}
      <div className="ck-v-mx__rowh neg">Coût</div>
      {cell("Coût client", p.coutClientConcret, p.coutClientAbstrait, "neg")}
      {cell("Coût marque", p.coutMarqueConcret, p.coutMarqueAbstrait, "neg")}
    </div>
  );
}

function Catalogue({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Catalogue produits" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-v-cat">
          {arr.map((p, i) => (
            <div className="ck-v-prod" key={i}>
              <div className="ck-v-prod__head">
                <div className="ck-v-prod__id">
                  <span className="ck-v-prod__name">{str(p.nom)}</span>
                  <span className="ck-v-prod__cat">{[p.categorie, p.skuRef].filter((x) => !isEmpty(x)).map(str).join(" · ")}</span>
                </div>
                <div className="ck-v-prod__econ">
                  <div className="ck-v-prod__price">{fcfa(p.prix)}</div>
                  {!isEmpty(p.margeUnitaire) ? <div className="ck-v-prod__marge">marge {fcfa(p.margeUnitaire)}</div> : null}
                </div>
              </div>
              <ValueMatrix p={p} />
              <div className="ck-v-prod__meta">
                {!isEmpty(p.lienPromesse) ? <span className="ck-fc__tag" data-tone="emerald">⛓ {str(p.lienPromesse)}</span> : null}
                {!isEmpty(p.segmentCible) ? <span className="ck-fc__tag" data-tone="neutral">Cible · {str(p.segmentCible)}</span> : null}
                {!isEmpty(p.phaseLifecycle) ? <span className="ck-fc__tag" data-tone="neutral">{str(p.phaseLifecycle)}</span> : null}
                {!isEmpty(p.maslowMapping) ? <span className="ck-fc__tag" data-tone="neutral">Maslow · {str(p.maslowMapping)}</span> : null}
                {(Array.isArray(p.lf8Trigger) ? p.lf8Trigger : []).map((t, j) => <span className="ck-fc__tag" data-tone="info" key={j}>LF8 · {str(t)}</span>)}
                {!isEmpty(p.scoreEmotionnelADVE) ? <span className="ck-v-prod__score">ADVE {str(p.scoreEmotionnelADVE)}</span> : null}
              </div>
              {!isEmpty(p.canalDistribution) ? (
                <div className="ck-v-prod__canaux">
                  {(Array.isArray(p.canalDistribution) ? p.canalDistribution : [p.canalDistribution]).map((c, j) => <span className="ck-v-prod__canal" key={j}>{str(c)}</span>)}
                  {!isEmpty(p.disponibilite) ? <span className="ck-v-prod__dispo">{str(p.disponibilite)}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

function ProductLadder({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title="Échelle produit" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-v-ladder">
          {arr.map((t, i) => (
            <div className="ck-v-ladder__step" key={i} style={{ "--i": i, "--n": arr.length } as React.CSSProperties}>
              <div className="ck-v-ladder__bar">
                <span className="ck-v-ladder__tier">{str(t.tier)}</span>
                <span className="ck-v-ladder__price">{fcfa(t.prix)}</span>
              </div>
              <div className="ck-v-ladder__txt">
                {!isEmpty(t.description) ? <span className="ck-v-ladder__desc">{str(t.description)}</span> : null}
                {!isEmpty(t.cible) ? <span className="ck-v-ladder__cible">{str(t.cible)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

function UnitEconomics({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const K: Array<[string, string, (x: unknown) => string]> = [
    ["cac", "CAC", fcfa], ["ltv", "LTV", fcfa], ["ltvCacRatio", "LTV / CAC", (x) => `${str(x)}x`],
    ["margeNette", "Marge nette", (x) => `${str(x)} %`], ["roiEstime", "ROI estimé", str], ["paybackPeriod", "Payback", (x) => `${str(x)} mois`],
    ["budgetCom", "Budget com", fcfa], ["caVise", "CA visé", fcfa],
  ];
  return (
    <ACard title="Unit Economics" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-v-econ">
          {K.map(([k, label, fmt]) => (!isEmpty(o[k]) ? (
            <div className="ck-v-econ__c" key={k}><span className="ck-v-econ__k">{label}</span><span className="ck-v-econ__v">{fmt(o[k])}</span></div>
          ) : null))}
        </div>
      )}
    </ACard>
  );
}

function ValueCostMatrix({ v, status }: { v: Rec; status?: string }) {
  const Q: Array<[string, string, string, string]> = [
    ["Valeur client", "valeurClientTangible", "valeurClientIntangible", "pos"],
    ["Valeur marque", "valeurMarqueTangible", "valeurMarqueIntangible", "pos"],
    ["Coût client", "coutClientTangible", "coutClientIntangible", "neg"],
    ["Coût marque", "coutMarqueTangible", "coutMarqueIntangible", "neg"],
  ];
  const anyFilled = Q.some(([, t, i]) => !isEmpty(v[t]) || !isEmpty(v[i]));
  const tagsOf = (val: unknown) => (isEmpty(val) ? <span className="ck-af__empty">—</span>
    : <div className="ck-fc__tags">{(Array.isArray(val) ? val : [val]).map((x, j) => <span className="ck-fc__tag" data-tone="neutral" key={j}>{str(x)}</span>)}</div>);
  return (
    <ACard title="Matrice valeur / coût" status={status} empty={!anyFilled} span>
      {!anyFilled ? <EmptyBody /> : (
        <div className="ck-v-vc">
          {Q.map(([label, tk, ik, tone]) => (
            <div className={`ck-v-vc__q ${tone}`} key={tk}>
              <span className="ck-v-vc__h">{label}</span>
              <div className="ck-v-vc__sub"><i>Tangible</i>{tagsOf(v[tk])}</div>
              <div className="ck-v-vc__sub"><i>Intangible</i>{tagsOf(v[ik])}</div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

function MultiSens({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = asRec(value);
  const S: Array<[string, string, string]> = [["vue", "Vue", "👁"], ["ouie", "Ouïe", "🔊"], ["odorat", "Odorat", "👃"], ["toucher", "Toucher", "✋"], ["gout", "Goût", "👅"]];
  return (
    <ACard title="Expérience multisensorielle" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-v-sens">
          {S.map(([k, label, sym]) => (
            <div className="ck-v-sens__s" key={k}><span className="ck-v-sens__sym">{sym}</span><span className="ck-v-sens__k">{label}</span><span className="ck-v-sens__v">{isEmpty(o[k]) ? <EmptyValue /> : str(o[k])}</span></div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

// ── Système produit (ADR-0170 — le mécanisme interne du produit) ─────────
function ProductSystem({ value, status }: { value: unknown; status?: string }) {
  const ps = asRec(value);
  const dims: Array<[string, string, Array<[string, string]>]> = [
    ["axes", "Axes du mécanisme", [["label", "Axe"], ["poleLow", "Pôle bas"], ["poleHigh", "Pôle haut"], ["description", "Description"]]],
    ["archetypes", "Archétypes", [["name", "Nom"], ["axesSignature", "Signature"], ["essence", "Essence"], ["progressionNames", "Noms progressifs"]]],
    ["progressionStages", "Stades de progression", [["name", "Stade"], ["threshold", "Seuil"], ["signals", "Signaux"], ["unlocks", "Débloque"]]],
    ["modes", "Modes d'usage", [["name", "Mode"], ["trigger", "Déclencheur"], ["format", "Format"], ["description", "Description"]]],
    ["artifacts", "Artefacts / collectibles", [["name", "Nom"], ["kind", "Type"], ["description", "Description"], ["socialSignal", "Signal social"]]],
    ["mechanics", "Règles fondatrices", [["name", "Règle"], ["rule", "Énoncé"]]],
  ];
  const present = dims.filter(([k]) => asArr(ps[k]).length > 0);
  const allEmpty = isEmpty(ps.coreConcept) && present.length === 0;
  return (
    <ACard title="Système produit" status={status} empty={allEmpty} span>
      {allEmpty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-v-psys">
          {!isEmpty(ps.coreConcept) ? <p className="ck-a-stmt ck-a-stmt--big">{str(ps.coreConcept)}</p> : null}
          <div className="ck-a-grid">
            {present.map(([k, label, cols]) => (
              <ProofList key={k} title={label} items={ps[k]} cols={cols} />
            ))}
          </div>
        </div>
      )}
    </ACard>
  );
}

export function PillarVFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "v");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.V as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Modèle économique" sub="Comment la marque crée et capte de la valeur">
        <div className="ck-a-grid">
          <VStatement label="Business model" value={v.businessModel} status={st("businessModel")} />
          <VStatement label="Archétype de positionnement" value={v.positioningArchetype} status={st("positioningArchetype")} />
          <VTagCard label="Modèles économiques" items={v.economicModels} status={st("economicModels")} tone="emerald" />
          <VStatement label="Canal de vente" value={v.salesChannel} status={st("salesChannel")} />
          <FreeLayer value={v.freeLayer} status={st("freeLayer")} />
          <VStatement label="Promesse de valeur" value={v.promesseDeValeur} status={st("promesseDeValeur")} big />
          <VStatement label="Justification du pricing" value={v.pricingJustification} status={st("pricingJustification")} />
        </div>
      </Section>

      <Section title="Catalogue & offre" sub="Chaque produit et sa matrice de valeur 2×2×2 (gain/coût × client/marque × concret/abstrait)">
        <div className="ck-a-grid">
          <ProofList title="Persona × Segment" items={v.personaSegmentMap} status={st("personaSegmentMap")}
            cols={[["personaName", "Persona"], ["productNames", "Produits"], ["devotionLevel", "Niveau d'engagement"], ["revenueContributionPct", "% CA"]]} />
          <Catalogue items={v.produitsCatalogue} status={st("produitsCatalogue")} />
          <ProductLadder items={v.productLadder} status={st("productLadder")} />
        </div>
      </Section>

      <Section title="Système produit" sub="Le mécanisme interne du produit — axes, archétypes, progression, modes, artefacts, règles (distinct du catalogue)">
        <div className="ck-a-grid">
          <ProductSystem value={v.productSystem} status={st("productSystem")} />
        </div>
      </Section>

      <Section title="Économie & valeur" sub="Unit economics et la matrice valeur / coût">
        <div className="ck-a-grid">
          <UnitEconomics value={v.unitEconomics} status={st("unitEconomics")} />
          <ValueCostMatrix v={v} status={st("valeurClientTangible")} />
        </div>
      </Section>

      <Section title="Produit & preuves" sub="MVP, propriété intellectuelle, preuves de ROI, expérience">
        <div className="ck-a-grid">
          <ObjCard title="MVP / Produit" value={v.mvp} status={st("mvp")}
            fields={[["exists", "Existe"], ["stage", "Stade"], ["description", "Description"], ["features", "Fonctionnalités"], ["userCount", "Utilisateurs"]]} />
          <ObjCard title="Propriété intellectuelle" value={v.proprieteIntellectuelle} status={st("proprieteIntellectuelle")}
            fields={[["brevets", "Brevets"], ["secretsCommerciaux", "Secrets commerciaux"], ["technologieProprietary", "Techno propriétaire"], ["barrieresEntree", "Barrières à l'entrée"], ["protectionScore", "Score protection /10"]]} />
          <ProofList title="Preuves de ROI" items={v.roiProofs} status={st("roiProofs")}
            cols={[["client", "Client"], ["beforeMetric", "Avant"], ["afterMetric", "Après"], ["lift", "Gain"], ["timeframe", "Période"]]} />
          <MultiSens value={v.experienceMultisensorielle} status={st("experienceMultisensorielle")} />
          <ObjCard title="Sacrifice requis" value={v.sacrificeRequis} status={st("sacrificeRequis")}
            fields={[["prix", "Prix"], ["temps", "Temps"], ["effort", "Effort"], ["justification", "Justification"]]} />
          <ObjCard title="Expérience packaging" value={v.packagingExperience} status={st("packagingExperience")}
            fields={[["unboxingRitual", "Rituel d'unboxing"], ["packagingMaterial", "Matériau"], ["deliveryMode", "Mode de livraison"], ["instagrammable", "Instagrammable"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier V</p>
      </Section>
    </>
  );
}
