Portal-selector row (icon · title · subtitle · chevron/check). Stack in a Card or Dialog for "Choisir votre portail".

```jsx
<PortalCard icon={<UserCircle />} title="Portail Client" subtitle="Accédez à vos projets et rapports"
  accent="var(--up-portal-client)" selected />
<PortalCard icon={<Users />} title="Portail Collaborateur" subtitle="Gérez vos tâches et missions"
  accent="var(--up-portal-creator)" />
<PortalCard icon={<Handshake />} title="Portail Partenaire" subtitle="Suivez vos partenariats"
  accent="var(--up-portal-agency)" />
```
