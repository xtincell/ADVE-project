/* UPgraders — Marketing site sections */
const _m = (paths, fill) => (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill={fill ? "currentColor" : "none"} stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths}</svg>
);
const M = {
  Play: _m(<path d="M7 5v14l11-7z" />, true),
  ArrowR: _m(<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  Rocket: _m(<><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.9.7-2.2-.2-3a2.2 2.2 0 0 0-2.8 0Z"/><path d="M12 15 9 12a14 14 0 0 1 3-7c1.6-2.3 4-3.8 7-4 .2 3-1.3 5.4-3.6 7A14 14 0 0 1 12 15Z"/><path d="M9 12H4s.5-2.8 2-4c1.5-1.4 5-1 5-1M12 15v5s2.8-.5 4-2c1.4-1.5 1-5 1-5"/></>),
  Bolt: _m(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />, true),
  Mega: _m(<><path d="m3 11 16-6v14L3 13v-2Z"/><path d="M11.6 17.6a3 3 0 0 1-5.6-1.6V13"/></>),
  Insta: _m(<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></>),
  User: _m(<><circle cx="12" cy="8" r="4"/><path d="M5.5 21a7 7 0 0 1 13 0"/></>),
  Camera: _m(<><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></>),
  Trend: _m(<><path d="M3 17l6-6 4 4 7-8"/><path d="M21 7v5h-5"/></>),
  Star: _m(<path d="m12 2 2.9 6.26 6.84.62-5.16 4.54 1.54 6.7L12 16.9 5.88 20.6l1.54-6.7L2.26 8.88l6.84-.62Z"/>, true),
  X: _m(<path d="M18 6 6 18M6 6l12 12"/>),
  Users: _m(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></>),
  Handshake: _m(<><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a2 2 0 0 0-2.8 0l-.6.6a2 2 0 0 1-2.8 0L8.4 6.8a2 2 0 0 1 0-2.8L10.5 2"/></>),
};
const IMG = (seed, w, h) => `https://picsum.photos/seed/upg-${seed}/${w}/${h}`;
const PHOTO = (f) => `../../assets/photos/${f}`;

function Nav({ onPortal }) {
  const { Logo, Button } = window.UPgradersDesignSystem_6a9ef3;
  const links = ["Accueil", "Services", "Réalisations", "Ressources", "Tarifs"];
  return (
    <div className="nav"><div className="wrapc nav__in">
      <Logo variant="lockup-horizontal" size={28} basePath="../../assets/logos" />
      <nav className="nav__links">{links.map((l, i) => <a key={l} className={i === 0 ? "on" : ""}>{l}</a>)}</nav>
      <div style={{ flex: 1 }} />
      <Button variant="primary" pill onClick={onPortal}>Se connecter</Button>
    </div></div>
  );
}

function Hero({ onStart }) {
  const { Button, AvatarGroup } = window.UPgradersDesignSystem_6a9ef3;
  return (
    <section className="hero2"><div className="wrapc">
      <div className="hero2__grid">
        <div>
          <span className="up-eyebrow">Marketing · Branding · Digital</span>
          <h1>La Passion pour <span className="em">Propulseur</span></h1>
          <p>Nous aidons les marques et les entrepreneurs à développer leur visibilité, engager leur audience et booster leur croissance.</p>
          <div className="hero2__cta">
            <Button variant="primary" size="lg" pill iconRight={<M.ArrowR />} onClick={onStart}>Découvrir nos services</Button>
            <button className="playbtn"><span className="circ"><M.Play /></span> Voir la vidéo</button>
          </div>
          <div className="proof">
            <AvatarGroup max={4} avatars={[{ name: "Ama T." }, { name: "Kofi A." }, { name: "Bola N." }, { name: "Sira D." }, { name: "Yaw B." }]} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>+250 Clients satisfaits</div>
              <div className="stars">★★★★★ <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>4.9/5</span></div>
            </div>
          </div>
        </div>
        <div className="hero2__art up-grain">
          <span className="hero2__weave up-texture-geo" aria-hidden="true"></span>
          <span className="hero2__rocket"><M.Rocket /></span>
          <div className="float-card" style={{ top: 28, left: -12 }}>
            <span style={{ color: "var(--accent)", fontSize: 18, display: "inline-flex" }}><M.Trend /></span>
            <div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Growth</div><div style={{ fontWeight: 800, color: "var(--success)" }}>+156%</div></div>
          </div>
          <div className="float-card" style={{ bottom: 30, right: -10 }}>
            <span style={{ color: "var(--up-gold)", fontSize: 16, display: "inline-flex" }}><M.Star /></span>
            <div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Nouveau client</div><div style={{ fontWeight: 800, color: "var(--text-primary)" }}>Zola Apparel</div></div>
          </div>
        </div>
      </div>
      <div className="partners">
        {["MTN", "Orange", "Ecobank", "UBA", "Wave", "itel"].map((p) => <span key={p}>{p}</span>)}
      </div>
    </div></section>
  );
}

function Services() {
  const { Card, Button } = window.UPgradersDesignSystem_6a9ef3;
  const svc = [
    { ic: <M.Mega />, t: "Marketing Digital", d: "Stratégies sur mesure pour attirer et convertir vos clients." },
    { ic: <M.Insta />, t: "Gestion Instagram", d: "Contenu engageant, gestion et croissance de votre communauté." },
    { ic: <M.User />, t: "Assistant Personnel", d: "Support administratif et organisation pour vous faire gagner du temps." },
    { ic: <M.Camera />, t: "Photographie", d: "Capturer l'essence de votre marque avec des visuels professionnels." },
  ];
  return (
    <div data-theme="light" style={{ background: "var(--surface-page)" }}>
      <section className="section"><div className="wrapc">
        <div className="section__head">
          <span className="up-eyebrow">Ce qu'on fait</span>
          <h2>Nos <span className="em">Services</span></h2>
          <p className="lead">Des solutions complètes pour booster votre présence en ligne et atteindre vos objectifs.</p>
        </div>
        <div className="svc-grid">
          {svc.map((s) => (
            <Card key={s.t} variant="light" className="svc" interactive>
              <div className="svc__ic">{s.ic}</div>
              <h3>{s.t}</h3><p>{s.d}</p>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 32 }}><Button variant="primary" pill iconRight={<M.ArrowR />}>Voir tous les services</Button></div>
      </div></section>
    </div>
  );
}

function Work({ onStart }) {
  const { Card, Button } = window.UPgradersDesignSystem_6a9ef3;
  const items = ["Branding", "Creative hub", "Portrait", "Marque locale"];
  return (
    <section className="section"><div className="wrapc">
      <div className="section__head">
        <span className="up-eyebrow">Portfolio</span>
        <h2>Nos <span className="em">Réalisations</span></h2>
        <p className="lead">Découvrez quelques projets qui ont marqué la croissance de nos clients.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "stretch" }}>
        <div className="work-grid">
          {items.map((cap) => (
            <div className="work" key={cap}>
              <div className="up-img-ph" data-label={"photo · " + cap} style={{ position: "absolute", inset: 0, borderRadius: 0, border: "none" }}></div>
              <div className="work__cap">{cap}</div>
            </div>
          ))}
        </div>
        <Card variant="inkmax" padding="8" style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span className="up-texture-diamond" aria-hidden="true" style={{ position: "absolute", inset: "auto -10% -12% auto", width: 220, height: 220, opacity: 0.4, WebkitMaskImage: "radial-gradient(circle at 70% 70%, #000, transparent 70%)", maskImage: "radial-gradient(circle at 70% 70%, #000, transparent 70%)", pointerEvents: "none" }}></span>
          <div style={{ position: "relative", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, lineHeight: 1.15, color: "var(--text-primary)" }}>
            Prêt à faire passer votre <span style={{ color: "var(--accent)" }}>marque</span> au niveau supérieur ?
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 64, color: "var(--accent)", margin: "18px 0" }}><M.Rocket /></div>
            <Button variant="primary" block size="lg" onClick={onStart} iconRight={<M.ArrowR />}>Démarrer maintenant</Button>
          </div>
        </Card>
      </div>
    </div></section>
  );
}

function Articles() {
  const { Card, Button, Badge } = window.UPgradersDesignSystem_6a9ef3;
  const arts = [
    { c: "Partenariat", t: "Trouver le bon partenaire de croissance", m: "12 min de lecture" },
    { c: "Branding", t: "Comment créer une identité visuelle forte", m: "8 min de lecture" },
    { c: "Stratégie", t: "Collaborer pour conquérir le marché ouest-africain", m: "10 min de lecture" },
  ];
  return (
    <div data-theme="light" style={{ background: "var(--surface-page)" }}>
      <section className="section"><div className="wrapc">
        <div className="section__head">
          <span className="up-eyebrow">Le blog</span>
          <h2><span className="em">Ressources</span> & conseils</h2>
          <p className="lead">Articles, guides et conseils pour vous aider à réussir en ligne.</p>
        </div>
        <div className="art-grid">
          {arts.map((a) => (
            <Card key={a.t} variant="light" className="art" interactive>
              <div className="art__img"><div className="up-img-ph" data-on-light data-label={"photo · " + a.c} style={{ width: "100%", height: "100%", borderRadius: 0, border: "none" }}></div></div>
              <div className="art__b">
                <Badge tone="accent">{a.c}</Badge>
                <h3>{a.t}</h3>
                <div className="meta">{a.m}</div>
              </div>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 32 }}><Button variant="outline" pill iconRight={<M.ArrowR />}>Voir tous les articles</Button></div>
      </div></section>
    </div>
  );
}

function Footer({ onPortal }) {
  const { Logo, Input, Button } = window.UPgradersDesignSystem_6a9ef3;
  return (
    <footer className="footer"><div className="wrapc">
      <div className="footer__grid">
        <div>
          <Logo variant="lockup-horizontal" size={40} basePath="../../assets/logos" />
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 320, marginTop: 16, lineHeight: 1.5 }}>
            Construisons l'Afrique de demain, aujourd'hui. Douala, Cameroun · www.upgraders.pro
          </p>
        </div>
        <div>
          <h4>Newsletter</h4>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 14 }}>Recevez nos conseils chaque semaine.</p>
          <div className="news">
            <Input placeholder="Votre email" type="email" />
            <Button variant="primary">S'abonner</Button>
          </div>
        </div>
        <div>
          <h4>Suivez-nous</h4>
          <div className="social">
            <a aria-label="Instagram"><M.Insta /></a>
            <a aria-label="LinkedIn"><M.Users /></a>
            <a aria-label="Partenaire"><M.Handshake /></a>
          </div>
          <div style={{ marginTop: 18 }}>
            <Button variant="secondary" pill onClick={onPortal} iconRight={<M.ArrowR />}>Choisir votre portail</Button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 36, paddingTop: 22, color: "var(--text-muted)", fontSize: 13 }}>
        © 2026 UPgraders SARL — La Passion pour Propulseur. RC/DLA/2018/B/1381.
      </div>
    </div></footer>
  );
}

function PortalModalM({ onClose }) {
  const { PortalCard, Button } = window.UPgradersDesignSystem_6a9ef3;
  const [sel, setSel] = React.useState("client");
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <span className="modal__x" onClick={onClose}><M.X /></span>
        <h3>Choisir votre portail</h3>
        <p className="sub">Sélectionnez votre espace de travail.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PortalCard icon={<M.User />} title="Portail Client" subtitle="Accédez à vos projets et rapports" accent="var(--up-portal-client)" selected={sel === "client"} onClick={() => setSel("client")} />
          <PortalCard icon={<M.Bolt />} title="Portail Collaborateur" subtitle="Gérez vos tâches et missions" accent="var(--up-portal-creator)" selected={sel === "collab"} onClick={() => setSel("collab")} />
          <PortalCard icon={<M.Handshake />} title="Portail Partenaire" subtitle="Suivez vos partenariats" accent="var(--up-portal-agency)" selected={sel === "partner"} onClick={() => setSel("partner")} />
        </div>
        <Button variant="primary" block size="lg" style={{ marginTop: 18 }} onClick={onClose}>Continuer</Button>
      </div>
    </div>
  );
}
Object.assign(window, { MNav: Nav, MHero: Hero, MServices: Services, MWork: Work, MArticles: Articles, MFooter: Footer, PortalModalM });
