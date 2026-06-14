/* UPgraders Dashboard — main content (topbar + hero + bento) */
function Topbar({ onCampaign }) {
  const { Avatar } = window.UPgradersDesignSystem_6a9ef3;
  const I = window.UPIcons;
  return (
    <header className="topbar">
      <div className="topbar__search">
        <I.Search />
        <input placeholder="Rechercher un client, une campagne…" />
      </div>
      <div style={{ flex: 1 }} />
      <button className="iconbtn" aria-label="Aide"><I.Message /></button>
      <button className="iconbtn" aria-label="Notifications"><I.Bell /><span className="dot" /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 6 }}>
        <Avatar name="Kadiatou S." size="md" />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>Kadiatou S.</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Brand Owner</div>
        </div>
      </div>
    </header>
  );
}

function Spark({ stroke = "var(--accent)", fill = true }) {
  const pts = "0,80 40,64 80,70 120,40 160,52 200,30 240,44 280,18 320,30 360,10 400,22";
  return (
    <svg className="spark" viewBox="0 0 400 100" preserveAspectRatio="none">
      {fill && <polygon points={`0,100 ${pts} 400,100`} fill={stroke} opacity="0.12" />}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Hero({ onStart, onPerf }) {
  const { Button, AvatarGroup, LevelBadge } = window.UPgradersDesignSystem_6a9ef3;
  const I = window.UPIcons;
  return (
    <section className="hero up-grain">
      <span className="hero__weave up-texture-geo" aria-hidden="true"></span>
      <div className="hero__txt">
        <span className="up-eyebrow">Bienvenue, Kadiatou 👋</span>
        <h1>Votre marque,<br />notre mission, <span className="em">votre succès.</span></h1>
        <p>Des stratégies créatives et des contenus qui connectent votre marque à la bonne audience.</p>
        <div className="hero__cta">
          <Button variant="primary" size="lg" pill icon={<I.Plus />} onClick={onStart}>Créer une campagne</Button>
          <Button variant="secondary" size="lg" onClick={onPerf}>Voir mes performances</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
          <AvatarGroup max={4} avatars={[{ name: "Ama T." }, { name: "Kofi A." }, { name: "Bola N." }, { name: "Sira D." }, { name: "Yaw B." }]} />
          <span style={{ color: "var(--text-muted)", fontSize: 13.5, fontWeight: 600 }}>+200 entreprises nous font confiance</span>
        </div>
      </div>
      <div className="hero__art">
        <span className="hero__diamond up-texture-diamond" aria-hidden="true"></span>
        <span className="doodle" style={{ top: 6, right: 18, fontSize: 26 }}><I.Star /></span>
        <span className="doodle" style={{ bottom: 18, left: 4, fontSize: 18 }}><I.Bolt /></span>
        <span className="hero__rocket"><I.Rocket /></span>
        <div style={{ position: "absolute", bottom: -6, right: -6 }}>
          <LevelBadge level={12} tone="red" showMeta={false} size={56} icon={<I.Rocket />} />
        </div>
      </div>
    </section>
  );
}

function Dashboard({ onStart, onPerf, onAlert }) {
  const DS = window.UPgradersDesignSystem_6a9ef3;
  const { Card, StatCard, Progress, Badge, Avatar, Button, Alert, LevelBadge } = DS;
  const I = window.UPIcons;
  const [day, setDay] = React.useState(28);
  const week = [["Lun", 27], ["Mar", 28], ["Mer", 29], ["Jeu", 30], ["Ven", 31]];

  return (
    <div className="content">
      <Hero onStart={onStart} onPerf={onPerf} />

      {/* KPI row */}
      <div className="bento">
        <div className="col-3"><StatCard label="Publications" value="12" delta="+30%" trend="up" icon={<I.Image />} /></div>
        <div className="col-3"><StatCard label="Interactions" value="342" delta="+18%" trend="up" variant="accent" icon={<I.Heart />} /></div>
        <div className="col-3"><StatCard label="Nouveaux abonnés" value="87" delta="+25%" trend="up" icon={<I.Users />} /></div>
        <div className="col-3"><StatCard label="Clics sur le lien" value="64" delta="+12%" trend="up" icon={<I.Target />} /></div>
      </div>

      {/* Row: performance + objective + assistant */}
      <div className="bento">
        <div className="col-7">
          <Card padding="6">
            <div className="ch-head">
              <span className="ch-title">Performance globale</span>
              <Badge tone="success">Excellent ▲</Badge>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 40, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              +24,5%<span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500, marginLeft: 10 }}>vs 30 derniers jours</span>
            </div>
            <Spark />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
              <span>7 Mai</span><span>14 Mai</span><span>21 Mai</span><span>28 Mai</span>
            </div>
          </Card>
        </div>
        <div className="col-5" style={{ display: "flex", flexDirection: "column", gap: "var(--bento-gap)" }}>
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Prochain objectif</span><LevelBadge level={12} showMeta={false} size={40} /></div>
            <div style={{ color: "var(--accent)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22 }}>Niveau 12</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, margin: "2px 0 14px" }}>XP 850 / 1200</div>
            <Progress value={71} tone="level" />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "var(--text-secondary)", fontSize: 13 }}>
              <span style={{ color: "var(--up-gold)", display: "inline-flex" }}><I.Gift /></span> Récompense : <b style={{ color: "var(--text-primary)" }}>Campagne boostée</b>
            </div>
          </Card>
        </div>
      </div>

      {/* Row: assistant + content calendar + messages */}
      <div className="bento">
        <div className="col-4">
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Assistant personnel</span><Badge tone="success" dot>En ligne</Badge></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar name="Ama" status="online" />
              <div><div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Ama</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Votre assistante IA</div></div>
            </div>
            <div className="chat">
              <div className="bubble bubble--in">Hey Kadiatou 👋 J'ai programmé 3 posts et répondu à 5 messages aujourd'hui.</div>
              <div className="bubble bubble--out">Parfait, merci ! Et la campagne ?</div>
              <div className="bubble bubble--in">Performance à 78% 🚀 Je continue ?</div>
            </div>
          </Card>
        </div>
        <div className="col-4">
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Calendrier de contenu</span><span className="ch-link">Voir le calendrier</span></div>
            <div className="week">
              {week.map(([d, n]) => (
                <div key={n} className={"day" + (day === n ? " day--active" : "")} onClick={() => setDay(n)}>
                  <span className="d">{d}</span><span className="n">{n}</span>
                </div>
              ))}
              <div className="day"><I.Plus /></div>
            </div>
            <div className="up-img-ph" data-label="aperçu du post · 4:5" style={{ aspectRatio: "16/7", marginTop: 16 }}></div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <div className="up-img-ph" style={{ width: 44, height: 44, minHeight: 0, borderRadius: "var(--radius-sm)" }}></div>
              <div style={{ flex: 1 }}>
                <div className="t" style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Post Instagram</div>
                <div className="s muted" style={{ fontSize: 12.5 }}>Les 5 erreurs qui tuent votre visibilité</div>
              </div>
              <Badge tone="accent">10:00</Badge>
            </div>
          </Card>
        </div>
        <div className="col-4">
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Messages</span><span className="ch-link">Voir tout</span></div>
            <div className="list">
              {[["Awa Diop", "Bonjour, j'aimerais en savoir plus…", "2 min"],
                ["Mamadou K.", "Pouvez-vous m'aider à créer…", "10 min"],
                ["Sophie B.", "Merci pour votre aide 🙏", "1 h"]].map(([n, m, t]) => (
                <div className="li" key={n}>
                  <Avatar name={n} size="sm" />
                  <div className="body"><div className="t">{n}</div><div className="s">{m}</div></div>
                  <span className="meta">{t}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" block style={{ marginTop: 12 }}>Voir tous les messages</Button>
          </Card>
        </div>
      </div>

      {/* Row: alert + articles + level path */}
      <div className="bento">
        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: "var(--bento-gap)" }}>
          <Alert tone="warning" title="Campagne « Promo Ramadan »" onClose={() => {}}>A atteint 80% de son objectif.</Alert>
          <Card variant="accent" padding="6">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, lineHeight: 1.15 }}>Prêt à passer votre marque au niveau supérieur ?</div>
            <Button variant="secondary" pill style={{ marginTop: 16, background: "#fff", color: "var(--up-ink-1)" }} iconRight={<I.ArrowR />} onClick={onStart}>Commencer maintenant</Button>
          </Card>
        </div>
        <div className="col-4">
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Articles récents</span><span className="ch-link">Voir tous</span></div>
            <div className="list">
              {[["Stratégie", "5 stratégies Instagram pour booster l'engagement", "27 Mai"],
                ["Contenu", "Comment créer du contenu qui convertit", "25 Mai"],
                ["Tendances", "Les réseaux sociaux à suivre cette année", "23 Mai"]].map(([c, t, d]) => (
                <div className="li" key={t}>
                  <div className="up-img-ph" style={{ width: 44, height: 44, minHeight: 0, borderRadius: "var(--radius-sm)", flex: "none" }}></div>
                  <div className="body"><div className="s" style={{ color: "var(--accent)", fontWeight: 700 }}>{c}</div><div className="t" style={{ whiteSpace: "normal" }}>{t}</div></div>
                  <span className="meta">{d}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-4">
          <Card padding="6">
            <div className="ch-head"><span className="ch-title">Grow Your Brand</span><span className="muted" style={{ fontSize: 12 }}>Level Up System</span></div>
            <div className="list">
              {[["Niveau 4", "Dominate", <I.Trophy />, "var(--up-gold)"],
                ["Niveau 3", "Scale", <I.Target />, "var(--text-muted)"],
                ["Niveau 2", "Build", <I.Rocket />, "var(--accent)"],
                ["Niveau 1", "Start", <I.Star />, "var(--up-gold)"]].map(([lv, sub, ic, col], idx) => (
                <div className="li" key={lv} style={idx === 2 ? { background: "var(--accent-fill)", borderRadius: 12, padding: "11px 12px", borderTop: "none" } : {}}>
                  <span className="iconwrap" style={{ background: "color-mix(in srgb," + col + " 16%, transparent)", color: col }}>{ic}</span>
                  <div className="body"><div className="t">{lv}</div><div className="s">{sub}</div></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}><Progress value={65} tone="accent" label="Votre progression" showValue /></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Topbar, Dashboard, Spark, Hero });
