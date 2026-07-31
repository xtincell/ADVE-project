# ADR-0190 — Le collecteur lit ce qu'il télécharge déjà

- **Statut** : Accepted
- **Date** : 2026-07-31
- **Portée** : `quick-intake/web-footprint` · `quick-intake/site-structured-data` (nouveau) · `quick-intake/footprint-facts` · `pillar-maturity-contracts` · `lib/html-entities` (nouveau)
- **Gouverneur** : SESHAT (collecte publique) — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : aucun. Tout est déterministe.

## Contexte

Signalement opérateur, en réponse à une limite que j'avais énoncée moi-même (« *vos masterclass, formations et newsletter ne sont relevées par aucun collecteur* ») : **« c'est un problème. Le collecteur doit être parfait. »**

Constat de code : `parseHtmlMeta` ne retenait de chaque page que `title`, `description`, `og:image`. Le corps entier était téléchargé, servait à valider l'entité, puis était jeté.

Mesure sur quatre sites de marques réelles, depuis le runtime Node (pas `curl` — leçon ADR-0187) :

| site | JSON-LD | `sameAs` | flux | newsletter |
|---|---|---:|---|---|
| **irawotalents.com** | Organization + WebSite | **5** | ✅ | ✅ MailerLite |
| motion19.com | — | 0 | ✗ | ✅ Mailchimp |
| chococam.com | — | 0 | ✗ | ✗ |
| orange.cm | — | 0 | ✗ | ✗ |

Ce que le scan d'Irawo jetait à chaque passage, dans 326 Ko déjà en main :

```
sameAs : facebook · x · instagram · linkedin · youtube   (5)
         …la découverte par recherche n'en trouvait que 4 — YouTube manquait
flux   : /feed/ → 6 entrées datées
           13 juil. 2026 — Bâtir des entreprises performantes en Afrique
           30 mars 2026 — Irawo reçoit le prix Cartier Women's Initiative Award
           16 sept. 2025 — Irawo & LemFi s'associent
```

Le prix, le partenariat, la cadence de publication et un cinquième réseau tenaient dans le HTML déjà téléchargé plus **une** requête de flux.

## Décision

**1. On ne lit que du DÉCLARÉ STRUCTURÉ.** JSON-LD (schema.org) et flux normalisé. `extractStructuredSiteData` en rend : `sameAs`, `Event`, `Course`, types rencontrés, URL du flux, présence et fournisseur d'inscription.

**2. Aucune détection par mots-clés.** Trouver « masterclass » dans un menu de navigation n'établit pas qu'une masterclass existe. Un test le verrouille explicitement : une page truffée de « masterclass », « formations », « événements » rend `events: []` et `courses: []`. C'est la même discipline que celle qui a fait retirer la fiche Google homonyme (ADR-0188).

**3. `sameAs` fait autorité sur la découverte.** Un compte revendiqué par la marque sur son propre domaine est la preuve d'appartenance la plus forte disponible — plus forte qu'une corroboration par recherche, et elle **tranche l'homonymie**. Les `sameAs` sont donc admis d'abord ; une plateforme déjà revendiquée n'accepte plus un second exemplaire issu du même document.

> Défaut trouvé en vérifiant sur le réel : le footer d'Irawo porte `linkedin.com/company/irawotalents`, son JSON-LD `linkedin.com/company/11200805` — **même page, deux URL**, et le rapport affichait deux comptes LinkedIn. La déclaration l'emporte.

**4. La cadence est arithmétique, pas devinée.** `medianDaysBetweenPosts` est la médiane des écarts entre parutions, et vaut `null` sous deux entrées datées : une régularité ne se déduit pas d'un point unique.

**5. Trois états, jamais deux.** `undefined` = le site n'a pas été lu · `null` = lu, aucune donnée structurée · valeur = fait mesuré. Le rapport doit dire « ce site n'expose pas de données structurées », **jamais** « cette marque ne publie rien » — trois des quatre sites mesurés sont dans ce cas.

**6. Ces faits comptent.** Deux exigences `webPresence.feed` et `webPresence.structured` rejoignent le contrat E, conditionnées par `appliesWhen` et non dérivables (ADR-0189). Publier et entretenir une liste, c'est entretenir une relation — c'est de l'engagement, à sa place dans le pilier E.

**7. Les entités numériques sont décodées.** WordPress publie l'apostrophe en `&#8217;` et l'esperluette en `&#038;` : le rapport affichait « Irawo &#038; LemFi s&#8217;associent ». `decodeEntities` ne couvrait que les entités nommées ; le défaut portait **déjà** sur les retombées presse collectées. Extrait en `lib/html-entities` pour éviter un cycle d'imports.

## Conséquences

Mesuré sur Irawo, avant / après :

| | avant | après |
|---|---:|---|
| réseaux trouvés | 4 | **5** |
| doublon LinkedIn | oui | résolu |
| newsletter | non détectée | **MailerLite** |
| publications | 0 | **6 entrées datées** |
| dernière parution | — | **13 juil. 2026** |
| cadence médiane | — | 104,6 j |

**Le collecteur n'est pas « parfait » et ce serait malhonnête de le prétendre.** Trois sites sur quatre n'exposent aucune donnée structurée : pour eux, le gain se limite à la détection d'inscription. Le gisement dépend de ce que chaque site publie — ce qui est hors de notre contrôle. Ce qui est en notre contrôle, désormais fait : ne plus jeter ce qu'on a déjà.

## Recalcul des rapports déjà produits

Un correctif de calcul ne répare que les rapports à venir. `rescoreIntake` recompte le vecteur, la classification et le niveau (chemin **déterministe** : le chemin LLM ferait dériver le texte d'un rapport peut-être déjà lu) — **sans aucun appel externe ni re-collecte**. Exposé en `POST /api/admin/rescore-intakes`, guardé `CRON_SECRET`, idempotent, et rendant l'AVANT/APRÈS de chaque intake : un recalcul muet serait invérifiable, exactement le reproche fait au défaut qu'il corrige.

## Verrous

- `tests/unit/services/site-structured-data.test.ts` — formes réelles (@graph Yoast imbriqué, JSON-LD cassé, site sans structure), refus explicite de la détection par mots-clés, entités numériques.
- `tests/unit/governance/collector-speaks-the-contract-language.test.ts` étendu : ce que le collecteur découvre doit atteindre l'écran, et « site non lu » ne doit jamais se confondre avec « site sans données structurées ».
