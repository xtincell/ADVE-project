# ADR-0203 — Guidelines et lecteurs d’identité issus du même coffre

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : réception Shinkiro C2/C3
- **Depends on** : ADR-0128, ADR-0169, ADR-0198, ADR-0200
- **Supersedes** : aucune doctrine métier

## Contexte

`guidelines.get` retourne un objet à huit piliers ; son écran attend une chaîne
HTML puis cherche neuf titres sans rapport avec ces huit piliers. La marque
apparaît vide même quand son dossier contient des actifs et des documents.
Les exports réimpriment le profil entier, y compris des guidelines inférées,
sans lire le coffre. Le cockpit et les PDF possèdent chacun leur sélection
logo/palette ; la limite des quatre dernières palettes peut masquer une version
ACTIVE plus ancienne. SUPERSEDED est actuellement éligible.

Audit anti-doublon : CODE-MAP contient `brand-theme`, `guidelines-renderer`,
`brand-bible`, `ingestion-pipeline`, leurs routes et pages. Ils existent : on
les étend. Aucun modèle, router, Intent, service métier ou Neter supplémentaire.
Le Livre de marque conserve son rôle de composition des fondations ; les
Guidelines rendent l’identité conservée et donnent accès aux références.

## Décision

Sous-système Guidance ; tutelle existante ARTEMIS du renderer, cap inchangé.
La lecture est déterministe, sans production, sans écriture, sans appel IA.
Les lectures authentifiées restent sous leurs gardes actuelles ; le partage
reste une mutation gouvernée explicite, jamais déclenchée à la consultation.

- Factoriser la sélection d’identité dans le service `brand-theme` existant.
  Lire le pool éligible de la stratégie, hors remplacés/archivés/rejetés et
  actifs signalés périmés. Préférer ACTIVE puis date et identifiant stables ;
  conserver la priorité LOGO_FINAL sur LOGO_IDEA. Une limite chronologique ne
  décide plus de l’éligibilité d’un ACTIVE ancien.
- Le renderer et le cockpit utilisent ce même lecteur. ACTIVE est un état
  enregistré, jamais une preuve d’approbation. Plusieurs actifs en usage et
  les propositions restent visibles dans le reçu de lecture.
- Le contrat structuré existant reçoit l’identité et les références documentaires.
  Le frontend consomme ces propriétés ; aucun découpage heuristique du HTML,
  aucun remplissage automatique du profil, aucun score de maturité inventé.
- Réutiliser `sourceScope` et `sourceFingerprint` pour qualifier les liens
  explicites source/asset. Une source non reliée reste une référence ; son
  titre ne suffit pas à l’élire comme charte. Un reçu absent reste absent.
- La consultation d’un document réutilise le lecteur tRPC existant, chargé à
  la demande. Aucun embedding, classement, promotion ou partage implicite.
- Les exports HTML et imprimables lisent la même identité et les mêmes
  références ; les données sont échappées, les liens filtrés, et le thème
  provient du résolveur existant. Le profil inféré n’est plus réimprimé comme
  règles d’identité. Les manifests annoncent les effets réels de lecture et
  de persistance du jeton de partage.

## Conséquences

Aucune donnée SPAWT ou autre marque n’est réécrite. Les documents contradictoires
restent consultables ; leur réconciliation et l’adoption d’une charte sont des
décisions distinctes. Le raccord source → publication n’est pas clos par cette
réparation. Le lien public existant continue de rendre un état courant, pas une
édition immuable. Le PDF est un HTML imprimable, pas un binaire PDF.

Réception exigée : contre-exemples ACTIVE ancien / remplacé / autre marque,
lecture réelle du service et de la page, exports relus, erreurs et absence
honnêtes, sources révoquées non exposées, aucun appel IA ni écriture à la lecture.
