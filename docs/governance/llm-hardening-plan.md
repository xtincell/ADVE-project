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
| **1** | PROD | **Verrou de sortie** (+ entrée sur les sites qui contournent les chokepoints LOT 0). Sous-lots : **1a** points d'intake ✅ (`deduce-adve`, `boot-sequence`, `narrate-adve`, `rtis-draft`, `brief-ingest`) ; **1b** rtis-cascade/notoria/mestor-insights ; **1c** Glory concept ; **1d** Glory brand ; **1e** campaign-plan/vault-enrichment/reliquat. | 🟡 1a fait |
| **2** | PROD | **Gate CI** : brancher `audit:llm:strict` (régression-only). | ⬜ à venir |
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
