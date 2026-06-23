# Plan de durcissement des nœuds LLM + scan fonctionnel

> Doc de suivi (validé opérateur 2026-06-23). Objectif : rendre les nœuds LLM
> sûrs à l'**entrée** et à la **sortie**, puis le **prouver** par un scan qui
> exécute le système pour de vrai sur la région de test **Wakanda**.
>
> Carte des trous : `docs/governance/llm-node-audit.md` (générée par
> `npm run audit:llm`). Garde-fou régression : `npm run audit:llm:strict`.

## Principe
On sécurise la production d'abord (LOT 0→2), on valide ensuite par le bac à
sable (LOT 3→4). Les lots PROD sont étiquetés `out-of-scope` ; les lots de
harnais n'ont aucun impact production.

## Lots

| Lot | Portée | Quoi | État |
|---|---|---|---|
| **0** | PROD | **Verrou d'entrée anti-injection** : utilitaire `untrusted-content` (balisage + neutralisation des jetons de rupture, plafond de taille) + rappel sécurité dans le system prompt. Branché au chokepoint des outils (`engine.ts`), des frameworks (`artemis/index.ts`) et du wrapper structuré (`llm-structured.ts` → couvre tout nœud structuré). | 🟡 en cours (1ʳᵉ PR) |
| **1** | PROD | **Verrou de sortie + entrée sur tous les sites hors chokepoints LOT 0.** Sous-lots : **1a** points d'intake ✅ (`deduce-adve`, `boot-sequence`, `narrate-adve`, `rtis-draft`, `brief-ingest`) ; **1b** rtis-cascade/notoria/mestor-insights ✅ (entrée) ; **1c** Glory ✅ **37/37** (schémas de sortie *réels* dérivés des promptTemplate ; baseline sortie 37→0 ; **76/76 nœuds LLM/HYBRID + 28/28 frameworks à 100 %**) ; **1e** ✅ **entrée durcie sur les 28 fichiers d'appel direct restants** (quick-intake, rtis-protocols, seshat, mestor/pillar-maturity, ingestion/sources, générateurs/oracle) — `wrapUntrusted`/`sanitizeInline` + `UNTRUSTED_NOTICE` ; auditeur renforcé (verdict `FENCED`/`INTERNAL`/`RAW` par fichier) ; **37/37 fichiers à entrée durcie, 0 brut** ; gate `--strict` bloque toute nouvelle entrée brute (`rawInputFiles`). | ✅ 1a+1b+1c+1e |
| **2** | PROD | **Gate CI** : `audit:llm:strict` branché dans `ci.yml` (job *LLM node guardrails*, régression-only vs baseline — sortie **et** entrée). | ✅ |

> **État sécurité (2026-06-23)** : **toute la surface LLM est sécurisée à l'ENTRÉE ET à la SORTIE.** Entrée (anti-injection OWASP LLM01) : chokepoints (LOT 0), points d'intake (1a), services de dérivation (1b) + **tous les appels directs restants (1e) → 37/37 fichiers durcis, 0 brut** (35 `FENCED` + 2 `INTERNAL` justifiés). Sortie : **37/37 Glory tools + 76/76 nœuds + 28/28 frameworks** (1c). Le **gate CI (LOT 2)** bloque toute régression dans les deux sens. LOT 1 **clos**. Restent uniquement les harnais sandbox LOT 3/4 (validation fonctionnelle + adverse), confiés à un autre agent (zone Wakanda).
| **3** | SANDBOX | **Harnais fonctionnel Wakanda** : exécuter chaque flux structurant (stratégie, Oracle/rapport, forge, Intents clés, cascade ADVE→RTIS, scoring) et vérifier une sortie valide. Nœuds LLM **et** non-LLM. DB de test, jamais la prod. | ⬜ à venir |
| **4** | SANDBOX | **Harnais adverse** : rejoue les flux avec entrées piégées (injection, données malformées, SSRF, PII, dépassement) et vérifie que les gardes LOT 0+1 tiennent. | ⬜ après 0+1 |

## Ordre & dépendances
```
LOT 0 ──▶ LOT 1 (1a→1e) ──▶ LOT 2
                                   ╲
LOT 3 (parallélisable) ─────────────▶ LOT 4   (après 0+1)
```

## Décisions validées (2026-06-23)
- **Approche LOT 0** : balisage/neutralisation (peu invasif, couvre tout vite) ✅
- **Découpage LOT 1** : 5 sous-lots / ~5 PR ✅
- **LOT 3** parallélisable dès maintenant ✅
