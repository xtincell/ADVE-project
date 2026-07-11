---
name: nefer-vocab
description: Vocabulaire client (ADR-0123 + KB) — registre à appliquer sur toute chaîne RENDUE à un client (cockpit, intake, pricing, landing, emails, PDF, i18n) du repo La Fusée. À invoquer avant de committer toute UI ou copy client, et pour étendre le test HARD cockpit-vocabulary à une nouvelle surface.
---

# NEFER — Vocabulaire client (registre business uniquement)

**Procédure impérative. Le juge de paix est le test HARD `tests/unit/governance/cockpit-vocabulary.test.ts` : il reste dans la suite et passe sur toute nouvelle UI. AUCUNE improvisation.**

## 1 — La règle des deux registres

- **Registre interne** (code, docs gouvernance, console opérateur) : mythologie et jargon OS autorisés.
- **Registre client** (tout ce qu'un founder/prospect peut LIRE : `(cockpit)` hors `<OperatorSurface>`, `(intake)`, `/pricing`, landing, emails, PDF exports, i18n) : **business uniquement**.

## 2 — Interdits en registre client (motifs du test HARD)

| Interdit | Remplacement business |
|---|---|
| Noms mythologiques (Jehuty, Notoria, Mestor, Artemis, Seshat, Tarsis, Thot, Ptah, Imhotep, Anubis, Hunter…) | la fonction : « votre stratège », « l'assistant », « vigies automatiques », « signaux sectoriels » |
| `RTIS` / `ADVE-RTIS` dans une chaîne rendue | « stratégie », « piliers stratégiques (R, T, I, S…) », « Rapport ADVE & stratégie » |
| `ADVERTIS` / `APOGEE` | « la méthode », « votre trajectoire de marque » |
| `IntentEmission`, `hash-chain`, `gates`, `tenantScopedDb`, `Pillar Gateway`, `LOI N` | ne se dit pas au client — reformuler l'effet (« traçé », « vérifié ») |
| Réfs `ADR-\d{4}` | jamais rendues |
| « function-calling », noms de modèles LLM, providers | « analyse automatique », « génération assistée » |
| Échelle interne « Évangéliste » en surface client | **« Prescripteur »** (lexique T7) ; « échelle d'engagement » pour la ladder |

- **ADVE est l'exception vendable** : « ADVE » se dit au client, TOUJOURS glosé à la première occurrence (« ADVE — Architecture des Expériences »). Les lettres A/D/V/E/R/T/I/S en badge sont autorisées.
- Registre aéronautique (Fusée, Cockpit, décollage, orbite) : **autorisé** — c'est la marque, pas du jargon.

## 3 — Étendre le verrou CI à une nouvelle surface client (OBLIGATOIRE)

Toute nouvelle surface rendue au client entre dans le périmètre du test HARD, dans LE MÊME commit :

1. Ouvrir `tests/unit/governance/cockpit-vocabulary.test.ts`.
2. Ajouter le répertoire à `SCAN_DIRS` (ou le fichier à `EXTRA_FILES` si hors arbre scanné).
3. Lancer : `npx vitest run tests/unit/governance/cockpit-vocabulary.test.ts` — corriger les hits, ne JAMAIS les allowlister par confort.
4. Allowlist (`OPERATOR_GATED_ALLOWLIST`) : uniquement pour une surface PROUVÉE opérateur-gated (garde `<OperatorSurface>` / `requireOperator` citée en commentaire). Elle est actuellement **vide** — la garder vide est l'état sain.

## 4 — Frontière founder/opérateur (jumelle du vocabulaire)

- Surface de production/mutation → gardée `<OperatorSurface>` (écran « pris en charge par votre équipe ») — **NEVER** un clic founder → FORBIDDEN, **NEVER** un 404.
- `requireOperator: true` sur toute `governedProcedure` opérateur-only (guilde, candidatures, paiements, édition ADVE cockpit restent founder).
- Aucune URL supprimée : redirects 307/308 vers la surface héritière.

## 5 — Vérification

```bash
npx vitest run tests/unit/governance/cockpit-vocabulary.test.ts 2>&1 | tail -4
# Anti-jargon copy publique (landing/marketing) :
grep -nE "hash-chain|mestor\.emitIntent|tenantScopedDb|RLS strict|gates de qualité|Pillar Gateway|LOI 1\b|LOI 2\b|ADR-[0-9]+" \
  src/components/landing/*.tsx src/app/\(marketing\)/**/*.tsx 2>/dev/null || echo "OK"
```

## Conditions STOP

- Un terme métier n'a pas d'équivalent business tranché (ni ADR-0123, ni KB §3, ni lexique T7) → **1 question ciblée** à l'opérateur avec 2 propositions.
