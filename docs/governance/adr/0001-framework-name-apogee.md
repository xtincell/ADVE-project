# ADR-0001 — Le framework s'appelle APOGEE

**Date** : 2026-04-29
**Statut** : accepted
**Phase de refonte** : phase/0

## Contexte

La Fusée a été développée jusqu'en V5.4 sans nom explicite pour son framework interne. Les Neteru (Mestor, Artemis, Seshat, Thot, Tarsis) étaient nommés ; les conventions architecturales (manifests, layering, governedProcedure) étaient codifiées ; mais le **système de valeurs** qui faisait tenir l'ensemble n'avait pas de nom propre.

Cette absence créait trois problèmes :

1. **Identité diluée** — un dev/agent qui modifie le repo n'a pas de point d'ancrage philosophique. "Le framework de La Fusée" est descriptif, pas signifiant.
2. **Croissance non orientée** — sans nom, pas de direction claire pour ce que le framework refuse ou accepte. Chaque ajout est jugé au cas par cas.
3. **Couplage outils ↔ framework opaque** — les outils (Oracle, Glory tools, Devotion Ladder, ADVERTIS, etc.) flottent sans être explicitement reliés à une mécanique unifiée.

Une première proposition (MAAT, déesse égyptienne du principe de balance/justice) a été poussée le 2026-04-29 puis remise en question par le tech lead pour deux raisons :
- La cosmologie égyptienne est culturellement adjacente au marché cible (Afrique francophone créative — Cameroun, Côte d'Ivoire, Sénégal, Nigéria) mais pas centrale.
- La vibe "balance/justice/ordre" de MAAT correspond à de la gouvernance, pas à l'action produit (transformation de marques en cultes via accumulation/propulsion).

Le tech lead a explicitement constaté que les principes proposés pour MAAT (no silent action, causality, pre-conditions, modularity, ritual, refusal) étaient **techniques généralistes** — applicables à n'importe quel système gouverné — et ne reflétaient pas la spécificité de La Fusée.

## Décision

Le framework s'appelle **APOGEE**.

Le nom est un point physique (l'apogée d'une trajectoire orbitale), pas une déité. Il dénote la **cible** d'une mission — propulser une brand de l'état CRITICAL au sol jusqu'à l'état LEGENDARY (cult formé, fenêtre d'Overton déplacée, superfans en orbite stable).

La métaphore propulsion/trajectoire est **déjà inscrite dans le vocabulaire produit** :
- Le produit s'appelle **La Fusée** (rocket).
- Le portail founder s'appelle **Cockpit** (rocket cockpit).
- Les opérateurs sont **UPgraders** (élèvent les marques en altitude).
- La cascade ADVERTIS est **multi-étages** (booster ADVE → mid-stage RT → upper stage IS).
- Les états de score (CRITICAL → LEGENDARY) suggèrent des paliers d'altitude/orbite.

APOGEE ne fait que nommer ce qui était implicite, et donner au framework une **identité native** plutôt qu'importée.

L'architecture qui en découle :
- **Trois Lois de la Trajectoire** (conservation altitude, séquencement étages, conservation carburant) — remplacent les 6 principes MAAT
- **Quatre Sous-systèmes** (Propulsion, Guidance, Telemetry, Sustainment)
- **Trois Ponts** (Mission Control / Cockpit / Crew Quarters)
- **Une Tour de Lancement** (Intake public)

Détails complets dans [APOGEE.md](../APOGEE.md).

## Conséquences

**Positives** :

- Tous les outils existants se goupillent dans la mécanique APOGEE sans contorsion (cf. tableau §7 de APOGEE.md). Le framework hérite de la cohérence narrative du produit.
- Le founder dans Cockpit comprend instinctivement qu'il pilote — pas qu'il "consomme un service". Active leur transformation en superfan #1.
- Le dev qui ajoute une capability se demande "dans quel sous-système ça vit ?" — Propulsion / Guidance / Telemetry / Sustainment sont 4 cases mutuellement exclusives et exhaustives. Pas de "service utilitaire" flottant.
- Les Lois de la Trajectoire sont *spécifiques* à La Fusée : un OS bancaire ne respecterait pas la Loi 1 au sens "altitude cumulée d'une brand". Test passé.
- Le nom est une projection : APOGEE = ce que le système sert à atteindre. Tournage vers le futur.

**Négatives** :

- Documentation MAAT.md (417 lignes, commit `fa4ca9d`) devient obsolète. Conservée pour traçabilité avec en-tête de dépréciation.
- Toute mention de "MAAT" dans CLAUDE.md, REFONTE-PLAN.md et autres docs doit être migrée vers "APOGEE". Coût ~30 min de refactoring docs.
- Les 6 principes MAAT formellement remplacés par les 3 Lois APOGEE — différence non triviale, mais aucun code n'avait encore été écrit contre les principes MAAT, donc pas de régression code.

**À surveiller** :

- Risque de dérive vers une métaphore *trop* littérale (parler de "carburant" au lieu de "budget" peut friser le ridicule en pitch CFO). Garder la métaphore comme **substrat narratif**, pas comme jargon imposé en interface client. La langue du framework est interne ; la langue du client reste pragmatique.
- Le pluriel "Trois Lois" peut grossir avec le temps si l'équipe en ajoute. Plafond conseillé : 5 Lois max. Au-delà, refactor.

## Alternatives considérées

### Alternative 1 — MAAT (déesse égyptienne)

**Pourquoi écartée** :
- Continuité de cosmologie (les Neteru sont déjà égyptiens) MAIS la cosmologie égyptienne est elle-même un choix antérieur qui n'avait pas été interrogé.
- Vibe gouvernance/balance ≠ vibe produit (transformation/propulsion/intensité culte).
- Égypte = Afrique du Nord, distance culturelle de 5000 km du marché créatif francophone visé.
- Principes proposés trop génériques (transposables à un OS bancaire).

### Alternative 2 — GRIOT (gardien de la mémoire ouest-africaine)

**Pourquoi écartée** :
- Ancrage culturel ouest-africain pertinent.
- Métaphore narration/transmission cohérente avec hash-chain audit + Oracle Time Travel.
- **Mais** : tournage vers le passé (le griot conserve, transmet). La Fusée pousse les marques *vers le futur* (apogée). Mismatch de tension narrative.
- Risque de positionner l'OS comme un musée ou un archivage, là où le métier est l'ascension.

### Alternative 3 — STAGE / THRUST / CORE STAGE (mécanique pure)

**Pourquoi écartée** :
- Coller littéralement à la mécanique de fusée (étages multiples, poussée).
- **Mais** : flat, descriptif, sans valeur projetée. STAGE dit "ce que tu es" (multi-étages), pas "ce que tu cherches" (apogée).
- Manque la dimension téléologique : où va la fusée ? STAGE ne le dit pas. APOGEE le dit.

### Alternative 4 — APOGEE (point culminant de trajectoire)

**Pourquoi retenue** :
- Cohérent avec le nom du produit (La Fusée) et le vocabulaire existant (Cockpit, UPgraders).
- Dit *où va le système* — vers l'apogée = état LEGENDARY = culte formé.
- Tous les outils existants (cascade, Oracle, Glory tools, score, devotion ladder, Overton, superfans, Neteru) se goupillent sans contorsion dans la mécanique propulsion/guidance/telemetry/sustainment.
- Métaphore *active* (ascension) plutôt que *statique* (balance) ou *passé* (mémoire).
- Lois de la trajectoire spécifiques au métier (un OS bancaire ne pousse pas vers une apogée orbitale).
- Acronyme dérivable possible si besoin corporate, mais le sens premier est physique.

## Lectures

- [APOGEE.md](../APOGEE.md) — le framework lui-même
- [MAAT.md](../MAAT.md) — version dépréciée pour traçabilité
- [FRAMEWORK.md](../FRAMEWORK.md) — les 5 piliers techniques
- [REFONTE-PLAN.md](../REFONTE-PLAN.md) — comment on arrive à cet état
