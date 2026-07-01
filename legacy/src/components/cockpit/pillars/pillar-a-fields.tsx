"use client";

/**
 * Pilier A (Authenticité / Identité) — renderer bespoke.
 *
 * Porté du handoff claude.ai/design (pillar-a.jsx). TOUS les champs A surfacés,
 * chacun avec une mise en forme adaptée à sa forme : fondamentaux, ADN
 * (archétypes, ikigai 2×2), valeurs rangées, récit (timelines, parcours du
 * héros), objets structurés (prophétie, ennemi, doctrine, mythologie),
 * hiérarchie en échelle, équipe & légitimité, preuves & réputation.
 *
 * Data-driven sur `content` (Pillar.content) ; statut par champ via
 * `fieldCertainty`. Les champs vides restent VISIBLES (« à saisir / à générer »).
 */

import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  Section, ACard, EmptyBody, EmptyValue, TagRow, ObjCard, ProofList, MetricObj, MetricNum,
  isEmpty, asRec, asArr, str, makeStatusFor, type Rec,
} from "./pillar-kit";

// ── 1. Fondamentaux ────────────────────────────────────────────────────

function Fondamentaux({ v }: { v: Rec }) {
  const meta: Array<[string, unknown]> = [["Secteur", v.secteur], ["Pays / marché", v.pays], ["Nature", v.brandNature], ["Langue", v.langue]];
  const nom = str(v.nomMarque);
  return (
    <div className="ck-a-idcard">
      <div className="ck-a-idcard__head">
        <div className="ck-a-idcard__mark">{(nom || "?").slice(0, 2).toUpperCase()}</div>
        <div className="ck-a-idcard__t">
          <span className="ck-a-idcard__eyebrow">Identité de marque · Pilier A</span>
          <h3 className="ck-a-idcard__name">{nom || "Marque sans nom"}</h3>
          {!isEmpty(v.accroche) ? <p className="ck-a-idcard__accroche">{str(v.accroche)}</p> : null}
        </div>
      </div>
      {!isEmpty(v.description) ? <p className="ck-a-idcard__desc">{str(v.description)}</p> : null}
      <div className="ck-a-idcard__meta">
        {meta.map(([k, val]) => (
          <div className="ck-a-idcard__metacell" key={k}>
            <span className="ck-a-idcard__metak">{k}</span>
            <span className="ck-a-idcard__metav">{isEmpty(val) ? <EmptyValue /> : str(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Énoncé-pilier ───────────────────────────────────────────────────

function Statement({ label, value, status, big }: { label: string; value: unknown; status?: string; big?: boolean }) {
  return (
    <ACard title={label} status={status} empty={isEmpty(value)}>
      {isEmpty(value) ? <EmptyBody /> : <p className={`ck-a-stmt${big ? " ck-a-stmt--big" : ""}`}>{str(value)}</p>}
    </ACard>
  );
}

// ── 3. Archétypes (duo Jung) ───────────────────────────────────────────

function Archetypes({ primary, secondary, status }: { primary: unknown; secondary: unknown; status?: string }) {
  return (
    <ACard title="Archétypes de marque" status={status} empty={isEmpty(primary)} span accent>
      <div className="ck-a-arch">
        <div className="ck-a-arch__cell" data-rank="1">
          <span className="ck-a-arch__role">Primaire</span>
          <span className="ck-a-arch__name">{str(primary) || "—"}</span>
          <span className="ck-a-arch__jung">12 archétypes de Jung</span>
        </div>
        <div className="ck-a-arch__plus">+</div>
        <div className="ck-a-arch__cell" data-rank="2">
          <span className="ck-a-arch__role">Secondaire</span>
          <span className="ck-a-arch__name">{isEmpty(secondary) ? <EmptyValue /> : str(secondary)}</span>
          <span className="ck-a-arch__jung">nuance la voix</span>
        </div>
      </div>
    </ACard>
  );
}

// ── 4. Ikigai (2×2 + centre) ───────────────────────────────────────────

function Ikigai({ value, status }: { value: unknown; status?: string }) {
  const q: Array<[string, string, string]> = [
    ["love", "Ce qu'on aime", "♥"], ["competence", "Notre compétence", "★"],
    ["worldNeed", "Besoin du monde", "◎"], ["remuneration", "Rémunération", "$"],
  ];
  const empty = isEmpty(value);
  const obj = asRec(value);
  return (
    <ACard title="Ikigai de marque" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-a-ikigai">
          {q.map(([k, label, sym]) => (
            <div className="ck-a-ikigai__q" key={k}>
              <span className="ck-a-ikigai__sym">{sym}</span>
              <span className="ck-a-ikigai__k">{label}</span>
              <span className="ck-a-ikigai__v">{isEmpty(obj[k]) ? <EmptyValue /> : str(obj[k])}</span>
            </div>
          ))}
          <div className="ck-a-ikigai__center">Ikigai</div>
        </div>
      )}
    </ACard>
  );
}

// ── 5. Citation fondatrice ─────────────────────────────────────────────

function Citation({ value, status }: { value: unknown; status?: string }) {
  return (
    <ACard title="Citation fondatrice" status={status} empty={isEmpty(value)} span>
      {isEmpty(value) ? <EmptyBody /> : <blockquote className="ck-a-quote">{str(value)}</blockquote>}
    </ACard>
  );
}

// ── 6. Valeurs (Schwartz + rang + coût + tension) ──────────────────────

function Valeurs({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Valeurs" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-vals">
          {[...arr].sort((a, b) => (Number(a.rank) || 9) - (Number(b.rank) || 9)).map((val, i) => (
            <div className="ck-a-val" key={i}>
              <div className="ck-a-val__rank">{str(val.rank) || i + 1}</div>
              <div className="ck-a-val__body">
                <div className="ck-a-val__top">
                  <span className="ck-a-val__name">{str(val.customName) || str(val.value)}</span>
                  {!isEmpty(val.value) ? <span className="ck-a-val__schwartz">Schwartz · {str(val.value)}</span> : null}
                </div>
                {!isEmpty(val.justification) ? <p className="ck-a-val__just">{str(val.justification)}</p> : null}
                <div className="ck-a-val__foot">
                  {!isEmpty(val.costOfHolding) ? <span className="ck-a-val__cost"><b>Coût</b> {str(val.costOfHolding)}</span> : null}
                  {!isEmpty(val.tensionWith) ? <span className="ck-a-val__tension">⚡ tension avec {str(val.tensionWith)}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── 7. Timeline narrative (4 étapes) ───────────────────────────────────

function TimelineNarrative({ value, status }: { value: unknown; status?: string }) {
  const stages: Array<[string, string]> = [["origine", "Origine"], ["transformation", "Transformation"], ["present", "Présent"], ["futur", "Futur"]];
  const empty = isEmpty(value);
  const obj = asRec(value);
  return (
    <ACard title="Timeline narrative" status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-a-tl">
          {stages.map(([k, label], i) => (
            <div className="ck-a-tl__step" key={k}>
              <div className="ck-a-tl__rail"><span className="ck-a-tl__dot">{i + 1}</span></div>
              <span className="ck-a-tl__k">{label}</span>
              <span className="ck-a-tl__v">{isEmpty(obj[k]) ? <EmptyValue /> : str(obj[k])}</span>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── 8. Parcours du héros (actes) ───────────────────────────────────────

function HerosJourney({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Parcours du héros" + (empty ? "" : ` · ${arr.length} actes`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-acts">
          {[...arr].sort((a, b) => (Number(a.actNumber) || 0) - (Number(b.actNumber) || 0)).map((act, i) => (
            <div className="ck-a-act" key={i}>
              <div className="ck-a-act__num">Acte {str(act.actNumber) || i + 1}</div>
              <div className="ck-a-act__body">
                <span className="ck-a-act__title">{str(act.title)}</span>
                {!isEmpty(act.narrative) ? <p className="ck-a-act__nar">{str(act.narrative)}</p> : null}
                <div className="ck-a-act__tags">
                  {!isEmpty(act.emotionalArc) ? <span className="ck-fc__tag" data-tone="accent">{str(act.emotionalArc)}</span> : null}
                  {!isEmpty(act.causalLink) ? <span className="ck-fc__tag" data-tone="neutral">{str(act.causalLink)}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── 10. Hiérarchie communautaire (échelle) ─────────────────────────────

function Ladder({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Hiérarchie communautaire" + (empty ? "" : ` · ${arr.length} niveaux`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-ladder">
          {arr.map((lv, i) => (
            <div className="ck-a-ladder__lv" key={i} style={{ "--i": i } as React.CSSProperties}>
              <span className="ck-a-ladder__n">{i + 1}</span>
              <div className="ck-a-ladder__body">
                <span className="ck-a-ladder__name">{str(lv.level)}</span>
                {!isEmpty(lv.description) ? <span className="ck-a-ladder__desc">{str(lv.description)}</span> : null}
              </div>
              <div className="ck-a-ladder__meta">
                {!isEmpty(lv.entryCriteria) ? <span className="ck-a-ladder__crit">Entrée · {str(lv.entryCriteria)}</span> : null}
                {!isEmpty(lv.privileges) ? <span className="ck-a-ladder__priv">{str(lv.privileges)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── 11. Équipe dirigeante ──────────────────────────────────────────────

function Equipe({ items, status }: { items: unknown; status?: string }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={"Équipe dirigeante" + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody /> : (
        <div className="ck-a-team">
          {arr.map((m, i) => (
            <div className="ck-a-team__m" key={i}>
              <div className="ck-a-team__av">{(str(m.nom) || "?").slice(0, 2).toUpperCase()}</div>
              <div className="ck-a-team__b">
                <span className="ck-a-team__name">{str(m.nom)}</span>
                {!isEmpty(m.role) ? <span className="ck-a-team__role">{str(m.role)}</span> : null}
                {!isEmpty(m.bio) ? <p className="ck-a-team__bio">{str(m.bio)}</p> : null}
                {!isEmpty(m.competencesCles) ? <TagRow items={m.competencesCles} /> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Composant principal ────────────────────────────────────────────────

export function PillarAFields({
  content, certainty,
}: { content: Rec; certainty: Record<string, string> | null | undefined }) {
  const v = content;
  const st = makeStatusFor(certainty, "a");
  const schemaKeys = Object.keys((PILLAR_SCHEMAS.A as { shape?: Record<string, unknown> }).shape ?? {});
  const total = schemaKeys.length;
  const filled = schemaKeys.filter((k) => !isEmpty(v[k])).length;

  return (
    <>
      <Section title="Fondamentaux" sub="Les invariants d'identité — alimentés au diagnostic ADVE">
        <div className="ck-a-grid">
          <Fondamentaux v={v} />
          <Statement label="Public cible" value={v.publicCible} status={st("publicCible")} />
          <Statement label="Promesse fondamentale" value={v.promesseFondamentale} status={st("promesseFondamentale")} big />
          <Statement label="Noyau identitaire" value={v.noyauIdentitaire} status={st("noyauIdentitaire")} big />
          <Statement label="Mission statement" value={v.missionStatement} status={st("missionStatement")} />
        </div>
      </Section>

      <Section title="ADN identitaire" sub="Archétypes, ikigai, citation fondatrice">
        <div className="ck-a-grid">
          <Archetypes primary={v.archetype} secondary={v.archetypeSecondary} status={st("archetype")} />
          <Ikigai value={v.ikigai} status={st("ikigai")} />
          <Citation value={v.citationFondatrice} status={st("citationFondatrice")} />
        </div>
      </Section>

      <Section title="Valeurs" sub="Hiérarchie de valeurs Schwartz — rang, justification, coût, tension">
        <div className="ck-a-grid"><Valeurs items={v.valeurs} status={st("valeurs")} /></div>
      </Section>

      <Section title="Récit & mythologie" sub="La narration de marque — du mythe d'origine à la prophétie">
        <div className="ck-a-grid">
          <TimelineNarrative value={v.timelineNarrative} status={st("timelineNarrative")} />
          <HerosJourney items={v.herosJourney} status={st("herosJourney")} />
          <ObjCard title="Prophétie" value={v.prophecy} status={st("prophecy")} span
            fields={[["worldTransformed", "Le monde transformé"], ["pioneers", "Pionniers"], ["urgency", "Urgence"], ["horizon", "Horizon"]]} />
          <ObjCard title="Ennemi" value={v.enemy} status={st("enemy")}
            fields={[["name", "Nom de l'ennemi"], ["manifesto", "Manifeste"], ["narrative", "Narration"], ["enemySchwartzValues", "Valeurs Schwartz de l'ennemi"]]} />
          <ObjCard title="Doctrine" value={v.doctrine} status={st("doctrine")}
            fields={[["dogmas", "Dogmes"], ["principles", "Principes"], ["practices", "Pratiques"]]} />
          <ObjCard title="Mythologie vivante" value={v.livingMythology} status={st("livingMythology")}
            fields={[["canon", "Canon"], ["extensionRules", "Règles d'extension"], ["captureSystem", "Système de capture"]]} />
          <ObjCard title="Mythe d'origine" value={v.originMyth} status={st("originMyth")}
            fields={[["elevator", "Pitch (elevator)"], ["storytelling", "Storytelling"], ["longue", "Version longue"]]} />
        </div>
      </Section>

      <Section title="Communauté & équipe" sub="La hiérarchie de dévotion et la légitimité fondatrice">
        <div className="ck-a-grid">
          <Ladder items={v.hierarchieCommunautaire} status={st("hierarchieCommunautaire")} />
          <Equipe items={v.equipeDirigeante} status={st("equipeDirigeante")} />
          <ObjCard title="Complémentarité de l'équipe" value={v.equipeComplementarite} status={st("equipeComplementarite")}
            fields={[["scoreGlobal", "Score global /10"], ["capaciteExecution", "Capacité d'exécution"], ["lacunes", "Lacunes"], ["verdict", "Verdict"]]} />
          <ObjCard title="Messie fondateur" value={v.messieFondateur} status={st("messieFondateur")}
            fields={[["nom", "Nom"], ["role", "Rôle"], ["narrative", "Narration"]]} />
          <ProofList title="Compétences divines" items={v.competencesDivines} status={st("competencesDivines")}
            cols={[["competence", "Compétence"], ["justification", "Justification"], ["exclusivityProof", "Preuve d'exclusivité"]]} />
        </div>
      </Section>

      <Section title="Preuves & réputation" sub="Les actifs de crédibilité — preuves, index, climat interne">
        <div className="ck-a-grid">
          <ProofList title="Preuves d'authenticité" items={v.preuvesAuthenticite} status={st("preuvesAuthenticite")}
            cols={[["type", "Type"], ["claim", "Affirmation"], ["evidence", "Preuve"], ["source", "Source"], ["year", "Année"]]} />
          <MetricObj title="Index de réputation" value={v.indexReputation} status={st("indexReputation")}
            fields={[["source", "Source"], ["score", "Score"], ["sampleSize", "Échantillon"], ["lastMeasured", "Dernière mesure"]]} />
          <MetricObj title="eNPS (collaborateurs)" value={v.eNps} status={st("eNps")}
            fields={[["score", "Score"], ["sampleSize", "Échantillon"], ["frequency", "Fréquence"], ["lastMeasured", "Dernière mesure"]]} />
          <MetricNum title="Taux de turnover" value={v.turnoverRate} unit=" %" status={st("turnoverRate")} />
        </div>
        <p className="ck-a-foot">{filled} / {total} champs canoniques renseignés · ontologie ADVE-RTIS · pilier A</p>
      </Section>
    </>
  );
}
