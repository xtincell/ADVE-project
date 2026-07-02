import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHero, Section } from "@/components/marketing/section";
import { CONTACT, IDENTITY } from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Parlons de votre marque. UPgraders — WhatsApp Douala +237 694 17 17 99 · Abidjan +225 05 46 15 64 56 · xtincell@gmail.com. Cabinet de conseil & stratégie, Afrique francophone.",
};

/**
 * Contact — port de legacy/(marketing)/contact : coordonnées réelles
 * (WhatsApp Douala/Abidjan, email, LinkedIn, réseaux), pas de formulaire —
 * WhatsApp est le canal commercial réel, l'intake le funnel produit.
 */
export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Parlons de votre <span className="text-coral">marque</span>.
          </>
        }
        lede={`La première conversation est gratuite. WhatsApp est notre canal le plus rapide — on répond sous 24 heures ouvrées. ${IDENTITY.tagline}`}
      >
        <Link href="/intake" className={buttonVariants({ size: "lg" })}>
          Ou : diagnostic gratuit en ligne <ArrowRight />
        </Link>
      </PageHero>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <div>
              <p className="eyebrow text-smoke">WhatsApp — le plus rapide</p>
              <div className="mt-3 flex flex-col gap-3">
                {CONTACT.whatsapp.map((w) => (
                  <a
                    key={w.link}
                    href={w.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 rounded-lg bg-white p-5 shadow-card transition-shadow hover:shadow-card-lg"
                  >
                    <span>
                      <span className="font-display block text-lg font-semibold">{w.label}</span>
                      <span className="block font-mono text-sm text-smoke">{w.display}</span>
                    </span>
                    <span className="eyebrow inline-flex items-center gap-1 text-coral">
                      Ouvrir <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow text-smoke">Email &amp; réseaux</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex items-center gap-2 font-semibold text-ink transition-colors hover:text-coral"
                >
                  <Mail className="size-4 text-coral" aria-hidden="true" />
                  {CONTACT.email}
                </a>
                <a
                  href={CONTACT.linkedin.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-graphite transition-colors hover:text-coral"
                >
                  LinkedIn — {CONTACT.linkedin.display}
                </a>
                <div className="mt-1 flex flex-wrap gap-2">
                  {CONTACT.socials.map((s) => (
                    <a
                      key={s.link}
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xs border border-ink/15 px-3 py-1.5 font-mono text-xs text-smoke transition-colors hover:border-coral hover:text-coral"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-6">
              <p className="eyebrow text-smoke">Le cabinet</p>
              <p className="mt-2 text-sm leading-relaxed text-graphite">
                {IDENTITY.name} — cabinet de conseil &amp; stratégie · {IDENTITY.hq}. Hubs Douala
                &amp; Abidjan, interventions sur toute l&apos;Afrique francophone.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-bento">
            <div className="rounded-xl bg-ink p-8 text-bone shadow-card-lg">
              <p className="eyebrow text-coral">La Fusée — notre produit</p>
              <h2 className="font-display mt-2 text-xl font-semibold">
                Vous préférez explorer seul d&apos;abord ?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-sand">
                Essayez notre OS en libre-service : le diagnostic de marque est gratuit — 15
                minutes, un score, vos angles morts, sans engagement.
              </p>
              <Link href="/intake" className={`${buttonVariants({ size: "md" })} mt-6`}>
                Lancer le diagnostic <ArrowRight />
              </Link>
            </div>
            <div className="rounded-xl border border-ink/10 bg-white p-8 shadow-card">
              <p className="eyebrow text-smoke">Pour cadrer vite</p>
              <p className="mt-3 text-sm leading-relaxed text-graphite">
                Écrivez-nous en une phrase : votre marque, votre secteur, votre ambition. On
                revient vers vous avec la bonne porte d&apos;entrée —{" "}
                <Link href="/services" className="font-semibold text-coral hover:underline">
                  audit, mandat ou marque blanche
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
