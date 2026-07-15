# ADR-0153 — Historique mesuré (footprint) → épreuves d'attention & croissance

- **Statut** : Accepted
- **Date** : 2026-07-15
- **Gouverneur** : Seshat (scoreur, ADR-0149)
- **Cap APOGEE** : 7/7 — 0 LLM, 0 nouveau modèle Prisma

## Contexte

La force révélée /200 (ADR-0149) ne comptait que des épreuves observées. Une
marque fraîchement onboardée sortait donc au plancher (~19.6, couverture 20 %,
seule l'arène E jouant en défaite), **quel que soit son historique réel** — deux
marques démarraient au même niveau. Or `FollowerSnapshot` (horodaté, collecté
quotidiennement, ADR-0128/0133) est un **historique mesuré** jamais lu par le
scoreur : la donnée existait, elle n'était pas convertie.

## Décision

Convertir le footprint mesuré en épreuves, **déterministe, sans fabrication**
(pas de relevé ⇒ pas d'épreuve, P22-2) :

- **Arène A (attention)** : audience cumulée (dernier count par plateforme,
  tous réseaux) vs **plancher d'audience de la ligue** (`EVIDENCE_TARGETS_BY_SCALE
  .audienceFloor`, ~50× la cible superfans, canon PROPOSÉ ratifiable). WIN si
  au-dessus, LOSS sinon. `proofWeight` : `fort` si audience maintenue ≥ 60 j,
  `moyen` si multi-plateforme, `item` sinon.
- **Arène V (croissance)** : dès **≥ 2 relevés espacés ≥ 30 j**, compare le total
  du premier jour à celui du dernier. WIN si maintenu/en hausse, LOSS si en
  déclin. `proofWeight` `fort` ≥ 90 j, sinon `moyen`. C'est le tracking **dans le
  temps** : l'arène s'allume à mesure que le cron quotidien accumule des relevés.

Distinction doctrinale clé : **audience = attention (A), pas dévotion (E)**. Un
follower n'est pas un superfan ; l'arène E reste réservée aux personnes
identifiées et dédupliquées (Identity Graph). Ce n'est pas créditer un *attribut
déclaré* mais une *preuve observée répétée* (mesure horodatée) — cohérent avec
l'arène E existante (masse superfan vs plancher).

Deux items opponents Rasch ajoutés : `item-a-audience-floor`, `item-v-growth`
(θ par défaut d'échelle, comme `item-e-mass-floor`). **Aucun must-have item
ajouté** → le gating de palier est inchangé.

## Conséquences

- Vérifié E2E : Motion19 passe de 19.6/200 · 20 % → **39/200 · 40 %** (arène A
  mesurée à partir de son footprint réel FB 4 252 · IG 1 753 · TikTok 1 308 =
  7 313, LOSS vs plancher NATION 50 000 — honnête : audience modeste pour une
  échelle nationale). Une marque à forte audience gagnerait A ; l'arène V
  s'allumera dès qu'il y aura 2 relevés espacés.
- L'historique **compte** désormais sur le leaderboard, sans rien inventer : la
  donnée est déjà là, horodatée. Absence de relevé ⇒ arène A/V absente (0), pas
  une défaite fabriquée.
- Distinct du footprint /100 anonyme (`/scorer`, ADR-0151, éphémère) : ici c'est
  le `FollowerSnapshot` **persisté par-client** (télémétrie réelle de la marque).

## Déféré (RESIDUAL-DEBT)

- **Planchers d'audience** = canon PROPOSÉ ; à ratifier / rendre éditables
  (pattern ADR-0150) par marché.
- **Arène D (désirabilité)** depuis les avis/notes mesurés (reviews) — même
  patron, quand la donnée reviews sera persistée par-marque dans le temps.
- Reconstruction d'historique documenté pour les marques iconiques (anchors) —
  cf. discussion Apple/Coca : relève des **ancres** (θ fixé déclaré), pas du
  scoring d'un sujet.
