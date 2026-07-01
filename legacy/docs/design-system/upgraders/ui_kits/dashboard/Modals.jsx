/* UPgraders Dashboard — modals (portal selector + level-up celebration) */
function PortalModal({ onClose }) {
  const { PortalCard, Button } = window.UPgradersDesignSystem_6a9ef3;
  const I = window.UPIcons;
  const [sel, setSel] = React.useState("client");
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <span className="modal__x" onClick={onClose}><I.X /></span>
        <h3>Choisir votre portail</h3>
        <p className="sub">Sélectionnez votre espace de travail.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PortalCard icon={<I.Users />} title="Portail Client" subtitle="Accédez à vos projets et rapports"
            accent="var(--up-portal-client)" selected={sel === "client"} onClick={() => setSel("client")} />
          <PortalCard icon={<I.Bolt />} title="Portail Collaborateur" subtitle="Gérez vos tâches et missions"
            accent="var(--up-portal-creator)" selected={sel === "collab"} onClick={() => setSel("collab")} />
          <PortalCard icon={<I.Target />} title="Portail Partenaire" subtitle="Suivez vos partenariats"
            accent="var(--up-portal-agency)" selected={sel === "partner"} onClick={() => setSel("partner")} />
        </div>
        <Button variant="primary" block size="lg" style={{ marginTop: 18 }} onClick={onClose}>Continuer</Button>
      </div>
    </div>
  );
}

function LevelUpModal({ onClose }) {
  const { Button, Progress, LevelBadge } = window.UPgradersDesignSystem_6a9ef3;
  const I = window.UPIcons;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal modal--center" onClick={(e) => e.stopPropagation()}>
        <span className="modal__x" onClick={onClose} style={{ float: "right" }}><I.X /></span>
        <div className="lvlring"><LevelBadge level={5} tone="red" showMeta={false} size={64} icon={<I.Rocket />} /></div>
        <h3>Félicitations ! 🚀</h3>
        <p className="sub">Vous avez débloqué un nouveau niveau. Votre marque grandit&nbsp;!</p>
        <div style={{ textAlign: "left", background: "var(--surface-overlay)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "var(--text-primary)" }}>Niveau 5 atteint</div>
          {["Nouvelles fonctionnalités", "Support prioritaire", "Analytics avancés"].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13.5, padding: "4px 0" }}>
              <span style={{ color: "var(--success)", display: "inline-flex" }}><I.Check /></span>{t}
            </div>
          ))}
          <div style={{ marginTop: 12 }}><Progress value={100} tone="level" /></div>
        </div>
        <Button variant="primary" block size="lg" onClick={onClose} iconRight={<I.ArrowR />}>Continuer l'aventure</Button>
      </div>
    </div>
  );
}
Object.assign(window, { PortalModal, LevelUpModal });
