"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Instagram,
  Palette,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { type PillarKey, PILLAR_NAMES } from "@/lib/types/advertis-vector";

type Difficulty = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";

interface CaseStudy {
  id: string;
  title: string;
  driverType: string;
  difficulty: Difficulty;
  pillars: PillarKey[];
  summary: string;
  context: string;
  challenge: string;
  approach: string;
  adveApplication: string;
  results: string[];
  lessons: string[];
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  DEBUTANT: "bg-emerald-400/15 text-emerald-400 ring-1 ring-emerald-400/30",
  INTERMEDIAIRE: "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30",
  AVANCE: "bg-red-400/15 text-red-400 ring-1 ring-red-400/30",
};

const PILLAR_CHIP_COLORS: Record<PillarKey, string> = {
  a: "bg-purple-500/20 text-purple-400",
  d: "bg-blue-500/20 text-blue-400",
  v: "bg-emerald-500/20 text-emerald-400",
  e: "bg-amber-500/20 text-amber-400",
  r: "bg-red-500/20 text-red-400",
  t: "bg-sky-500/20 text-sky-400",
  i: "bg-orange-500/20 text-orange-400",
  s: "bg-pink-500/20 text-pink-400",
};

const CASES: CaseStudy[] = [
  {
    id: "case-1",
    title: "Campagne Instagram — Lancement Produit",
    driverType: "Instagram / Digital",
    difficulty: "INTERMEDIAIRE",
    pillars: ["a", "d", "v", "e"],
    summary:
      "Comment les pilliers ADVE ont guide le brief creatif pour le lancement d'un nouveau produit cosmetique sur Instagram, de la strategie a l'execution.",
    context:
      "Une marque de cosmetiques camerounaise lance une nouvelle gamme de soins capillaires naturels. L'objectif est de generer de la notoriete et des pre-commandes aupres des femmes 25-35 ans via Instagram. Budget creatif modere, delai de 3 semaines.",
    challenge:
      "Le marche des soins capillaires est sature sur Instagram avec de nombreux acteurs locaux et internationaux. La marque doit se demarquer sans budget publicitaire massif et creer de la confiance autour d'une nouvelle gamme non testee par le marche.",
    approach:
      "Application systematique des 4 pilliers ADVE au brief creatif : Authenticite via des temoignages reels de testeuses locales (pas de modeles studio), Distinction par un univers visuel terre et naturel a contre-courant des codes cliniques du secteur, Valeur par la mise en avant des ingredients locaux et de la formulation, Engagement via un challenge Instagram #MonRituelNaturel invitant les utilisatrices a partager leurs routines.",
    adveApplication:
      "Le brief creatif a ete structure autour des 4 pilliers prioritaires identifies. Chaque livrable (9 posts, 15 Stories, 3 Reels) a ete evalue sur une grille ADVE simplifiee avant soumission au QC. Les scores moyens par pillier ont ete utilises pour identifier les axes d'amelioration en temps reel pendant la campagne.",
    results: [
      "Engagement rate moyen de 8.2% (vs 2.1% benchmark sectoriel)",
      "847 UGC generes via le challenge en 2 semaines",
      "Score ADVE moyen des livrables : 156/200 (classification Forte)",
      "152 pre-commandes directes tracees depuis Instagram",
    ],
    lessons: [
      "Structurer le brief autour des pilliers ADVE clarifie les attentes pour le createur",
      "L'authenticite (temoignages reels) genere 3x plus d'engagement que le contenu studio",
      "Un challenge bien concu (pilier E) peut compenser un budget publicitaire limite",
      "Le scoring ADVE en cours de campagne permet des ajustements rapides",
    ],
  },
  {
    id: "case-2",
    title: "Identite Visuelle — Rebrand PME",
    driverType: "Multi-canal / Physique + Digital",
    difficulty: "AVANCE",
    pillars: ["a", "d", "i", "s"],
    summary:
      "Comment le pipeline BRAND et les 10 Glory tools ont guide le rebrand complet d'une PME agro-alimentaire, de l'audit a la livraison multi-supports.",
    context:
      "Une PME agro-alimentaire de 15 ans souhaite moderniser son identite visuelle pour passer du marche local au marche regional (CEMAC). Le rebrand doit couvrir le logo, la charte graphique, le packaging (12 produits), le site web et les supports institutionnels. Equipe de 3 createurs mobilisee.",
    challenge:
      "Moderniser l'identite sans perdre la reconnaissance existante aupres des clients fideles. Le challenge technique est la declinaison coherente sur des supports tres differents (packaging alimentaire, site web, presentations corporate) avec des contraintes de production variees.",
    approach:
      "Utilisation du pipeline BRAND avec les 10 Glory tools pour structurer le projet. Phase 1 : Audit de la marque existante et benchmark concurrentiel. Phase 2 : Definition du territoire de marque avec validation client a chaque etape cle. Phase 3 : Creation du systeme visuel (logo, typographie, couleurs, iconographie). Phase 4 : Declinaison sur tous les supports avec QC systematique.",
    adveApplication:
      "Les pilliers A (coherence avec l'heritage), D (differenciation sectorielle), I (qualite d'execution technique) et S (alignement strategique avec les objectifs d'expansion) ont ete les criteres directeurs. Chaque livrable a ete evalue sur ces 4 pilliers prioritaires. Les Glory tools ont fourni les templates et checklists pour chaque etape du pipeline.",
    results: [
      "Score ADVE moyen final : 172/200 (classification Culte)",
      "100% des livrables acceptes au premier jet (QC first pass rate)",
      "Coherence visuelle cross-support validee par le client sans revision majeure",
      "Projet livre en avance de 4 jours sur le planning initial",
    ],
    lessons: [
      "Le pipeline BRAND structure le projet et reduit les allers-retours client",
      "Les Glory tools accelerent la production tout en maintenant la qualite",
      "La validation intermediaire par pillier evite les surprises en fin de projet",
      "Impliquer 3 createurs sur un projet necessite un systeme de coherence rigoureux (pilier S)",
    ],
  },
  {
    id: "case-3",
    title: "Campagne 360 — Event + Digital",
    driverType: "Event + Instagram + Video + PR",
    difficulty: "AVANCE",
    pillars: ["a", "d", "v", "e", "r", "t", "i", "s"],
    summary:
      "Execution d'une campagne multi-driver combinant evenementiel, digital et relations presse pour le lancement d'un nouveau service bancaire mobile.",
    context:
      "Une banque regionale lance un service de mobile money visant les 18-30 ans non bancarises. La campagne doit combiner un evenement de lancement, une couverture media, une campagne Instagram/TikTok et des videos explicatives. Budget significatif, 6 createurs impliques sur 5 semaines.",
    challenge:
      "Coordonner 4 drivers differents avec des contraintes techniques, editoriales et temporelles distinctes tout en maintenant une coherence de message parfaite. Le secteur bancaire impose des contraintes reglementaires fortes (pilier Risk). L'audience cible est sceptique envers les banques traditionnelles.",
    approach:
      "Approche hub-and-spoke : un message central fort decline sur chaque driver. Le brief strategique unifie a ete produit en amont avec scoring ADVE cible par driver. Chaque equipe driver a recu son brief enrichi avec les specs techniques et les guidelines de coherence. Un QC transversal a ete mis en place pour valider la coherence cross-driver.",
    adveApplication:
      "Les 8 pilliers ont ete mobilises. Les pilliers prioritaires variaient selon le driver : A+E pour Instagram, D+V pour l'evenement, R+I pour les contenus reglementaires, T+S pour le suivi global. Un tableau de bord ADVE a permis de suivre les scores en temps reel et de detecter les ecarts de coherence entre drivers.",
    results: [
      "Score ADVE moyen global : 164/200 (classification Culte)",
      "Event : 2,400 participants, couverture TV nationale",
      "Digital : 4.2M impressions cumulees, 6.8% engagement rate",
      "PR : 22 retombees media, 0 incident reputationnel (pilier R maitrise)",
      "12,000 inscriptions au service en 30 jours post-lancement",
    ],
    lessons: [
      "Une campagne 360 necessite un brief unifie avec declinaison par driver",
      "Le scoring ADVE cross-driver est essentiel pour maintenir la coherence",
      "Le pilier Risk est critique dans les secteurs reglementes — investir en amont",
      "Le tracking unifie (pilier T) permet l'attribution des resultats par driver",
      "6 createurs necessitent un systeme de QC transversal, pas seulement individuel",
    ],
  },
];

export default function LearnCasesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etudes de Cas"
        description="Missions exemplaires illustrant l'application concrete du framework ADVE-RTIS"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Apprendre" },
          { label: "Cas" },
        ]}
      />

      {/* Case list */}
      <div className="space-y-4">
        {CASES.map((cs) => {
          const isExpanded = expandedId === cs.id;

          return (
            <div
              key={cs.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden transition-colors hover:border-zinc-700"
            >
              {/* Card header — always visible */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{cs.title}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">{cs.driverType}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${DIFFICULTY_COLORS[cs.difficulty]}`}
                  >
                    {cs.difficulty}
                  </span>
                </div>

                {/* Pillar chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cs.pillars.map((p) => (
                    <span
                      key={p}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PILLAR_CHIP_COLORS[p]}`}
                    >
                      {p.toUpperCase()} {PILLAR_NAMES[p]}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{cs.summary}</p>

                <button
                  onClick={() => toggleExpand(cs.id)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Masquer les details
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      Lire l'etude complete
                    </>
                  )}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-5 space-y-5">
                  {/* Context */}
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Contexte
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-300">{cs.context}</p>
                  </div>

                  {/* Challenge */}
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Defi
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-300">{cs.challenge}</p>
                  </div>

                  {/* Approach */}
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Approche
                    </h4>
                    <p className="text-sm leading-relaxed text-zinc-300">{cs.approach}</p>
                  </div>

                  {/* ADVE Application */}
                  <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4">
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-blue-400">
                      Application ADVE-RTIS
                    </h4>
                    <p className="text-sm leading-relaxed text-blue-200/80">{cs.adveApplication}</p>
                  </div>

                  {/* Results */}
                  <div className="rounded-lg border border-emerald-800/30 bg-emerald-900/10 p-4">
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
                      Resultats
                    </h4>
                    <ul className="space-y-1.5">
                      {cs.results.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-200/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lessons */}
                  <div>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Enseignements cles
                    </h4>
                    <ul className="space-y-1.5">
                      {cs.lessons.map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
