"use client";

/**
 * <DiagnosticCta /> — mini-funnel porté de /landingintake (façade unique V2).
 *
 * La seule valeur unique de la 3ᵉ landing : trois champs (nom/email/marque) +
 * choix de méthode, capture CRM best-effort (un prospect qui ferme n'est
 * jamais perdu), puis route vers /intake pré-rempli (le step contact y est
 * sauté). Styles : token bridge `.lf` scopé (landingintake.css) — le reste de
 * la page garde le DS marketing.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Sparkles, ArrowRight, Lock, ClipboardList, FileText } from "lucide-react";
import "@/styles/landingintake.css";

export function DiagnosticCta({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <DiagnosticModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function DiagnosticModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [method, setMethod] = useState<"GUIDED" | "IMPORT">("GUIDED");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const goToIntake = () => {
    const qs = new URLSearchParams({ name: form.name, email: form.email, company: form.company, method }).toString();
    router.push(`/intake?${qs}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Votre nom est requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("Entrez une adresse email valide.");
    if (!form.company.trim()) return setErr("Le nom de votre marque est requis.");
    setErr("");
    setDone(true);
    goToIntake();
    // Capture CRM best-effort — un prospect qui ferme ici n'est jamais perdu.
    void fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        brand: form.company,
        need: "Diagnostic La Fusée (landing)",
        message: `Méthode choisie : ${method === "GUIDED" ? "questionnaire guidé" : "import de documents"}.`,
      }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="up-root lf">
      <div className="lf-scrim" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <button className="modal__x" onClick={onClose} aria-label="Fermer"><X /></button>
          {done ? (
            <div className="done">
              <div className="done__check"><Check /></div>
              <h3>C&apos;est parti, {form.name.split(" ")[0]} 🚀</h3>
              <p>
                Votre diagnostic pour <b style={{ color: "var(--text-primary)" }}>{form.company}</b> est prêt à démarrer.
                {method === "GUIDED" ? " On vous guide pas à pas." : " Importez vos documents, l'analyse fait le reste."}
              </p>
              <button className="lf-btn lf-btn--primary lf-btn--lg lf-btn--block" onClick={goToIntake}>
                Commencer le questionnaire <ArrowRight />
              </button>
              <p className="modal__legal">Vos réponses préremplissent le questionnaire — rien n&apos;est envoyé sans votre accord.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <span className="modal__eyebrow"><Sparkles style={{ width: 13, height: 13 }} /> Diagnostic offert · 15 min</span>
              <h3>Démarrez votre diagnostic</h3>
              <p className="modal__sub">Trois informations, et on lance l&apos;évaluation de votre marque.</p>
              <div className="field">
                <label htmlFor="d-name">Votre nom</label>
                <input id="d-name" className={err && !form.name.trim() ? "err" : ""} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Awa Ndongo" />
              </div>
              <div className="field">
                <label htmlFor="d-email">Email professionnel</label>
                <input id="d-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="awa@mamarque.com" />
              </div>
              <div className="field">
                <label htmlFor="d-co">Nom de votre marque</label>
                <input id="d-co" value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex : Zola Apparel" />
              </div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "4px 0 9px" }}>Méthode</label>
              <div className="method-row">
                <button type="button" className={"method" + (method === "GUIDED" ? " on" : "")} onClick={() => setMethod("GUIDED")}>
                  <b><ClipboardList /> Questionnaire</b><small>Guidé · ~10 min</small>
                </button>
                <button type="button" className={"method" + (method === "IMPORT" ? " on" : "")} onClick={() => setMethod("IMPORT")}>
                  <b><FileText /> Import</b><small>Documents · ~3 min</small>
                </button>
              </div>
              {err && <p className="modal__err">{err}</p>}
              <button className="lf-btn lf-btn--primary lf-btn--lg lf-btn--block" type="submit">
                Lancer mon diagnostic <ArrowRight />
              </button>
              <p className="modal__legal">
                <Lock style={{ width: 12, height: 12, verticalAlign: "-2px" }} /> Vos données restent confidentielles et ne sont jamais partagées.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
