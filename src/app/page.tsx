import Link from "next/link";
import {
  Rocket, Eye, Radio, Swords, GraduationCap, ArrowRight,
  Zap, Shield, BarChart3, Users, Star, Target, Building2,
  Sparkles, Brain, Flame, Home,
} from "lucide-react";

const VERSION = "5.0";

const divisions = [
  { name: "L'Oracle", description: "Strategie de marque & architecture ADVE", icon: Eye, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
  { name: "Le Signal", description: "Intelligence marche & insights temps reel", icon: Radio, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { name: "L'Arene", description: "Communaute, talents & ecosysteme creatif", icon: Swords, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { name: "La Fusee", description: "Ingenierie, outils & operations creatives", icon: Rocket, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { name: "L'Academie", description: "Formation, certification & transmission ADVE", icon: GraduationCap, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
];

const neteru = [
  { name: "MESTOR", role: "Neter de la Decision", description: "Le cerveau strategique. Recommandations, arbitrages, insights proactifs.", icon: Brain, color: "text-violet-400", bg: "bg-violet-500/10" },
  { name: "ARTEMIS", role: "Neter du Protocole", description: "La protocolaire. 24 frameworks diagnostiques, 39 outils GLORY, 31 sequences.", icon: Sparkles, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "SESHAT", role: "Neter de l'Observation", description: "L'observateur archiviste. Knowledge graph, benchmarks, radar TARSIS.", icon: Eye, color: "text-sky-400", bg: "bg-sky-500/10" },
];

const features = [
  { icon: Target, title: "Score /200", description: "8 piliers ADVERTIS. Scoring deterministe. De Zombie a Icone." },
  { icon: Zap, title: "39 Outils GLORY", description: "Arsenal creatif d'Artemis : Copy, Direction, Operations, Brand Identity." },
  { icon: Users, title: "La Guilde", description: "Createurs qualifies APPRENTI → ASSOCIE avec QC distribue et matching ADVE." },
  { icon: BarChart3, title: "Feedback Loop", description: "Signal → Diagnostic → Recalibration. Chaque action mesuree." },
  { icon: Shield, title: "Fenetre d'Overton", description: "Deplacez la perception du marche pour transformer des spectateurs en superfans." },
  { icon: Star, title: "Devotion Ladder", description: "Spectateur → Interesse → Participant → Engage → Ambassadeur → Evangeliste." },
];

const portals = [
  { name: "Cockpit", role: "Marques & Clients", description: "Pilotez votre marque. 8 piliers ADVERTIS, insights, livrables.", href: "/cockpit", color: "from-violet-600 to-violet-800", hoverBorder: "hover:border-violet-500/50" },
  { name: "Agency", role: "Agences du reseau", description: "Gerez vos clients, campagnes, commissions. Vue adaptee par type d'agence.", href: "/agency", color: "from-amber-600 to-amber-800", hoverBorder: "hover:border-amber-500/50" },
  { name: "Creator", role: "Freelances & Talents", description: "Missions, QC, progression, gains. Votre parcours creatif.", href: "/creator", color: "from-emerald-600 to-emerald-800", hoverBorder: "hover:border-emerald-500/50" },
  { name: "Console", role: "Fixer & Admin", description: "Vue ecosysteme : strategies, guild, intelligence, revenus, NETERU.", href: "/console", color: "from-blue-600 to-blue-800", hoverBorder: "hover:border-blue-500/50" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-28 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-400">
            <Rocket className="h-4 w-4 text-violet-400" />
            Propulse par le Trio Divin NETERU
            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">v{VERSION}</span>
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-7xl">
            LaFusee{" "}
            <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
              Industry OS
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            De la Poussiere a l&apos;Etoile — Le premier systeme d&apos;exploitation
            pour l&apos;industrie creative africaine. Methode ADVERTIS, scoring /200,
            39 outils GLORY, guilde de createurs.
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

      {/* NETERU — Le Trio Divin */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">
              NETERU — <span className="text-violet-400">Le Trio Divin</span>
            </h2>
            <p className="mx-auto max-w-2xl text-zinc-400">
              Trois forces complementaires et egales propulsent l&apos;Industry OS.
              Mestor decide, Artemis execute, Seshat observe.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {neteru.map((n) => (
              <div key={n.name} className={`rounded-xl border border-white/5 ${n.bg} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <n.icon className={`h-7 w-7 ${n.color}`} />
                  <div>
                    <h3 className="font-bold text-white">{n.name}</h3>
                    <p className={`text-xs ${n.color}`}>{n.role}</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{n.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score /200 */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mb-3 text-3xl font-bold sm:text-4xl">
            8 piliers. Score <span className="text-violet-400">/200</span>. North Star : <span className="text-amber-400">Superfan</span>.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-zinc-400">
            La methode ADVERTIS decompose chaque marque en 8 dimensions.
            Chaque pilier puise dans le precedent. Le superfan est l&apos;aboutissement.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {["A·Authenticite", "D·Distinction", "V·Valeur", "E·Engagement", "R·Risk", "T·Track", "I·Innovation", "S·Strategy"].map((p, i) => {
              const colors = ["text-violet-300 bg-violet-500/10", "text-blue-300 bg-blue-500/10", "text-emerald-300 bg-emerald-500/10", "text-amber-300 bg-amber-500/10", "text-red-300 bg-red-500/10", "text-sky-300 bg-sky-500/10", "text-orange-300 bg-orange-500/10", "text-pink-300 bg-pink-500/10"];
              return (
                <div key={p} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${colors[i]}`}>
                  {p}
                  {i < 7 ? <ArrowRight className="h-3 w-3 ml-1 opacity-40" /> : null}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "Zombie", range: "0-50", color: "bg-zinc-800 text-zinc-500" },
              { label: "Fragile", range: "51-80", color: "bg-zinc-700 text-zinc-400" },
              { label: "Ordinaire", range: "81-120", color: "bg-zinc-600 text-zinc-300" },
              { label: "Forte", range: "121-160", color: "bg-blue-900/50 text-blue-400" },
              { label: "Culte", range: "161-180", color: "bg-violet-900/50 text-violet-400" },
              { label: "Icone", range: "181-200", color: "bg-amber-900/50 text-amber-400" },
            ].map((c) => (
              <div key={c.label} className={`rounded-full px-4 py-1.5 text-xs font-medium ${c.color}`}>
                {c.label} ({c.range})
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Divisions */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-center text-3xl font-bold sm:text-4xl">5 Divisions, 1 Ecosysteme</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-400">
            Chaque division sert un maillon de la chaine de valeur creative.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {divisions.map((d) => (
              <div key={d.name} className={`rounded-xl border ${d.border} ${d.bg} p-5 transition-colors hover:border-zinc-600`}>
                <d.icon className={`mb-2 h-7 w-7 ${d.color}`} />
                <h3 className="mb-1 text-sm font-semibold">{d.name}</h3>
                <p className="text-xs text-zinc-400">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">Ce qui change tout</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700">
                <f.icon className="mb-3 h-5 w-5 text-violet-400" />
                <h3 className="mb-1 text-sm font-semibold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Portails */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-center text-3xl font-bold sm:text-4xl">4 Portails, 1 Plateforme</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-400">
            Chaque acteur de l&apos;ecosysteme accede a son espace dedie.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {portals.map((p) => (
              <Link key={p.name} href={p.href}
                className={`group rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 transition-all ${p.hoverBorder}`}>
                <div className={`mb-3 inline-block rounded-lg bg-gradient-to-br ${p.color} px-3 py-1.5 text-xs font-bold`}>
                  {p.name}
                </div>
                <p className="mb-1 text-xs font-medium text-zinc-400">{p.role}</p>
                <p className="mb-3 text-xs text-zinc-500">{p.description}</p>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors group-hover:text-white">
                  Acceder <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-3xl font-bold sm:text-4xl">Pret a transformer votre marque ?</h2>
          <p className="mb-6 text-zinc-400">Diagnostic gratuit en 15 minutes. Score ADVE et classification.</p>
          <Link href="/intake"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 px-10 py-4 text-lg font-bold shadow-lg shadow-violet-900/20 transition-all hover:from-violet-500 hover:to-emerald-500">
            Lancer le Diagnostic <Rocket className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-6 py-8 text-center text-xs text-zinc-500">
        <p className="font-medium">LaFusee Industry OS v{VERSION}</p>
        <p className="mt-1">Propulse par NETERU (Mestor · Artemis · Seshat) &bull; Methode ADVERTIS &bull; UPgraders</p>
      </footer>
    </main>
  );
}
