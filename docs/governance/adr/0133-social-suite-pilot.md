# ADR-0133 — Suite sociale pilotable v1 : inbox, publication, statistiques, notifications (« rival Sprout »)

- **Status** : Accepted
- **Date** : 2026-07-12 (nuit)
- **Phase** : train P1→P6 validé — mandat opérateur : « Je veux les commentaires, les statistiques, les rapports de performances, je veux tout le nécessaire pour piloter, publier, planifier, etc. Y compris les notifications. Mets à jour les CGU si nécessaire. La promesse de marque est de tout faire depuis l'app. Ne fais pas mentir le produit. »
- **Depends on** : ADR-0128 (réseaux founder OAuth, amendée collecte maximale), ADR-0129/0131 (délégation + zones), ADR-0124 (spine), ADR-0025 (notification fan-out), ADR-0060 (manual-first), ADR-0123 (vocabulaire client)
- **Supersedes** : —

## Contexte

La boucle sociale était en lecture passive (audience, publications, profils — ADR-0128 amendée). Le mandat opérateur assume la doctrine « rival de Sprout Social » : l'engagement des tiers (commentaires avec identités), la publication multi-réseaux, la planification, les rapports et les notifications font partie du produit. Point d'exécution clé : **en mode développement Meta/Google, les scopes d'écriture et d'insights fonctionnent immédiatement pour les comptes testeurs** — l'App Review ne gate que l'ouverture au public. On construit donc le vrai produit maintenant, testable ce soir sur Motion19.

## Décision

1. **Scopes de pilotage canon** (`SOCIAL_SCOPES`) : meta += `pages_manage_posts`, `pages_manage_engagement`, `read_insights`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights` ; google += `yt-analytics.readonly` ; linkedin += `w_member_social`. Interdits maintenus (test) : `ads*`, messaging/DM (vague ultérieure à consentement dédié), upload vidéo YT. Connexions antérieures → `scopesOutdated` sur le hub (« Reconnecter »), jamais de casse.
2. **Inbox unifiée** : modèle `SocialInboxItem` (commentaires v1 — texte, auteur public, horodatage, statut OPEN/REPLIED/DISMISSED, réponse), service DISTINCT `anubis/social-inbox.ts` (la boucle passive `social-connect` reste sans PII de tiers — verrous test intacts). Kinds gouvernés `ANUBIS_SYNC_INBOX` (balayage FB/IG des posts récents) + `ANUBIS_REPLY_COMMENT` (réponse au nom de la marque, SCOPE_MISSING explicite sinon). Surface `/cockpit/operate/inbox` (répondre/classer), délégable zone social.
3. **Publication + planification** : kind `ANUBIS_PUBLISH_SOCIAL_POST` + service `anubis/social-publish.ts` — FB Page (texte/lien/photo), IG (image+légende, container→publish ; texte seul = refus honnête), LinkedIn membre (texte/lien, ugcPosts). X/TikTok/YouTube = UNSUPPORTED motivés. **Calendrier unique** : planifier = `BrandAction` SCHEDULED (`metadata.socialPublish.pending`) ; le cron `social-sync?mode=publish` ré-émet l'Intent à l'échéance (spine + cost-gate à chaque exécution) ; publier = action EXECUTED. Aucune 2ᵉ file. Surface `/cockpit/operate/publish` (cibles honnêtes par état de connexion).
4. **Statistiques & rapports** : `SocialPost.insights Json?` rempli par `anubis/social-insights.ts` quand le scope est porté (FB post_impressions*, IG reach/saved — jamais d'appel sans scope, jamais de zéro inventé) ; `reach` promu depuis la mesure réelle. Rapport déterministe `anubis/social-report.ts` (30/90 j : totaux, par-réseau, top posts, inbox, plateformes connectées sans donnée) sur `/cockpit/intelligence/social`.
5. **Notifications** : réutilisation du fan-out canonique ADR-0025 (`pushNotification` — in-app + push + préférences/quiet-hours) : nouvelles interactions (groupées par sync) et résultats de publication (succès ET échecs) vers porteur + délégués actifs.
6. **Promesse légale alignée** (« ne pas faire mentir le produit ») : CGU §5 « Réseaux sociaux connectés — mandat de gestion » (client responsable de traitement, UPgraders sous-traitant, révocation à tout instant) ; /privacy « interactions publiques adressées à la marque » ; /data-deletion périmètre inbox + droit des auteurs de commentaires. Cron étendu (insights + inbox quotidiens, publications dues au quart d'heure).

## Conséquences

- Motion19/opérateur (testeurs) : dès reconnexion des réseaux avec les nouveaux scopes — commentaires dans l'app, réponse en un clic, publication/planification FB+IG+LinkedIn, portée réelle par post, notifications. Les clients hors-testeurs attendent la **2ᵉ soumission App Review groupée** (publishing + engagement + insights — RESIDUAL-DEBT §ADR-0128).
- 1 modèle additif (`SocialInboxItem`) + 1 colonne (`SocialPost.insights`) — migration `20260713000000`. 3 Intent kinds ANUBIS + SLOs + zones. 0 nouveau Neter (cap 7/7), 0 bypass (2 kinds inline governedProcedure, publish aussi ré-émis par cron via emitIntent).
- Tests anti-drift : `social-suite-pilot.test.ts` (8 verrous — kinds/zones/service-distinct/honnêteté publication/calendrier-unique/légal/notifications/surfaces+i18n) + doctrine scopes mise à jour (`social-connect.test.ts`).
- Restes tracés RESIDUAL-DEBT §ADR-0128 : DM/messaging (consentement dédié), webhooks temps réel Meta (Advanced Access), YT commentaires/upload, GBP + WhatsApp (P2/P3), X payant, TikTok audit, picker vault→visuel dans le composer.
