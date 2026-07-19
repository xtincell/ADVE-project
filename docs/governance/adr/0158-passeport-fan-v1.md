# ADR-0158 — Passeport fan v1 (pull-first, manual-first)

- **Statut** : Accepted (2026-07-19)
- **Origine** : Phase B du plan d'état final **RATIFIÉ** ([ETAT-FINAL-RECHERCHE-2026.md](../ETAT-FINAL-RECHERCHE-2026.md) §3 B2 — « la relation se possède ») : passeport fan WhatsApp-first → dévotion VISIBLE pour le fan → parrainage natif → micro-missions. Première brique posée par ADR-0157 (parrainage).
- **Corrections empiriques intégrées (§8 du plan)** : les superfans sont un mécanisme de **preuve sociale et de production organique**, pas un moteur de volume ; conception **pull-first** (le fan initie, rien n'est broadcasté) ; le **lien fan-à-fan prime** sur le canal vertical marque→fan.

## Décision

Le passeport est une **page publique par token non-devinable** (pattern `shareToken`, aucun compte requis) qui rend visible ce que la mesure sait déjà — il ne crée AUCUN statut.

1. **Modèle** — additif sur `SuperfanProfile` : `passportToken @unique` (randomBytes 24 base64url), `fanCode @unique` (`FAN-XXXXXX`, alphabet dictable sans I/L/O/0/1), `passportIssuedAt`. Sur `Referral` : `referrerUserId` devient nullable + `referrerProfileId` (le parrain est un compte OU un fan). **0 nouveau modèle Prisma.**
2. **Délivrance gouvernée** — kind `SESHAT_ISSUE_FAN_PASSPORT` (requireOperator, idempotent : jamais de rotation silencieuse d'un lien déjà partagé). Le profil doit DÉJÀ exister — la naissance reste `SESHAT_REGISTER_SUPERFAN` (ADR-0126). Single-writer des champs passeport : `services/seshat/fan-passport/` (test HARD).
3. **Page publique `/passeport/[token]`** — server component, noindex, projection stricte : identités sociales publiques uniquement (handle/displayName), statut sur l'échelle (6 niveaux, libellés client), conditions ADR-0141 franchies avec libellés de preuve, prochaine étape (initiation), code parrain + partage WhatsApp, missions fan ouvertes, **cercle** des autres fans (fan-à-fan), contact WhatsApp de la marque si déclaré (`businessContext.whatsappNumber`). Jamais d'email/téléphone de tiers, jamais le déchiffrement identity-graph.
4. **Parrainage fan** — l'intake accepte les codes `FAN-XXXXXX` (en plus de `LF-`) → `Referral.referrerProfileId`. À la **conversion payée du filleul** (`approveManualSubscription` → `markReferralConverted`), le gate `RECOMMENDED` (ADR-0141) est franchi via la voie gouvernée `SESHAT_REGISTER_SUPERFAN` — la conversion EST la preuve d'advocacy vérifiée exigée (jamais du simple footprint). La récompense FCFA/statut supplémentaire reste un **geste opérateur** (file `/console/socle/parrainages`, qui affiche désormais les parrains fans).
5. **Micro-missions fan** — réutilisation de `Mission` (interdit anti-doublon) : une mission `category="FAN"` publiée sur le mur (`guildPublished=true`) apparaît sur les passeports de la marque ; candidature **pull-first par WhatsApp** (message pré-rempli avec le titre + le code passeport). Aucun nouveau modèle, aucun paiement automatique (payout momo existant, DEFERRED sans creds, gestes opérateur).
6. **Surfaces** — panneau opérateur « Passeports fan » + carte founder « Mon code de parrainage » (déféré ADR-0157 clos) dans le suivi communauté cockpit.

## Ce que le passeport ne fait PAS (v1)

- Pas d'auto-inscription fan (naissance = revue humaine, ADR-0126).
- Pas de broadcast (pull-first strict — l'économie WhatsApp facture le sortant).
- Pas d'API WhatsApp Business (contract-gated ; le rail réel = liens `wa.me` sortants du fan et de la marque).
- Pas de récompense monétaire automatique (doctrine ADR-0157 / manual-subscriptions).
- Pas d'inflation d'évidence : le passeport lit la mesure, ne l'écrit pas ; `RECOMMENDED` n'est franchi que sur conversion payée réelle.

## Déférés (tracés RESIDUAL-DEBT)

- Rituels fan-à-fan actifs (reconnaissance mutuelle au-delà du cercle affiché).
- Webhook WhatsApp entrant (pull automatisé) — contract-gated Meta.
- Récompenses mission fan payées mobile money bout-en-bout (kind dédié non-LEGACY) — à la première mission fan réelle.
