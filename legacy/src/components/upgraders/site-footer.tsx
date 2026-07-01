"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CONTACT, IDENTITY } from "./data";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "ok" | "error">("idle");

  const subscribe = async () => {
    if (!email.includes("@")) return;
    setState("pending");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      <div className="mb-2 font-mono text-2xs uppercase tracking-widest text-foreground-muted">The Upgrade — notes de cabinet</div>
      {state === "ok" ? (
        <p className="text-sm text-foreground-secondary">Inscription confirmée — bienvenue à bord.</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && subscribe()}
            placeholder="votre@email.com"
            aria-label="Adresse email"
            className="w-full max-w-[240px] border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={subscribe}
            disabled={state === "pending" || !email.includes("@")}
            className="bg-accent px-4 py-2 font-mono text-2xs uppercase tracking-widest text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {state === "pending" ? "…" : "S'abonner"}
          </button>
        </div>
      )}
      {state === "error" && <p className="mt-1 text-xs text-error">Échec — réessayez.</p>}
      <p className="mt-1.5 text-2xs text-foreground-muted">Stratégie de marque, une fois par mois. Désinscription en un clic.</p>
    </div>
  );
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3.5 font-mono text-2xs uppercase tracking-widest text-foreground-muted">{title}</div>
      {children}
    </div>
  );
}

function FLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block py-1 text-sm text-foreground-secondary transition-colors hover:text-accent">
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-raised print:hidden">
      <div className="mx-auto grid max-w-[var(--maxw-content)] grid-cols-1 gap-12 border-b border-border px-[var(--pad-page)] pb-12 pt-16 md:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo variant="lockup-horizontal" size={38} alt="UPgraders" />
          <p className="mt-3 max-w-[34ch] text-sm text-foreground-secondary">{IDENTITY.tagline} {IDENTITY.claim}</p>

          <div className="mt-6 flex flex-col gap-1.5">
            {CONTACT.whatsapp.map((w) => (
              <a key={w.link} href={w.link} target="_blank" rel="noreferrer" className="text-sm text-foreground-secondary transition-colors hover:text-accent">
                WhatsApp {w.label} — {w.display}
              </a>
            ))}
            <a href={`mailto:${CONTACT.email}`} className="text-sm text-foreground-secondary transition-colors hover:text-accent">
              {CONTACT.email}
            </a>
          </div>

          <div className="mt-6">
            <Newsletter />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {IDENTITY.hashtags.map((h) => (
              <span key={h} className="border border-border-subtle px-2 py-1 font-mono text-2xs text-foreground-muted">
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Col title="Agence">
            <FLink href="/agence">Qui sommes-nous</FLink>
            <FLink href="/methode">Méthode ADVE/RTIS</FLink>
            <FLink href="/services">Services</FLink>
            <FLink href="/la-guilde">La Guilde</FLink>
            <FLink href="/realisations">Réalisations</FLink>
          </Col>
          <Col title="Produit — La Fusée">
            <FLink href="/lafusee">La Fusée (l&apos;OS)</FLink>
            <FLink href="/intake">Diagnostic gratuit</FLink>
            <FLink href="/pricing">Tarifs</FLink>
            <FLink href="/cockpit">Cockpit</FLink>
            <FLink href="/LaGuilde">Marketplace</FLink>
          </Col>
          <Col title="Cabinet">
            <FLink href="/blog">Blog</FLink>
            <FLink href="/contact">Contact</FLink>
            <FLink href="/changelog">Changelog</FLink>
            <FLink href="/status">Status</FLink>
          </Col>
          <Col title="Conformité">
            <FLink href="/mentions-legales">Mentions légales</FLink>
            <FLink href="/cgu">CGU</FLink>
            <FLink href="/cgv">CGV</FLink>
            <FLink href="/sla">SLA</FLink>
            <FLink href="/privacy">Confidentialité</FLink>
            <FLink href="/trust-center">Trust Center</FLink>
          </Col>
        </div>
      </div>
      <div className="mx-auto mt-6 flex max-w-[var(--maxw-content)] flex-wrap gap-x-6 gap-y-2 px-[var(--pad-page)] pb-8 font-mono text-2xs text-foreground-muted">
        <span>© 2026 UPgraders — cabinet de conseil &amp; stratégie · {IDENTITY.hq}</span>
        <span>IP ADVE/RTIS</span>
        <span>La Fusée — Industry OS du marché créatif africain</span>
      </div>
    </footer>
  );
}
