/* UPgraders Dashboard — Sidebar */
function Sidebar({ active, onNav, onPortal, onUser }) {
  const { Logo, Badge, Avatar } = window.UPgradersDesignSystem_6a9ef3;
  const I = window.UPIcons;
  const items = [
    { key: "home", label: "Accueil", icon: <I.Home /> },
    { key: "board", label: "Tableau de bord", icon: <I.Grid /> },
    { key: "messages", label: "Messages", icon: <I.Message />, count: 6 },
    { key: "instagram", label: "Instagram", icon: <I.Instagram /> },
    { key: "calendar", label: "Calendrier", icon: <I.Calendar /> },
    { key: "content", label: "Contenus", icon: <I.Content /> },
    { key: "analytics", label: "Analytics", icon: <I.Chart /> },
    { key: "campaigns", label: "Campagnes", icon: <I.Megaphone /> },
    { key: "billing", label: "Facturation", icon: <I.Billing /> },
    { key: "settings", label: "Paramètres", icon: <I.Settings /> },
  ];
  return (
    <aside className="sb">
      <div className="sb__brand">
        <Logo variant="lockup-horizontal" size={26} basePath="../../assets/logos" />
      </div>
      <div className="sb__lbl">Portail</div>
      <button className="sb__portal" onClick={onPortal}>
        <span className="ic"><I.Bolt /></span>
        <span className="t">Brand Portal</span>
        <span className="ch"><I.ChevD /></span>
      </button>
      {items.map((it) => (
        <button
          key={it.key}
          className={"nav-item" + (active === it.key ? " nav-item--active" : "")}
          onClick={() => onNav(it.key)}
        >
          <span className="ic">{it.icon}</span>
          {it.label}
          {it.count && (
            <span className="count">
              <Badge tone={active === it.key ? "neutral" : "danger"} solid={active !== it.key}>{it.count}</Badge>
            </span>
          )}
        </button>
      ))}
      <div className="sb__spacer" />
      <div className="sb__user" onClick={onUser} role="button">
        <Avatar name="Kadiatou S." size="md" status="online" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">Kadiatou S.</div>
          <div className="rl">Entrepreneure</div>
        </div>
        <span className="ch muted"><window.UPIcons.ChevD /></span>
      </div>
    </aside>
  );
}
Object.assign(window, { Sidebar });
