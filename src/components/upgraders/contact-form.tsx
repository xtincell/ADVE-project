"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CONTACT } from "./data";

const NEEDS = [
  "Audit ADVE",
  "Mandat RTIS complet",
  "Direction artistique",
  "Production photo / vidéo",
  "Marque blanche (agence/studio)",
  "Autre",
] as const;

/**
 * Project brief — composes a WhatsApp (or email) message from the form.
 * No backend: the agency's real intake channel is WhatsApp (KB §8). The form
 * just pre-fills a structured message so the conversation starts qualified.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [need, setNeed] = useState<string>(NEEDS[0]);
  const [message, setMessage] = useState("");

  const compose = () => {
    const lines = [
      "Bonjour UPgraders 👋",
      "",
      `Je m'appelle ${name || "—"}.`,
      brand ? `Marque / projet : ${brand}.` : null,
      `Besoin : ${need}.`,
      message ? `\n${message}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const waHref = `${CONTACT.whatsapp[0].link}?text=${encodeURIComponent(compose())}`;
  const mailHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `Projet — ${brand || name || "nouvelle marque"}`,
  )}&body=${encodeURIComponent(compose())}`;

  const ready = name.trim().length > 1;

  return (
    <div className="border border-border bg-background p-7 md:p-8">
      <div className="mb-5 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">Brief express</div>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground-secondary">Votre nom *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom Nom"
            className="border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground-secondary">Marque / projet</span>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Le nom de votre marque"
            className="border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground-secondary">Votre besoin</span>
          <select
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            className="border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {NEEDS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground-secondary">En deux mots</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Où en est la marque, ce que vous visez…"
            className="resize-none border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>

        <div className="mt-1 flex flex-wrap gap-3">
          <a
            href={ready ? waHref : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!ready}
            className={
              ready
                ? "inline-flex items-center gap-2 bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
                : "inline-flex cursor-not-allowed items-center gap-2 bg-accent px-5 py-3 text-sm font-medium text-accent-foreground opacity-40"
            }
          >
            Envoyer sur WhatsApp
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a
            href={ready ? mailHref : undefined}
            aria-disabled={!ready}
            className={
              ready
                ? "inline-flex items-center gap-2 border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
                : "inline-flex cursor-not-allowed items-center gap-2 border border-border-strong px-5 py-3 text-sm font-medium text-foreground opacity-40"
            }
          >
            Par email
          </a>
        </div>
        <p className="font-mono text-[11px] text-foreground-muted">
          Le brief ouvre une conversation pré-remplie — vous gardez la main avant d&apos;envoyer.
        </p>
      </div>
    </div>
  );
}
