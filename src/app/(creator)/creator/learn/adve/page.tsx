"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

interface PillarCard {
  key: PillarKey;
  name: string;
  question: string;
  description: string;
  borderColor: string;
  letterBg: string;
}

const PILLARS: PillarCard[] = [
  {
    key: "a",
    name: PILLAR_NAMES.a,
    question: "Ce livrable reflete-t-il fidelement l'ADN de la marque ?",
    description:
      "Mesure la coherence entre le contenu produit et l'identite reelle de la marque. Un score eleve signifie que le ton, le style et les valeurs transmis sont authentiquement lies a la marque, sans artifice ni mimicry concurrentielle.",
    borderColor: "border-l-purple-500",
    letterBg: "bg-purple-500/20 text-purple-400",
  },
  {
    key: "d",
    name: PILLAR_NAMES.d,
    question: "Ce livrable se demarque-t-il clairement de la concurrence ?",
    description:
      "Evalue la capacite du contenu a se distinguer dans un flux sature. Analyse l'originalite visuelle, conceptuelle et narrative. Un livrable distinctif capte l'attention et renforce la memorabilite de la marque.",
    borderColor: "border-l-blue-500",
    letterBg: "bg-blue-500/20 text-blue-400",
  },
  {
    key: "v",
    name: PILLAR_NAMES.v,
    question: "La promesse de valeur est-elle clairement communiquee ?",
    description:
      "Mesure la clarte et la force de la proposition de valeur. Le contenu doit permettre a l'audience de comprendre immediatement ce que la marque offre de concret et pourquoi c'est pertinent pour eux.",
    borderColor: "border-l-emerald-500",
    letterBg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    key: "e",
    name: PILLAR_NAMES.e,
    question: "Ce contenu genere-t-il une reaction et construit-il une relation ?",
    description:
      "Evalue le potentiel d'engagement du livrable : likes, partages, commentaires, mais aussi la construction d'une relation durable. L'engagement transforme une audience passive en communaute devouee.",
    borderColor: "border-l-amber-500",
    letterBg: "bg-amber-500/20 text-amber-400",
  },
  {
    key: "r",
    name: PILLAR_NAMES.r,
    question: "Les risques reputationnels et legaux ont-ils ete anticipes ?",
    description:
      "Analyse les vulnerabilites potentielles du contenu : conformite legale, sensibilites culturelles, risques de bad buzz. Un score eleve indique une gestion proactive des angles morts avant publication.",
    borderColor: "border-l-red-500",
    letterBg: "bg-red-500/20 text-red-400",
  },
  {
    key: "t",
    name: PILLAR_NAMES.t,
    question: "L'impact de ce livrable est-il mesurable et tracable ?",
    description:
      "Mesure si le contenu integre des mecanismes de suivi : UTM, QR codes, codes promo, pixels. Un livrable bien tracke permet d'attribuer les resultats et d'optimiser les prochaines iterations.",
    borderColor: "border-l-sky-500",
    letterBg: "bg-sky-500/20 text-sky-400",
  },
  {
    key: "i",
    name: PILLAR_NAMES.i,
    question: "L'execution technique est-elle irreprochable ?",
    description:
      "Evalue la qualite d'execution : respect des specs techniques, resolution, formats, accessibilite, nommage des fichiers. Un concept brillant mal execute perd tout son impact.",
    borderColor: "border-l-orange-500",
    letterBg: "bg-orange-500/20 text-orange-400",
  },
  {
    key: "s",
    name: PILLAR_NAMES.s,
    question: "Ce livrable s'inscrit-il dans une vision strategique coherente ?",
    description:
      "Mesure l'alignement avec la strategie globale de la marque. Le contenu doit contribuer aux objectifs strategiques, maintenir la coherence cross-canal, et s'inscrire dans un arc narratif d'ensemble.",
    borderColor: "border-l-pink-500",
    letterBg: "bg-pink-500/20 text-pink-400",
  },
];

interface Classification {
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  description: string;
}

const CLASSIFICATIONS: Classification[] = [
  {
    label: "Zombie",
    range: "0 – 80",
    min: 0,
    max: 80,
    color: "text-zinc-400",
    bgColor: "bg-zinc-700/30 border-zinc-600",
    description: "Marque sans signal distinctif. Le contenu manque d'identite, de valeur et d'engagement. Necesssite une refonte complete de la strategie de marque.",
  },
  {
    label: "Ordinaire",
    range: "81 – 120",
    min: 81,
    max: 120,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-700",
    description: "Marque fonctionnelle mais interchangeable. Le contenu remplit son role basique sans creer de preference. Des optimisations ciblees peuvent faire la difference.",
  },
  {
    label: "Forte",
    range: "121 – 160",
    min: 121,
    max: 160,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-700",
    description: "Marque solide avec une identite claire. Le contenu genere de la preference et de la fidelite. Quelques pilliers peuvent encore etre renforces.",
  },
  {
    label: "Culte",
    range: "161 – 180",
    min: 161,
    max: 180,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-700",
    description: "Marque avec une communaute devouee. Le contenu cree de l'attachement emotionnel fort. La marque est recommandee activement par ses fans.",
  },
  {
    label: "Icone",
    range: "181 – 200",
    min: 181,
    max: 200,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-700",
    description: "Marque transcendant son secteur. Le contenu devient reference culturelle. La marque definit les standards de son industrie et au-dela.",
  },
];

export default function LearnAdvePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Fondamentaux ADVE"
        description="Comprendre la methodologie ADVE-RTIS pour creer des livrables exceptionnels"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Apprendre" },
          { label: "ADVE" },
        ]}
      />

      {/* Hero / Intro */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">
          La methodologie ADVE-RTIS
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          ADVE-RTIS est un framework proprietaire d'evaluation de marque en 8 pilliers.
          Chaque livrable creatif est evalue sur ces 8 dimensions pour produire un score
          composite sur 200. Ce score determine la classification de la marque et guide
          les decisions strategiques. En tant que createur, comprendre chaque pillier vous
          permet de produire du contenu qui renforce systematiquement la marque sur tous les axes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PILLARS.map((p) => (
            <span
              key={p.key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${p.letterBg}`}
            >
              {p.key.toUpperCase()} — {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* 8 Pillar Cards — 2 column grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Les 8 pilliers</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.key}
              className={`rounded-xl border border-zinc-800 bg-zinc-900/80 border-l-4 ${pillar.borderColor} p-5 transition-colors hover:border-zinc-700`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${pillar.letterBg}`}
                >
                  {pillar.key.toUpperCase()}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{pillar.name}</h3>
                  <p className="text-xs text-zinc-500">Pillier {pillar.key.toUpperCase()} — /25 points</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs font-medium text-zinc-300 italic">
                  &ldquo;{pillar.question}&rdquo;
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Echelle de scoring : /200
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm text-zinc-400">
            Chaque pillier est note sur <span className="font-semibold text-white">25 points</span>.
            Le score composite (somme des 8 pilliers) donne une note sur{" "}
            <span className="font-semibold text-white">200</span> qui determine la classification
            de la marque selon 5 niveaux :
          </p>

          {/* Scale bar */}
          <div className="mt-6">
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="w-[40%] bg-zinc-600" title="Zombie 0-80" />
              <div className="w-[20%] bg-yellow-600" title="Ordinaire 81-120" />
              <div className="w-[20%] bg-blue-600" title="Forte 121-160" />
              <div className="w-[10%] bg-purple-600" title="Culte 161-180" />
              <div className="w-[10%] bg-amber-500" title="Icone 181-200" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
              <span>0</span>
              <span>80</span>
              <span>120</span>
              <span>160</span>
              <span>180</span>
              <span>200</span>
            </div>
          </div>

          {/* Classification cards */}
          <div className="mt-6 space-y-3">
            {CLASSIFICATIONS.map((cls) => (
              <div
                key={cls.label}
                className={`flex items-start gap-4 rounded-xl border p-4 ${cls.bgColor}`}
              >
                <div className="flex flex-col items-center">
                  <span className={`text-lg font-bold ${cls.color}`}>{cls.label}</span>
                  <span className="mt-0.5 text-[11px] text-zinc-500">{cls.range}</span>
                </div>
                <p className="flex-1 text-xs leading-relaxed text-zinc-400">
                  {cls.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How scoring works */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">Comment le score est calcule</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400">
              1
            </div>
            <h4 className="mt-3 text-sm font-medium text-white">Evaluation par pillier</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Chaque livrable est evalue sur les 8 pilliers par le QC reviewer. Score de 0 a 25 par pillier selon des criteres objectifs.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
              2
            </div>
            <h4 className="mt-3 text-sm font-medium text-white">Score composite</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Les 8 scores individuels sont additionnes pour former le score composite sur 200. Un indice de confiance accompagne chaque evaluation.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
              3
            </div>
            <h4 className="mt-3 text-sm font-medium text-white">Classification</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Le score composite determine la classification de la marque : Zombie, Ordinaire, Forte, Culte ou Icone. Chaque niveau ouvre de nouvelles opportunites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
