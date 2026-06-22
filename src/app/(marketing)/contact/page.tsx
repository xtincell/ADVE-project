import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/upgraders/site-nav";
import { SiteFooter } from "@/components/upgraders/site-footer";
import { Section, Shell, Eyebrow } from "@/components/upgraders/ui";
import { ContactForm } from "@/components/upgraders/contact-form";
import { CONTACT, IDENTITY } from "@/components/upgraders/data";

export const metadata: Metadata = {
  title: "Contact — UPgraders · Démarrer un projet",
  description:
    "Parlons de votre marque. UPgraders — WhatsApp Douala +237 694 17 17 99 · Abidjan +225 05 46 15 64 56 · xtincell@gmail.com. Cabinet de conseil & stratégie, Afrique francophone.",
};

export default function ContactPage() {
  return (
    <main>
      <SiteNav />

      <header className="relative overflow-hidden border-b border-border-subtle pt-32 pb-14 md:pt-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse at 30% 0%, black 30%, transparent 75%)",
          }}
        />
        <Shell className="relative">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="font-display font-semibold tracking-tighter" style={{ fontSize: "var(--text-5xl, var(--text-4xl))", lineHeight: 1 }}>
            Parlons de votre <span className="font-serif italic font-medium text-accent">marque.</span>
          </h1>
          <p className="mt-6 max-w-[60ch] text-pretty text-foreground-secondary" style={{ fontSize: "var(--text-lg)", lineHeight: 1.5 }}>
            La première conversation est gratuite. WhatsApp est notre canal le plus rapide — on répond sous 24 heures
            ouvrées. {IDENTITY.tagline}
          </p>
        </Shell>
      </header>

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* Coordonnées */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">WhatsApp — le plus rapide</div>
              <div className="flex flex-col gap-3">
                {CONTACT.whatsapp.map((w) => (
                  <a
                    key={w.link}
                    href={w.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 border border-border bg-background p-5 transition-colors hover:border-accent"
                  >
                    <div>
                      <div className="font-display text-lg font-semibold tracking-tight">{w.label}</div>
                      <div className="font-mono text-sm text-foreground-secondary">{w.display}</div>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-accent">Ouvrir →</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">Email & réseaux</div>
              <div className="flex flex-col gap-2">
                <a href={`mailto:${CONTACT.email}`} className="text-sm text-foreground-secondary transition-colors hover:text-accent">
                  {CONTACT.email}
                </a>
                <a href={CONTACT.linkedin.link} target="_blank" rel="noreferrer" className="text-sm text-foreground-secondary transition-colors hover:text-accent">
                  LinkedIn — {CONTACT.linkedin.display}
                </a>
                <div className="mt-1 flex flex-wrap gap-2">
                  {CONTACT.socials.map((s) => (
                    <a
                      key={s.link}
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-border-subtle px-3 py-1.5 font-mono text-[11px] text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <div className="font-mono text-[11px] uppercase tracking-widest text-foreground-muted">Le cabinet</div>
              <p className="mt-2 text-sm text-foreground-secondary">
                {IDENTITY.name} — cabinet de conseil &amp; stratégie · {IDENTITY.hq}. Hubs Douala &amp; Abidjan,
                interventions sur toute l&apos;Afrique francophone.
              </p>
            </div>

            <div className="border border-border-subtle bg-surface-raised p-5">
              <Eyebrow>La Fusée — notre produit</Eyebrow>
              <p className="text-sm text-foreground-secondary">
                Vous préférez explorer seul d&apos;abord ? Essayez notre OS en libre-service : le diagnostic de marque est
                gratuit.{" "}
                <Link href="/intake" className="text-accent underline-offset-4 hover:underline">
                  Lancer le diagnostic →
                </Link>
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <ContactForm />
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
