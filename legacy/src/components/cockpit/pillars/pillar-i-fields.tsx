"use client";

/**
 * Pilier I (Innovation / Potentiel) — renderer bespoke.
 * Porté du handoff claude.ai/design (pillar-i.jsx). Régime CONTENU GÉNÉRÉ.
 * Plateforme/copy/big idea, innovations produit, tests & mitigation, assets &
 * activations, budget potentiel & media plan. Hue I = orange.
 *
 * ⚠️ ADR-0094 — le catalogue d'actions canonique (actionsByDevotionLevel /
 * actionsByOvertonPhase / catalogueParCanal / totalActions) est rendu par le
 * `ActionDatabasePanel` gouverné (projection BrandAction) au-dessus de ce body,
 * PAS ici : on ne re-render donc PAS ces collections blob (elles sont remplacées
 * par la table requêtable). Ce renderer couvre les champs I complémentaires.
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, ObjCard, ProofList,
  isEmpty, asArr, str, makeStatusFor, type Rec,
} from "./pillar-kit";

// ── Innovations produit ────────────────────────────────────────────────

function Innovations({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Innovations produit / marque" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-i-innovs">
          {arr.map((it, i) => (
            <div className="ck-i-innov" key={i}>
              <div className="ck-i-innov__head">
                <span className="ck-i-innov__name">{str(it.name)}</span>
                {!isEmpty(it.type) ? <span className="ck-i-innov__type">{str(it.type).replace(/_/g, " ")}</span> : null}
              </div>
              {!isEmpty(it.description) ? <p className="ck-i-innov__desc">{str(it.description)}</p> : null}
              <div className="ck-i-innov__meta">
                {!isEmpty(it.feasibility) ? <span className="ck-i-chip" data-f={str(it.feasibility)}>Faisabilité {str(it.feasibility)}</span> : null}
                {!isEmpty(it.horizon) ? <span className="ck-fc__tag" data-tone="orange">{str(it.horizon)}</span> : null}
                {!isEmpty(it.devotionImpact) ? <span className="ck-fc__tag" data-tone="neutral">→ {str(it.devotionImpact)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Budget potentiel ───────────────────────────────────────────────────

function PotentielBudget({ value, status }: { value: unknown; status?: string }) {
  const empty = isEmpty(value);
  const o = (value && typeof value === "object" ? value : {}) as Rec;
  const K: Array<[string, string]> = [["production", "Production"], ["media", "Média"], ["talent", "Talent"], ["logistics", "Logistique"], ["technology", "Technologie"], ["total", "Total"]];
  return (
    <ACard title="Budget potentiel" status={status} empty={empty}>
      {empty ? <EmptyBody /> : (
        <div className="ck-i-budget">
          {K.map(([k, label]) => (!isEmpty(o[k]) ? (
            <div className={`ck-i-budget__r${k === "total" ? " total" : ""}`} key={k}><span>{label}</span><b>{str(o[k])}</b></div>
          ) : null))}
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarIFields({ content, certainty }: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "i");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.I as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;
  const nbActions = typeof v.totalActions === "number" ? v.totalActions : 0;

  return (
    <>
      <Section title="Plateforme de marque" sub="Le socle généré — plateforme, copy strategy, big idea">
        <div className="ck-a-grid">
          <ObjCard title="Brand Platform" value={v.brandPlatform} status={st("brandPlatform")} span
            fields={[["name", "Nom"], ["benefit", "Bénéfice"], ["target", "Cible"], ["competitiveAdvantage", "Avantage compétitif"], ["emotionalBenefit", "Bénéfice émotionnel"], ["functionalBenefit", "Bénéfice fonctionnel"], ["supportedBy", "Supporté par"]]} />
          <ObjCard title="Copy Strategy" value={v.copyStrategy} status={st("copyStrategy")}
            fields={[["promise", "Promesse"], ["rtb", "Raison de croire"], ["tonOfVoice", "Ton de voix"], ["keyMessages", "Messages clés"], ["doNot", "À ne pas faire"]]} />
          <ObjCard title="Big Idea" value={v.bigIdea} status={st("bigIdea")}
            fields={[["concept", "Concept"], ["mechanism", "Mécanisme"], ["insight", "Insight"], ["adaptations", "Adaptations"]]} />
        </div>
      </Section>

      <Section title="Innovations" sub="Tout ce que la marque peut créer — produit, gamme, marque, diversification">
        <div className="ck-a-grid"><Innovations items={v.innovationsProduit} status={st("innovationsProduit")} /></div>
      </Section>

      <Section title="Tests & mitigation" sub={`Actions de test d'hypothèses et de mitigation des risques — le catalogue d'actions complet (${nbActions}) est dans la Base d'actions ci-dessus`}>
        <div className="ck-a-grid">
          <ProofList title="Actions de mitigation des risques" items={v.riskMitigationActions} status={st("riskMitigationActions")}
            cols={[["action", "Action"], ["riskRef", "Risque"], ["canal", "Canal"], ["expectedImpact", "Impact attendu"]]} />
          <ProofList title="Actions de test d'hypothèses" items={v.hypothesisTestActions} status={st("hypothesisTestActions")}
            cols={[["testAction", "Test"], ["hypothesisRef", "Hypothèse"], ["expectedOutcome", "Résultat attendu"], ["cost", "Coût"]]} />
        </div>
      </Section>

      <Section title="Assets & activations" sub="Les assets produisibles, activations et formats disponibles">
        <div className="ck-a-grid">
          <ProofList title="Assets produisibles" items={v.assetsProduisibles} status={st("assetsProduisibles")}
            cols={[["asset", "Asset"], ["type", "Type"], ["usage", "Usage"]]} />
          <ProofList title="Activations possibles" items={v.activationsPossibles} status={st("activationsPossibles")}
            cols={[["activation", "Activation"], ["canal", "Canal"], ["cible", "Cible"], ["budgetEstime", "Budget estimé"]]} />
          <ACard title="Formats disponibles" status={st("formatsDisponibles")} empty={isEmpty(v.formatsDisponibles)} span>
            {isEmpty(v.formatsDisponibles) ? <EmptyBody /> : <div className="ck-fc__tags">{(Array.isArray(v.formatsDisponibles) ? v.formatsDisponibles : []).map((f, i) => <span className="ck-fc__tag" data-tone="orange" key={i}>{str(f)}</span>)}</div>}
          </ACard>
        </div>
      </Section>

      <Section title="Budget & média potentiels" sub="Les fourchettes budgétaires et le media plan activable">
        <div className="ck-a-grid">
          <PotentielBudget value={v.potentielBudget} status={st("potentielBudget")} />
          <ObjCard title="Media plan potentiel" value={v.mediaPlan} status={st("mediaPlan")}
            fields={[["totalBudget", "Budget total"], ["channels", "Canaux"]]} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · {nbActions} actions au catalogue · pilier I (généré)</p>
      </Section>
    </>
  );
}
