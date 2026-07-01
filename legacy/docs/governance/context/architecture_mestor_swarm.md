---
name: Mestor is a hierarchical agent swarm
description: Mestor is not a single service — it's a swarm of hierarchical agents. Commandant (LLM brain) → Hyperviseur (planner) → Directeurs de Pilier (8 guards) → ARTEMIS (GLORY orchestrator) → Outils GLORY (39 atomic tools).
type: feedback
---

MESTOR est un essaim d'agents hiérarchisés, pas un service monolithique.

**Hiérarchie :**
1. **COMMANDANT** — interface humaine, seul agent LLM, prend les décisions stratégiques
2. **HYPERVISEUR** — analyse l'état, consulte les Directeurs, produit le plan d'orchestration
3. **8× DIRECTEUR DE PILIER** — chacun garde son pilier (maturity gate, writeback validation)
4. **ARTEMIS** — orchestre les outils GLORY via le Superviseur de Séquence et l'Orchestrateur d'Outils
5. **SUPERVISEUR DE SÉQUENCE** — valide prérequis, compose le livrable via variableMap
6. **ORCHESTRATEUR D'OUTILS** — exécute les outils step-by-step, résout les bindings
7. **39× OUTILS GLORY** — atomiques, outputSchema strict, CALC/COMPOSE/MESTOR_ASSIST
8. **SESHAT** — intelligence marché, knowledge management
   - **TARSIS** (outil DE Seshat) — scanner de signaux faibles marché

**Sous MESTOR aussi :**
- 4× PROTOCOLES RTIS (R, T, I, S) — agents spécialisés par pilier RTIS
- Chaque protocole est hybride (scan déterministe + MESTOR_ASSIST pour l'enrichissement)

**Why:** Alexandre a explicitement dit "Mestor est un essaim d'agents hiérarchisés". Les agents sont spécialisés, stateless, et communiquent via des interfaces typées.

**How to apply:** Tout nouveau service qui touche à l'orchestration, aux piliers, ou aux outils GLORY doit être un agent DANS l'essaim Mestor, pas un service indépendant. La hiérarchie doit être respectée : le Commandant décide, l'Hyperviseur planifie, les Directeurs gardent, ARTEMIS exécute.
