import { ScoreBadge } from "@/components/shared/score-badge";

export default function PublicScorePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Score ADVE-RTIS /200</h1>
          <p className="text-lg text-muted-foreground">
            Le standard de mesure de la force de marque en Afrique francophone.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-5">
          {[
            { range: "0-80", label: "Zombie", desc: "Invisible, pas d'identité distincte", color: "bg-gray-100" },
            { range: "81-120", label: "Ordinaire", desc: "Fonctionnel mais interchangeable", color: "bg-yellow-50" },
            { range: "121-160", label: "Forte", desc: "Reconnue et respectée", color: "bg-blue-50" },
            { range: "161-180", label: "Culte", desc: "Adorée, inspire la dévotion", color: "bg-purple-50" },
            { range: "181-200", label: "Icône", desc: "Légendaire, référence mondiale", color: "bg-amber-50" },
          ].map((tier) => (
            <div key={tier.label} className={`rounded-lg border p-4 text-center ${tier.color}`}>
              <p className="text-2xl font-bold">{tier.range}</p>
              <p className="font-semibold">{tier.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tier.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg border bg-card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Les 8 piliers</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { key: "A", name: "Authenticité", q: "Qui êtes-vous ?" },
              { key: "D", name: "Distinction", q: "Pourquoi vous ?" },
              { key: "V", name: "Valeur", q: "Que promettez-vous ?" },
              { key: "E", name: "Engagement", q: "Comment créer la dévotion ?" },
              { key: "R", name: "Risk", q: "Vos angles morts ?" },
              { key: "T", name: "Track", q: "Comment mesurer ?" },
              { key: "I", name: "Implementation", q: "Stratégie → action ?" },
              { key: "S", name: "Stratégie", q: "Comment assembler ?" },
            ].map((p) => (
              <div key={p.key} className="rounded-lg border p-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{p.key}</span>
                <p className="mt-1 font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.q}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/intake" className="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground">
            Mesurer votre marque gratuitement
          </a>
          <p className="mt-2 text-xs text-muted-foreground">15 minutes · Gratuit · Confidentiel</p>
        </div>
      </div>
    </main>
  );
}
