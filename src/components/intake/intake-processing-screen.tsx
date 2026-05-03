"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  ScanSearch,
  Sparkles,
  ShieldCheck,
  Diamond,
  Gem,
  HeartHandshake,
  Award,
  Loader2,
} from "lucide-react";

type StageKey = "read" | "id" | "a" | "d" | "v" | "e" | "synth";

interface Stage {
  key: StageKey;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Seconds elapsed at which this stage becomes "active". Tuned on observed p50/p95. */
  startsAt: number;
}

const STAGES: Stage[] = [
  { key: "read",  label: "Lecture du contenu",          sub: "On parcourt vos documents et votre texte.",            icon: FileText,      startsAt: 0  },
  { key: "id",    label: "Identification de la marque", sub: "Recoupement secteur, positionnement, signaux faibles.", icon: ScanSearch,    startsAt: 5  },
  { key: "a",     label: "Authenticite",                sub: "Vision, mission, raison d'etre.",                       icon: ShieldCheck,   startsAt: 11 },
  { key: "d",     label: "Distinction",                 sub: "Ce qui vous rend reconnaissable au premier regard.",    icon: Diamond,       startsAt: 19 },
  { key: "v",     label: "Valeur",                      sub: "Promesse, livraison, ecart percu.",                     icon: Gem,           startsAt: 28 },
  { key: "e",     label: "Engagement",                  sub: "Profondeur du lien avec votre audience.",               icon: HeartHandshake, startsAt: 37 },
  { key: "synth", label: "Synthese du rapport",         sub: "Classement sectoriel et marges de progression.",        icon: Award,         startsAt: 46 },
];

type FactKind = "verite" | "methode" | "atelier" | "lafusee";

interface Fact {
  kind: FactKind;
  text: string;
}

const FACT_LABELS: Record<FactKind, string> = {
  verite: "Verite sur les marques cultes",
  methode: "Methode",
  atelier: "Vu en atelier",
  lafusee: "Sous le capot de La Fusee",
};

const FACTS: Fact[] = [
  // ── Verites ADVE ────────────────────────────────────────────────
  { kind: "verite", text: "Une marque culte ne vend pas un produit. Elle propose une appartenance." },
  { kind: "verite", text: "L'Authenticite est ce qui reste quand on retire le marketing." },
  { kind: "verite", text: "98 % des marques echouent sur la Distinction, pas sur la qualite du produit." },
  { kind: "verite", text: "Une promesse forte sans livraison coherente brule la credibilite plus vite que le silence." },
  { kind: "verite", text: "L'Engagement n'est pas du trafic. C'est de la conviction qui se propage." },
  { kind: "verite", text: "Les superfans ne sont pas vos clients. Ce sont vos evangelistes spontanes." },
  { kind: "verite", text: "La fenetre d'Overton bouge quand 3 % du public bascule. Pas 50 %." },
  { kind: "verite", text: "Une marque devient icone quand elle derange, puis convertit." },

  // ── Methode (Xtincell-flavored) ────────────────────────────────
  { kind: "methode", text: "Le brief ne sauve pas la strategie. La strategie nourrit le brief." },
  { kind: "methode", text: "Ce qui se mesure se pilote. Ce qui se ressent se propage." },
  { kind: "methode", text: "On ne corrige pas un positionnement faible avec un budget media. On le reecrit." },
  { kind: "methode", text: "Si ta marque ne tient pas debout sur une diapo, elle ne tiendra pas en rayon." },
  { kind: "methode", text: "L'execution mediocre tue les bonnes idees plus vite que les mauvaises idees." },
  { kind: "methode", text: "Une categorie sans rituel n'a pas de superfans. Elle a des acheteurs." },
  { kind: "methode", text: "Si tu copies l'iconique, tu deviens l'ordinaire de l'iconique." },

  // ── Vu en atelier (terrain africain) ───────────────────────────
  { kind: "atelier", text: "La diaspora valide. Le marche local consacre. Les deux ne suivent pas le meme rythme." },
  { kind: "atelier", text: "Une marque africaine forte ne demande pas la permission de Paris. Elle l'oblige a regarder." },
  { kind: "atelier", text: "Le bouche-a-oreille reste le canal le plus rentable. Personne n'ose le budgeter." },
  { kind: "atelier", text: "Faire vrai coute moins cher que faire pro. Et convertit dix fois plus." },

  // ── Easter eggs Neteru (cosmologie produit) ────────────────────
  { kind: "lafusee", text: "Mestor relit chacune de vos reponses avant de laisser passer le diagnostic." },
  { kind: "lafusee", text: "Artemis tient la plume. Ptah fond les assets. Seshat observe en silence." },
  { kind: "lafusee", text: "Thot compte le carburant. Sans carburant, pas de mise en orbite." },
  { kind: "lafusee", text: "Imhotep cherche l'equipage. Anubis porte le message a l'audience." },
  { kind: "lafusee", text: "ADVE est le sol. RTIS est l'orbite. Vous etes ici sur le sol." },
  { kind: "lafusee", text: "Nous classons votre marque sur 7 paliers : de Zombie a Icone. Beaucoup tiennent dans Fragile." },
  { kind: "lafusee", text: "La methode ADVERTIS cascade A vers D vers V vers E. Sauter une etape coute cher en aval." },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Props {
  companyName: string;
  /** True while the underlying mutation is running. Goes false on success/error. */
  isPending: boolean;
  /** Optional error to surface inline (still keeps the screen up so the user has context). */
  errorMessage?: string;
}

export function IntakeProcessingScreen({ companyName, isPending, errorMessage }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const startRef = useRef<number>(Date.now());
  const factsRef = useRef<Fact[]>(shuffle(FACTS));

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
    const factTick = window.setInterval(() => {
      setFactIndex((i) => (i + 1) % factsRef.current.length);
    }, 4500);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(factTick);
    };
  }, []);

  // ── Progress curve ───────────────────────────────────────────────
  // Asymptotic toward 92 % over ~50 s so we never look "stuck at 100".
  // Snap to 100 % the moment the mutation resolves.
  const progress = useMemo(() => {
    if (!isPending) return 100;
    const target = 50;
    const eased = (1 - Math.exp(-elapsed / target)) * 92;
    return Math.max(2, Math.min(95, eased));
  }, [elapsed, isPending]);

  // Active stage = last stage whose startsAt <= elapsed (or the last one when done).
  const activeIdx = useMemo(() => {
    if (!isPending) return STAGES.length - 1;
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsed >= STAGES[i]!.startsAt) idx = i;
    }
    return idx;
  }, [elapsed, isPending]);

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Analyse de <span className="text-primary">{companyName}</span> en cours
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary sm:text-base">
            On extrait vos 4 piliers ADVE. Cela prend generalement 30 a 60 secondes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground-secondary">
              {!isPending ? "Termine" : STAGES[activeIdx]?.label}
            </span>
            <span className="font-mono text-foreground-muted tabular-nums">
              {Math.round(progress)} %
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background-raised">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage list */}
        <ul className="mt-8 space-y-3">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const status: "done" | "active" | "pending" =
              i < activeIdx || !isPending
                ? "done"
                : i === activeIdx
                  ? "active"
                  : "pending";

            return (
              <li
                key={stage.key}
                className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-all ${
                  status === "active"
                    ? "border-primary/40 bg-primary-subtle/20"
                    : status === "done"
                      ? "border-border bg-background-raised opacity-70"
                      : "border-border/50 bg-transparent opacity-40"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    status === "active"
                      ? "bg-primary text-primary-foreground"
                      : status === "done"
                        ? "bg-success/20 text-success"
                        : "bg-background-raised text-foreground-muted"
                  }`}
                >
                  {status === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      status === "pending" ? "text-foreground-muted" : "text-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">{stage.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Rotating fact */}
        <div className="mt-auto pt-8">
          <div
            key={factIndex}
            className="rounded-xl border border-border bg-background-raised px-5 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {FACT_LABELS[factsRef.current[factIndex]?.kind ?? "verite"]}
            </p>
            <p className="mt-1 text-sm text-foreground sm:text-base">
              {factsRef.current[factIndex]?.text}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
