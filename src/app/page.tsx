import Link from "next/link";
import {
  Rocket,
  Eye,
  Radio,
  Swords,
  GraduationCap,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Star,
  Target,
} from "lucide-react";

const divisions = [
  {
    name: "L'Oracle",
    description: "Stratégie de marque & architecture ADVE",
    icon: Eye,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
  {
    name: "Le Signal",
    description: "Intelligence marché & insights temps réel",
    icon: Radio,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    name: "L'Arène",
    description: "Communauté, talents & écosystème créatif",
    icon: Swords,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    name: "La Fusée",
    description: "Ingénierie, outils & opérations créatives",
    icon: Rocket,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    name: "L'Académie",
    description: "Formation, certification & transmission ADVE",
    icon: GraduationCap,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
  },
];

const features = [
  {
    icon: Target,
    title: "Score /200",
    description: "Chaque marque mesurée sur 8 piliers ADVE-RTIS avec scoring hybride déterministe + IA.",
  },
  {
    icon: Zap,
    title: "39 Glory Tools",
    description: "Outils créatifs structurés en 4 couches : Copy, Direction, Opérations, Brand Identity.",
  },
  {
    icon: Users,
    title: "La Guilde",
    description: "Réseau de créateurs qualifiés avec progression APPRENTI → ASSOCIÉ et QC distribué.",
  },
  {
    icon: BarChart3,
    title: "Feedback Loop",
    description: "Signal → Diagnostic → Recalibration. Chaque action mesurée, chaque impact tracé.",
  },
  {
    icon: Shield,
    title: "Brand Guardian",
    description: "Guidelines vivantes, conformité automatique, cohérence multi-canal garantie.",
  },
  {
    icon: Star,
    title: "Cult Index",
    description: "De Zombie à Icône — transformez votre marque en mouvement commercial.",
  },
];

const portals = [
  {
    name: "Cockpit",
    role: "Client & Brand Manager",
    description: "Pilotez votre marque, suivez vos scores, visualisez l'impact de chaque action.",
    href: "/cockpit",
    color: "from-violet-600 to-violet-800",
    hoverBorder: "hover:border-violet-500/50",
  },
  {
    name: "Creator",
    role: "Talent & Freelance",
    description: "Missions, QC, progression, gains — tout votre parcours créatif en un lieu.",
    href: "/creator",
    color: "from-emerald-600 to-emerald-800",
    hoverBorder: "hover:border-emerald-500/50",
  },
  {
    name: "Console",
    role: "Fixer & Admin",
    description: "Vue écosystème : stratégies, guild, intelligence, revenus, processus.",
    href: "/console",
    color: "from-blue-600 to-blue-800",
    hoverBorder: "hover:border-blue-500/50",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-400">
            <Rocket className="h-4 w-4 text-violet-400" />
            Infrastructure-as-a-Service pour marques africaines
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-7xl">
            LaFusée{" "}
            <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
              Industry OS
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            De la Poussière à l&apos;Étoile — Le premier système d&apos;exploitation
            qui encode la méthodologie ADVE en protocole opérationnel pour
            transformer chaque marque en mouvement commercial.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/intake"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-8 py-4 font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-violet-600"
            >
              Diagnostic Gratuit
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-8 py-4 font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Score Section */}
      <section className="border-t border-zinc-800/50 px-6 py-24">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Votre marque, scorée sur{" "}
            <span className="text-violet-400">/200</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-zinc-400">
            8 piliers fondamentaux. Un score composite. 5 classifications.
            De Zombie à Icône, chaque marque a un chemin mesurable.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "Zombie", range: "0-80", color: "bg-zinc-700 text-zinc-400" },
              { label: "Ordinaire", range: "81-120", color: "bg-zinc-600 text-zinc-300" },
              { label: "Forte", range: "121-160", color: "bg-blue-900/50 text-blue-400" },
              { label: "Culte", range: "161-180", color: "bg-violet-900/50 text-violet-400" },
              { label: "Icône", range: "181-200", color: "bg-amber-900/50 text-amber-400" },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-full px-5 py-2 text-sm font-medium ${c.color}`}
              >
                {c.label} ({c.range})
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Divisions */}
      <section className="border-t border-zinc-800/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            5 Divisions, 1 Écosystème
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-zinc-400">
            Chaque division sert un maillon de la chaîne de valeur créative.
            Ensemble, elles forment un système intégré sans précédent.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {divisions.map((d) => (
              <div
                key={d.name}
                className={`rounded-xl border ${d.border} ${d.bg} p-6 transition-colors hover:border-zinc-600`}
              >
                <d.icon className={`mb-3 h-8 w-8 ${d.color}`} />
                <h3 className="mb-1 text-lg font-semibold">{d.name}</h3>
                <p className="text-sm text-zinc-400">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-bold sm:text-4xl">
            Ce qui change tout
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 transition-colors hover:border-zinc-700"
              >
                <f.icon className="mb-4 h-6 w-6 text-violet-400" />
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section className="border-t border-zinc-800/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            3 Portails, 1 Plateforme
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-zinc-400">
            Chaque acteur de l&apos;écosystème accède à son espace dédié avec
            les outils et données pertinents pour son rôle.
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {portals.map((p) => (
              <Link
                key={p.name}
                href={p.href}
                className={`group rounded-xl border border-zinc-800 bg-zinc-900/80 p-8 transition-all ${p.hoverBorder}`}
              >
                <div
                  className={`mb-4 inline-block rounded-lg bg-gradient-to-br ${p.color} px-4 py-2 text-sm font-bold`}
                >
                  {p.name}
                </div>
                <p className="mb-2 text-sm font-medium text-zinc-400">
                  {p.role}
                </p>
                <p className="mb-4 text-sm text-zinc-500">{p.description}</p>
                <span className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors group-hover:text-white">
                  Accéder <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Prêt à transformer votre marque ?
          </h2>
          <p className="mb-8 text-zinc-400">
            Commencez par un diagnostic gratuit en 15 minutes.
            Découvrez votre score ADVE et votre classification.
          </p>
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 px-10 py-4 text-lg font-bold shadow-lg shadow-violet-900/20 transition-all hover:from-violet-500 hover:to-emerald-500"
          >
            Lancer le Diagnostic
            <Rocket className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-6 py-12 text-center text-sm text-zinc-500">
        <p>
          LaFusée Industry OS — De la Poussière à l&apos;Étoile
        </p>
        <p className="mt-1">
          Powered by ADVE-RTIS Protocol &bull; UPgraders
        </p>
      </footer>
    </main>
  );
}
