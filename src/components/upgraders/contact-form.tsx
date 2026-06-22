"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { CONTACT } from "./data";

const NEEDS = [
  "Audit ADVE",
  "Mandat RTIS complet",
  "Direction artistique",
  "Production photo / vidéo",
  "Marque blanche (agence/studio)",
  "Autre",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Brief express — capture le lead dans le CRM natif (`/api/contact` → CrmContact
 * source WEBSITE_CONTACT + CrmMessage IN, visible dans /console/anubis/crm) PUIS
 * ouvre le canal choisi (WhatsApp prioritaire / email) avec le message pré-rempli.
 * Le canal réel de l'agence est WhatsApp (KB §8) ; le CRM garde la trace.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [need, setNeed] = useState<string>(NEEDS[0]);
  const [message, setMessage] = useState("");
  const [captured, setCaptured] = useState(false);

  const compose = () => {
    const lines = [
      "Bonjour UPgraders 👋",
      "",
      `Je m'appelle ${name || "—"}.`,
      brand ? `Marque / projet : ${brand}.` : null,
      `Besoin : ${need}.`,
      email ? `Email : ${email}.` : null,
      message ? `\n${message}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const waHref = `${CONTACT.whatsapp[0].link}?text=${encodeURIComponent(compose())}`;
  const mailHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `Projet — ${brand || name || "nouvelle marque"}`,
  )}&body=${encodeURIComponent(compose())}`;

  const ready = name.trim().length > 1 && EMAIL_RE.test(email);

  /* Capture le lead côté CRM avant d'ouvrir le canal (best-effort, non bloquant). */
  const capture = async () => {
    if (captured) return;
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, brand, need, message }),
      });
    } catch {
      // réseau indisponible — on laisse quand même l'utilisateur atteindre WhatsApp
    } finally {
      setCaptured(true);
    }
  };

  const goWhatsApp = async () => {
    await capture();
    window.open(waHref, "_blank", "noopener,noreferrer");
  };
  const goEmail = async () => {
    await capture();
    window.location.href = mailHref;
  };

  return (
    <div className="border border-border bg-background p-7 md:p-8">
      <div className="mb-5 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">Brief express</div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <span className="text-sm text-foreground-secondary">Email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@marque.com"
              className="border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground-secondary">Téléphone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237…"
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
        </div>
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
          <button
            type="button"
            onClick={goWhatsApp}
            disabled={!ready}
            className="inline-flex items-center gap-2 bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Envoyer sur WhatsApp
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goEmail}
            disabled={!ready}
            className="inline-flex items-center gap-2 border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
          >
            Par email
          </button>
        </div>
        {captured ? (
          <p className="inline-flex items-center gap-2 font-mono text-[11px] text-success">
            <Check className="h-3.5 w-3.5" /> Brief enregistré — on revient vers vous sous 24 h.
          </p>
        ) : (
          <p className="font-mono text-[11px] text-foreground-muted">
            Le brief est enregistré dès l&apos;envoi ; le canal s&apos;ouvre avec le message pré-rempli.
          </p>
        )}
      </div>
    </div>
  );
}
