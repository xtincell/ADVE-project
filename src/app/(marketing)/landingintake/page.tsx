"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Compass, LayoutDashboard, HeartHandshake, Phone, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function PmeLandingPage() {
  const whatsappNumber = "237694171799";
  const whatsappDisplay = "+237 694 17 17 99";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour, je souhaite en savoir plus sur l'accompagnement La Fusée pour mon entreprise.")}`;

  return (
    <main data-theme="bone" className="min-h-screen bg-background text-foreground font-sans">
      {/* ─── HEADER ─── */}
      <header className="absolute inset-x-0 top-0 z-50 px-[var(--pad-page)] py-6 flex items-center justify-between max-w-[var(--maxw-content)] mx-auto">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 100 100" className="h-8 w-8 fill-accent">
            <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z" />
            <path d="M50 20L76 35V65L50 80L24 65V35L50 20Z" className="fill-background" />
          </svg>
          <span className="font-bold tracking-tight text-xl text-foreground">La Fusée</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground-secondary hover:text-accent transition">
            <Phone className="h-4 w-4" />
            <span>{whatsappDisplay}</span>
          </a>
          <Link href="/intake/new" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover transition">
            Faire le diagnostic
          </Link>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-[var(--pad-page)] overflow-hidden">
        <div className="max-w-[var(--maxw-content)] mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 md:order-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle text-accent font-medium text-xs uppercase tracking-wider mb-6">
              <Compass className="h-3.5 w-3.5" />
              <span>Pour les PME d'Afrique de l'Ouest</span>
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-foreground mb-6">
              Donnez à votre entreprise <br />
              <span className="text-gradient-star">la structure qu'elle mérite.</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground-secondary leading-relaxed mb-10 max-w-xl">
              Vous avez l'intuition et la vision. Nous apportons la clarté et l'exécution.
              Découvrez les forces cachées de votre marque et identifiez vos prochains leviers de croissance avec le Diagnostic ADVE.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/intake/new" className="inline-flex justify-center items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-accent-foreground hover:bg-accent-hover transition shadow-glow-accent">
                Démarrer mon Diagnostic (Offert)
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center items-center gap-2 rounded-xl border-2 border-border-strong bg-transparent px-8 py-4 text-base font-semibold text-foreground hover:border-foreground hover:bg-surface-elevated transition">
                <Phone className="h-5 w-5" />
                Contact direct
              </a>
            </div>
            <p className="mt-4 text-sm text-foreground-muted flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Évaluation immédiate, sans engagement.
            </p>
          </div>
          <div className="order-1 md:order-2 relative aspect-[4/5] md:aspect-square w-full rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/landing-pme/sme-vision.png"
              alt="Dirigeante de PME visionnaire en Afrique de l'Ouest"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* ─── EMPATHY / PAIN POINTS ─── */}
      <section className="py-24 bg-surface-elevated px-[var(--pad-page)]">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-6">
            L'intuition vous a mené jusqu'ici. <br />
            Il vous faut maintenant un système.
          </h2>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            Diriger une PME en Afrique de l'Ouest exige une énergie colossale. Vous naviguez souvent à vue, en gérant l'urgence, au risque de perdre de vue l'essentiel : bâtir une marque pérenne et structurellement rentable.
          </p>
        </div>
        
        <div className="max-w-[var(--maxw-content)] mx-auto grid sm:grid-cols-3 gap-8">
          {[
            {
              icon: <LayoutDashboard className="h-8 w-8 text-accent mb-4" />,
              title: "Dispersion des efforts",
              desc: "Des actions marketing lancées sans cohérence globale, qui coûtent cher mais rapportent peu."
            },
            {
              icon: <Compass className="h-8 w-8 text-accent mb-4" />,
              title: "Manque de clarté",
              desc: "Une proposition de valeur diluée dans un marché saturé. Vous peinez à vous démarquer."
            },
            {
              icon: <HeartHandshake className="h-8 w-8 text-accent mb-4" />,
              title: "Épuisement de l'équipe",
              desc: "Tout repose sur vous. L'absence de structure freine l'engagement et l'autonomie de votre équipe."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-background rounded-2xl p-8 border border-border-subtle shadow-sm hover:shadow-md transition">
              {item.icon}
              <h3 className="font-bold text-xl text-foreground mb-3">{item.title}</h3>
              <p className="text-foreground-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SOLUTION (ADVE) + SECOND IMAGE ─── */}
      <section className="py-24 px-[var(--pad-page)]">
        <div className="max-w-[var(--maxw-content)] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden shadow-xl">
            <Image
              src="/images/landing-pme/sme-collab.png"
              alt="Collaboration en équipe dans une PME"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-6">
              Le Diagnostic ADVE : <br />Votre feuille de route claire
            </h2>
            <p className="text-lg text-foreground-secondary leading-relaxed mb-8">
              Nous avons conçu un outil d'évaluation puissant pour faire un état des lieux instantané de votre entreprise. Obtenez une vision claire, sans jargon, basée sur 4 piliers fondamentaux :
            </p>
            
            <ul className="space-y-6 mb-10">
              {[
                { title: "Authenticité", desc: "Quel est l'ADN profond de votre projet ?" },
                { title: "Distinction", desc: "Comment vous différencier radicalement ?" },
                { title: "Valeur", desc: "Votre modèle économique est-il solide ?" },
                { title: "Engagement", desc: "Votre équipe et vos clients sont-ils avec vous ?" },
              ].map((pillar, idx) => (
                <li key={idx} className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                    {pillar.title.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{pillar.title}</h4>
                    <p className="text-foreground-secondary">{pillar.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            
            <Link href="/intake/new" className="inline-flex items-center gap-2 text-accent font-bold text-lg hover:text-accent-hover transition">
              Faire le diagnostic maintenant <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 bg-accent text-accent-foreground px-[var(--pad-page)] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-3xl md:text-5xl mb-6">
            Prêt à structurer votre croissance ?
          </h2>
          <p className="text-lg md:text-xl text-accent-subtle mb-10 opacity-90">
            Commencez par un diagnostic offert de 5 minutes, ou contactez-nous directement pour en discuter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/intake/new" className="inline-flex justify-center items-center rounded-xl bg-background px-8 py-4 text-base font-bold text-foreground hover:bg-surface-elevated transition shadow-lg">
              Lancer le Diagnostic
            </Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center items-center gap-2 rounded-xl border-2 border-background/30 bg-transparent px-8 py-4 text-base font-semibold text-background hover:bg-background/10 transition">
              <Phone className="h-5 w-5" />
              {whatsappDisplay}
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-[var(--pad-page)] bg-background border-t border-border-subtle text-center text-foreground-muted">
        <div className="max-w-[var(--maxw-content)] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="h-6 w-6 fill-current opacity-50">
              <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z" />
            </svg>
            <span className="font-bold text-sm">La Fusée</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} La Fusée. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="hover:text-foreground transition">Confidentialité</Link>
            <Link href="/terms" className="hover:text-foreground transition">CGU</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
