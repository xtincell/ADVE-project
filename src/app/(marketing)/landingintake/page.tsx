"use client";

/**
 * /landingintake — La Fusée by UPgraders · Landing d'acquisition PME (Diagnostic ADVE).
 * Recréation du handoff Claude Design (advertis-juin26) : hero panda → sections
 * claires, énergie fusée + doodles + stickers, mini-funnel de diagnostic.
 * Styles : src/styles/landingintake.css (token bridge UPgraders scopé `.lf`).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, Compass, Gauge, TrendingUp, Check, Star, X,
  FileText, Award, Sparkles, Lock, ClipboardList, Shuffle, Route, BatteryLow, Rocket,
} from "lucide-react";
import "@/styles/landingintake.css";

const WA_NUMBER = "237694171799";
const WA_TEXT = encodeURIComponent("Bonjour, je souhaite faire le Diagnostic ADVE de ma marque avec La Fusée.");
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;
const WA_DISPLAY = "+237 694 17 17 99";

function Wa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4Z" />
      <path d="M9 9.2c.3 2.4 3.4 5.5 5.8 5.8.5 0 1-.3 1.2-.8.2-.4 0-.9-.4-1.1l-1.4-.7-.9.9c-1-.4-1.9-1.3-2.3-2.3l.9-.9-.7-1.4c-.2-.4-.7-.6-1.1-.4-.5.2-.8.7-.8 1.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Scroll reveal hook (robust : IO + scroll + timeout fallbacks) */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const els = ref.current ? Array.from(ref.current.querySelectorAll<HTMLElement>(".reveal")) : [];
    if (!els.length) return;
    const revealAll = () => els.forEach((e) => e.classList.add("in"));
    els.forEach((e, idx) => { e.style.transitionDelay = `${(idx % 3) * 80}ms`; });
    if (!("IntersectionObserver" in window)) { revealAll(); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    const onScroll = () => revealAll();
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    const t = setTimeout(revealAll, 900);
    return () => { io.disconnect(); clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);
  return ref;
}

const PILLARS = [
  { k: "A", name: "Authenticité", q: "L'ADN profond et la raison d'être de votre marque.", v: 82, c: "var(--accent)" },
  { k: "D", name: "Distinction", q: "Ce qui vous rend radicalement unique sur le marché.", v: 64, c: "var(--up-blue)" },
  { k: "V", name: "Valeur", q: "La solidité et la rentabilité de votre modèle.", v: 71, c: "var(--success)" },
  { k: "E", name: "Engagement", q: "La force de votre communauté et de votre équipe.", v: 88, c: "var(--up-violet)" },
];

function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="nav"><div className="wrapc nav__in">
      <a className="brand" href="#top">
        <Image className="brand__mark" src="/brand/logos/lafusee-logo.png" alt="La Fusée" width={42} height={42} priority />
        <span className="brand__txt">
          <span className="brand__name">La Fusée</span>
          <span className="brand__by">by <b>UP</b>graders</span>
        </span>
      </a>
      <nav className="nav__links">
        <a href="#defis">Le constat</a>
        <a href="#methode">Comment ça marche</a>
        <a href="#adve">Le protocole</a>
        <a href="#temoignages">Témoignages</a>
      </nav>
      <div style={{ flex: 1 }} />
      <a className="nav__wa" href={WA_LINK} target="_blank" rel="noopener noreferrer"><Wa /><span>{WA_DISPLAY}</span></a>
      <button className="lf-btn lf-btn--primary lf-btn--sm" onClick={onStart}>Faire le diagnostic</button>
    </div></header>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="hero up-grain" id="top">
      <span className="hero__glow" aria-hidden="true" />
      <span className="hero__weave up-texture-geo" aria-hidden="true" />
      <div className="wrapc"><div className="hero__grid">
        <div>
          <span className="hero__eyebrow"><Compass /> Diagnostic ADVE · PME d'Afrique de l'Ouest</span>
          <h1>Diagnostiquez votre marque.<br /><span className="em">Propulsez votre croissance.</span></h1>
          <p className="hero__sub">
            Le protocole ADVE analyse 4 piliers fondamentaux de votre entreprise et vous remet
            une feuille de route claire — en 15 minutes, sans jargon.
          </p>
          <div className="hero__cta">
            <button className="lf-btn lf-btn--primary lf-btn--lg" onClick={onStart}>Démarrer mon diagnostic — offert <ArrowRight /></button>
            <a className="lf-btn lf-btn--outline lf-btn--lg" href="/scorer">Scorer ma marque — 1 min, gratuit</a>
            <a className="lf-btn lf-btn--outline lf-btn--lg" href={WA_LINK} target="_blank" rel="noopener noreferrer"><Wa /> Parler sur WhatsApp</a>
          </div>
          <div className="hero__reassure">
            <span><Check /> Évaluation immédiate</span>
            <span><Check /> Sans engagement</span>
            <span><Check /> 100% confidentiel</span>
          </div>
          {/* Preuve sociale RÉELLE (canon data.ts STATS/CLIENT_STRIP) — l'ancien
              bloc (« +250 dirigeants · 4,9/5 » + avatars fictifs) était inventé
              (audit intention/exécution 2026-07-16). */}
          <div className="proof">
            <div className="proof__txt">
              <b>30+ marques accompagnées depuis 2017</b>
              <span>Motion19 · Universal Music Africa · Chococam · Ecobank…</span>
            </div>
          </div>
        </div>

        <div className="hero__art">
          <span className="hero__sticker"><span className="up-sticker up-sticker--red">Level <span className="up-sticker__em">Up!</span></span></span>
          <div className="hero__photo up-grain">
            <Image src="/brand/photos/presenting.webp" alt="Dirigeante de PME présentant sa stratégie de marque" width={520} height={460} priority />
          </div>
          <div className="float float--score">
            <span className="float__ic" style={{ background: "var(--accent-fill)", color: "var(--accent)" }}><Gauge /></span>
            <div><small>Score de marque</small><b>156 / 200</b></div>
          </div>
          <div className="float float--growth">
            <span className="float__ic" style={{ background: "var(--success-fill)", color: "var(--success)" }}><TrendingUp /></span>
            <div><small>Palier</small><b style={{ color: "var(--success)" }}>FORTE</b></div>
          </div>
          <span className="doodle" style={{ top: -28, left: 18, width: 64, height: 64, transform: "rotate(-12deg)" }} aria-hidden="true">
            <svg viewBox="0 0 64 64"><path d="M10 40c-6-14 4-30 20-30 14 0 24 12 22 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 7" /><path d="M50 18l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1 3-6Z" fill="currentColor" /></svg>
          </span>
        </div>
      </div></div>
    </section>
  );
}

function Constat() {
  const ref = useReveal();
  const items = [
    { n: "01", ic: <Shuffle />, t: "Des efforts dispersés", d: "Des actions marketing lancées sans cohérence : elles coûtent cher et rapportent peu." },
    { n: "02", ic: <Route />, t: "Un manque de clarté", d: "Une proposition de valeur diluée dans un marché saturé. Vous peinez à vous démarquer." },
    { n: "03", ic: <BatteryLow />, t: "Tout repose sur vous", d: "L'absence de système freine l'autonomie de l'équipe — et épuise le dirigeant." },
  ];
  return (
    <section className="sec sec--light" id="defis" data-theme="light" ref={ref}>
      <span className="deco-weave constat__weave up-texture-geo" data-on-light aria-hidden="true" />
      <div className="wrapc"><div className="constat__grid">
        <div className="constat__head reveal">
          <span className="kick">Le constat</span>
          <h2>L'intuition vous a mené loin.<br /><span className="em">Il vous faut un système.</span></h2>
          <p className="sec__lead">Diriger une PME en Afrique de l'Ouest demande une énergie colossale. Naviguer à vue
            finit par coûter la chose la plus précieuse : une marque pérenne et structurellement rentable.</p>
          <div className="constat__badge">
            <Sparkles /><b>3 dirigeants sur 4</b><span>ressentent au moins un de ces blocages.</span>
          </div>
        </div>
        <div className="problems">
          {items.map((it) => (
            <div key={it.t} className="problem reveal">
              <span className="problem__num">{it.n}</span>
              <div className="problem__ic">{it.ic}</div>
              <div><h3>{it.t}</h3><p>{it.d}</p></div>
            </div>
          ))}
        </div>
      </div></div>
    </section>
  );
}

function Steps({ onStart }: { onStart: () => void }) {
  const ref = useReveal();
  const steps = [
    { n: "1", tag: "~10 minutes", t: "Vous répondez", d: "Un questionnaire guidé sur les 4 piliers ADVE — ou importez vos documents, l'IA s'occupe du reste." },
    { n: "2", tag: "Immédiat", t: "Vous recevez votre score", d: "Votre socle de marque sur 100, pilier par pilier — puis le score complet sur 200, mesuré sur épreuves." },
    { n: "3", tag: "Activable", t: "Vous passez à l'action", d: "Une feuille de route priorisée — et l'option d'être accompagné par La Fusée pour l'exécuter." },
  ];
  return (
    <section className="sec sec--dark up-grain" id="methode" ref={ref}>
      <span className="deco-weave journey__weave up-texture-geo" aria-hidden="true" />
      <span className="deco-glow journey__glow" aria-hidden="true" />
      <div className="wrapc"><div className="journey__wrap">
        <div className="sec__head sec__head--center reveal">
          <span className="kick" style={{ justifyContent: "center" }}>En 3 étapes</span>
          <h2>Comment ça <span className="em">marche</span></h2>
          <p className="sec__lead">Du brief au plan d'action, sans friction. Simple, rapide, concret.</p>
        </div>
        <div className="journey">
          <svg className="journey__trail" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M40 30 C 250 90, 420 -10, 540 30 S 820 80, 960 26" fill="none" stroke="var(--up-red-ember)" strokeWidth="2.5" strokeDasharray="3 10" strokeLinecap="round" opacity="0.7" />
            <path d="M944 14l22 12-20 14" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {steps.map((s) => (
            <div key={s.n} className="jstep reveal">
              <div className="jstep__node">{s.n}</div>
              <span className="jstep__tag"><Sparkles style={{ width: 12, height: 12 }} /> {s.tag}</span>
              <h3>{s.t}</h3><p>{s.d}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 48 }} className="reveal">
          <button className="lf-btn lf-btn--primary lf-btn--lg" onClick={onStart}>Lancer mon diagnostic <ArrowRight /></button>
        </div>
      </div></div>
    </section>
  );
}

function ScoreReport() {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver((e) => { if (e[0]?.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    const t = setTimeout(() => setShown(true), 1400);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
  // Échelle canon /200 (classifyTier) — la landing vendait un « 78/100 » alors
  // que le produit rend un /200 (audit 2026-07-16). 156/200 = palier FORTE.
  const R = 58, C = 2 * Math.PI * R, total = 156;
  const offset = shown ? C * (1 - total / 200) : C;
  return (
    <div className="report" ref={ref}>
      <span className="report__diamond up-texture-diamond" aria-hidden="true" />
      <div className="report__top">
        <div className="report__co">Zola Apparel<small>Mode · Côte d&apos;Ivoire · exemple fictif</small></div>
        <span className="modal__eyebrow" style={{ color: "var(--up-gold)" }}><Award style={{ width: 14, height: 14 }} /> Exemple de rapport</span>
      </div>
      <div className="score-ring">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--up-ink-4)" strokeWidth="11" />
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--accent)" strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.1s var(--ease-out)" }} />
        </svg>
        <div className="score-ring__v"><b>{shown ? total : 0}</b><small>/ 200</small></div>
      </div>
      <div className="report__grade"><span><Star style={{ width: 13, height: 13 }} /> Marque en bonne voie</span></div>
      <div className="report__bars">
        {PILLARS.map((p) => (
          <div key={p.k} className="rbar">
            <div className="rbar__top"><span>{p.k} · {p.name}</span><b>{p.v}</b></div>
            <div className="rbar__track"><div className="rbar__fill" style={{ width: shown ? `${p.v}%` : "0%", background: p.c }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Adve() {
  const ref = useReveal();
  return (
    <section className="sec sec--light" id="adve" data-theme="light" ref={ref}>
      <span className="deco-weave adve__weave up-texture-geo" data-on-light aria-hidden="true" />
      <div className="wrapc">
        <div className="sec__head reveal" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", maxWidth: "100%", flexWrap: "wrap", gap: 16 }}>
          <div style={{ maxWidth: 620 }}>
            <span className="kick">Le protocole</span>
            <h2>Quatre piliers. <span className="em">Une vision claire.</span></h2>
            <p className="sec__lead">ADVE fait l'état des lieux de votre marque sans jargon, sur les dimensions qui
              font réellement la différence pour une PME en croissance.</p>
          </div>
          <div style={{ paddingBottom: 6 }}><span className="up-sticker up-sticker--dark"><Award /> Ton score t'attend</span></div>
        </div>
        <div className="adve">
          <div className="pillars">
            {PILLARS.map((p) => (
              <div key={p.k} className="pillar reveal">
                <div className="pillar__badge" style={{ background: p.c }}>{p.k}</div>
                <div className="pillar__b">
                  <div className="pillar__top"><h4>{p.name}</h4><span className="pillar__v">{p.v} %</span></div>
                  <p>{p.q}</p>
                  <div className="rbar__track" style={{ background: "color-mix(in srgb, var(--text-primary) 9%, transparent)" }}>
                    <div className="rbar__fill" style={{ width: `${p.v}%`, background: p.c }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="adve__report reveal"><ScoreReport /></div>
        </div>
      </div>
    </section>
  );
}

/**
 * Preuve sociale RÉELLE — marques effectivement bâties ou propulsées par le
 * cabinet (canon `data.ts` CLIENT_STRIP/REALISATIONS). L'ancienne section
 * affichait trois témoignages nominatifs FABRIQUÉS (personnes et marques
 * inexistantes, notes 5★ et gains « +19 pts » inventés) — purgée le 2026-07-16
 * (audit intention/exécution : tromperie active face lead, exposition
 * juridique pratique commerciale trompeuse).
 */
function Temoignages() {
  const ref = useReveal();
  const items = [
    { n: "Motion19", co: "Équipement audiovisuel · Douala" },
    { n: "Universal Music Africa", co: "Musique · Abidjan" },
    { n: "Chococam", co: "Agroalimentaire · Douala" },
    { n: "Ecobank", co: "Banque · panafricain" },
    { n: "Akwa Palace", co: "Hôtellerie · Douala" },
    { n: "Friesland Campina", co: "Agroalimentaire · multinationale" },
  ];
  return (
    <section className="sec sec--dark up-grain" id="temoignages" ref={ref}>
      <span className="deco-weave tmon__weave up-texture-geo" aria-hidden="true" />
      <div className="wrapc">
        <div className="sec__head reveal">
          <span className="kick">Ils nous font confiance</span>
          <h2>Des marques <span className="em">réelles</span>, bâties ou propulsées par le cabinet.</h2>
          <p className="sec__lead">30+ marques accompagnées depuis 2017, de la PME locale à la multinationale — voici quelques-unes d&apos;entre elles.</p>
        </div>
        <div className="tmon-grid">
          {items.map((it) => (
            <div key={it.n} className="tmon reveal">
              <div className="tmon__foot" style={{ marginTop: 0 }}>
                <div className="tmon__who"><b>{it.n}</b><span>{it.co}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Agency() {
  // Stats RÉELLES (canon data.ts STATS — « 30+ marques, depuis 2017 »).
  // L'ancien bloc (« 250+ · 4,9/5 · 8 ans ») était inventé et contredisait
  // la homepage UPgraders (audit 2026-07-16).
  const stats = [
    { v: "30+", l: "marques accompagnées" },
    { v: "2017", l: "année de fondation" },
    { v: "2 villes", l: "Douala · Abidjan" },
  ];
  return (
    <section className="sec sec--bone" id="upgraders" data-theme="light">
      <div className="wrapc"><div className="agency__grid">
        <div>
          <span className="kick">L'agence derrière l'outil</span>
          <h2>La Fusée est propulsée par <span className="em">UPgraders</span>.</h2>
          <p className="agency__intro">Agence de marketing, branding &amp; digital basée à Douala, au service des entrepreneurs
            d'Afrique francophone. Une fois votre score établi, notre équipe peut prendre le relais
            pour exécuter votre feuille de route — du branding à la croissance.</p>
          <Image className="agency__logo" src="/brand/logos/upgraders-lockup-horizontal.png" alt="UPgraders — La Passion pour Propulseur" width={220} height={56} />
          <div className="agency__svc">
            {["Marketing digital", "Branding", "Réseaux sociaux", "Photographie", "Stratégie"].map((s) => <span key={s}>{s}</span>)}
          </div>
          <div style={{ marginTop: 26 }}>
            <a className="lf-btn lf-btn--outline lf-btn--md" href="https://www.upgraders.pro" target="_blank" rel="noopener noreferrer">Découvrir UPgraders <ArrowUpRight /></a>
          </div>
        </div>
        <div className="agency__stats">
          {stats.map((s) => <div key={s.l} className="astat"><b>{s.v}</b><span>{s.l}</span></div>)}
        </div>
      </div></div>
    </section>
  );
}

function FinalCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="cta">
      <span className="deco-glow cta__glow" aria-hidden="true" />
      <span className="cta__weave up-texture-geo" aria-hidden="true" />
      <div className="wrapc"><div className="cta__in">
        <span className="cta__rocket"><Rocket /></span>
        <h2>Prêt à passer au <span className="em">niveau supérieur</span> ?</h2>
        <p>Commencez par un diagnostic offert de 15 minutes. Sans engagement, sans carte bancaire.</p>
        <div className="cta__btns">
          <button className="lf-btn lf-btn--primary lf-btn--lg" onClick={onStart}>Démarrer mon diagnostic <ArrowUpRight /></button>
          <a className="lf-btn lf-btn--secondary lf-btn--lg" href={WA_LINK} target="_blank" rel="noopener noreferrer"><Wa /> Discuter sur WhatsApp</a>
        </div>
      </div></div>
    </section>
  );
}

function Footer({ onStart }: { onStart: () => void }) {
  return (
    <footer className="footer"><div className="wrapc">
      <div className="footer__grid">
        <div>
          <a className="brand" href="#top">
            <Image className="brand__mark" src="/brand/logos/lafusee-logo.png" alt="La Fusée" width={38} height={38} style={{ height: 38, width: "auto" }} />
            <span className="brand__txt">
              <span className="brand__name" style={{ fontSize: 19 }}>La Fusée</span>
              <span className="brand__by">by <b>UP</b>graders</span>
            </span>
          </a>
          <p className="footer__tag">Construisons l'Afrique de demain, aujourd'hui.<br />Douala, Cameroun · www.upgraders.pro</p>
        </div>
        <div>
          <h4>Le diagnostic</h4>
          <div className="footer__links">
            <button type="button" onClick={onStart} style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>Faire le diagnostic ADVE</button>
            <a href="#methode">Comment ça marche</a>
            <a href="#adve">Le protocole ADVE</a>
            <a href="#temoignages">Témoignages</a>
          </div>
        </div>
        <div>
          <h4>Nous contacter</h4>
          <div className="footer__links">
            <a className="footer__wa" href={WA_LINK} target="_blank" rel="noopener noreferrer"><Wa /> {WA_DISPLAY}</a>
            <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>
            <a href="https://www.upgraders.pro" target="_blank" rel="noopener noreferrer">www.upgraders.pro</a>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© 2026 UPgraders SARL — La Passion pour Propulseur. · RC/DLA/2018/B/1381</span>
        <span className="footer__powered">
          <span>Propulsé par</span>
          <Image src="/brand/logos/upgraders-lockup-horizontal-mono.png" alt="UPgraders" width={90} height={26} />
        </span>
      </div>
    </div></footer>
  );
}

function DiagnosticModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [method, setMethod] = useState<"GUIDED" | "IMPORT">("GUIDED");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Votre nom est requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("Entrez une adresse email valide.");
    if (!form.company.trim()) return setErr("Le nom de votre marque est requis.");
    // P2-4 (audit UX 2026-07-19) — l'écran de confirmation intermédiaire
    // (« C'est parti 🚀 » + re-clic) était une étape morte : on route
    // directement vers /intake, qui saute lui-même le step contact (P1-1).
    setErr(""); setDone(true);
    goToIntake();
    // Capture CRM best-effort (pattern ContactForm → /api/contact, CrmContact) :
    // avant ce fix, un prospect qui fermait la modale ici était PERDU — rien
    // n'était persisté nulle part (audit 2026-07-16).
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

  const goToIntake = () => {
    const qs = new URLSearchParams({ name: form.name, email: form.email, company: form.company, method }).toString();
    router.push(`/intake?${qs}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lf-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal__x" onClick={onClose} aria-label="Fermer"><X /></button>
        {done ? (
          <div className="done">
            <div className="done__check"><Check /></div>
            <h3>C'est parti, {form.name.split(" ")[0]} 🚀</h3>
            <p>Votre diagnostic ADVE pour <b style={{ color: "var(--text-primary)" }}>{form.company}</b> est prêt à démarrer.
              {method === "GUIDED" ? " On vous guide à travers les 4 piliers." : " Importez vos documents, l'IA fait le reste."}</p>
            <button className="lf-btn lf-btn--primary lf-btn--lg lf-btn--block" onClick={goToIntake}>Commencer le questionnaire <ArrowRight /></button>
            <p className="modal__legal">Vos réponses préremplissent le questionnaire — rien n&apos;est envoyé sans votre accord.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="modal__eyebrow"><Sparkles style={{ width: 13, height: 13 }} /> Diagnostic offert · 15 min</span>
            <h3>Démarrez votre diagnostic</h3>
            <p className="modal__sub">Trois informations, et on lance l'évaluation ADVE de votre marque.</p>
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
                <b><FileText /> Import IA</b><small>Documents · ~3 min</small>
              </button>
            </div>
            {err && <p className="modal__err">{err}</p>}
            <button className="lf-btn lf-btn--primary lf-btn--lg lf-btn--block" type="submit">Lancer mon diagnostic <ArrowRight /></button>
            <p className="modal__legal"><Lock style={{ width: 12, height: 12, verticalAlign: "-2px" }} /> Vos données restent confidentielles et ne sont jamais partagées.</p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LandingIntakePage() {
  const [open, setOpen] = useState(false);
  const start = useCallback(() => setOpen(true), []);
  return (
    <main className="up-root lf">
      <Nav onStart={start} />
      <Hero onStart={start} />
      <Constat />
      <Steps onStart={start} />
      <Adve />
      <Temoignages />
      <Agency />
      <FinalCta onStart={start} />
      <Footer onStart={start} />
      {open && <DiagnosticModal onClose={() => setOpen(false)} />}
    </main>
  );
}
