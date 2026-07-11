---
name: nefer-postmerge
description: Phase 9 NEFER — audit de cohérence post-merge sur le repo La Fusée. À invoquer après CHAQUE merge sur main (le sien ou celui d'un autre), et quand l'opérateur demande « le X est à jour ? ». Rescanne version unique, compteurs canoniques, états de transition et anti-jargon ; fixe tout drift trouvé avant de clore la session.
---

# NEFER Phase 9 — Audit de cohérence post-merge

**Procédure impérative. NEFER ne dit JAMAIS « tout est mergé » sans avoir exécuté ce rescan complet. Une seule dimension divergente = session non terminée. AUCUNE improvisation.**

## 9.1 — Pull + log audit

```bash
git fetch origin main
git pull origin main --ff-only 2>/dev/null || git log --oneline origin/main..HEAD
git log --oneline -10
```

## 9.2 — Version unique de l'app

```bash
grep -m 1 "^## v" CHANGELOG.md
grep '"version"' package.json | head -1
sed -n '1,15p' package-lock.json | grep '"version"'
head -1 README.md
grep -E "v[0-9]+\.[0-9]+" src/components/landing/marketing-nav.tsx | head -1
grep -E "v[0-9]+\.[0-9]+\.[0-9]+" src/components/landing/marketing-footer.tsx | head -1
```

→ Divergence = drift, fix immédiat.

## 9.3 — Compteurs canoniques (vérité-registre vs prose)

```bash
# Vérité-registre (source de vérité vivante)
npx tsx -e "
import { INTENT_KINDS } from './src/server/governance/intent-kinds';
import { CORE_GLORY_TOOLS, EXTENDED_GLORY_TOOLS } from './src/server/services/artemis/tools/registry';
import { ALL_SEQUENCES } from './src/server/services/artemis/tools/sequences';
import { FRAMEWORKS } from './src/server/services/artemis/frameworks';
console.log('intent kinds:', INTENT_KINDS.length);
console.log('glory:', CORE_GLORY_TOOLS.length, 'CORE /', EXTENDED_GLORY_TOOLS.length, 'registry');
console.log('sequences:', ALL_SEQUENCES.length, '(DRAFT:', ALL_SEQUENCES.filter(s => s.lifecycle === 'DRAFT').length + ')');
console.log('frameworks:', FRAMEWORKS.length);
"
ls src/server/trpc/routers/*.ts | wc -l
find src/server/services -mindepth 1 -maxdepth 1 -type d | wc -l
ls docs/governance/adr/*.md | wc -l

# Prose narrative à confronter
grep -rnE "[0-9]+\+? (Glory|outils GLORY|Intent kinds|services|routers|ADRs|Neteru|séquences|frameworks)" \
  README.md CLAUDE.md \
  docs/governance/NEFER.md docs/governance/PANTHEON.md docs/governance/LEXICON.md \
  docs/governance/APOGEE.md docs/governance/SERVICE-MAP.md docs/governance/ROUTER-MAP.md \
  docs/governance/MISSION.md docs/governance/DESIGN-SYSTEM.md docs/governance/STATE_FINAL_BLUEPRINT.md \
  src/components/landing/*.tsx 2>/dev/null | head -30
```

→ Tout mismatch registre ↔ prose = drift à fixer (avec date de recompte, cf. `nefer-docs` §6.4).

## 9.4 — États de transition (aucune mention résiduelle d'un canon périmé)

```bash
grep -rnE "[0-9]+ Neteru actifs|pré-réservé.*(Imhotep|Anubis)|📋 à créer|à amender|planned|PLANNED" \
  CLAUDE.md README.md docs/governance/*.md 2>/dev/null \
  | grep -v "/archive/" | grep -v "adr/00" | head -20
```

→ Chaque hit restant est SOIT historique explicite (ADR antérieur, changelog), SOIT canon courant exact. Tout le reste = drift.

## 9.5 — Anti-jargon dans la copy publique

```bash
grep -nE "hash-chain|mestor\.emitIntent|tenantScopedDb|RLS strict|gates de qualité|Pillar Gateway|LOI 1\b|LOI 2\b|ADR-[0-9]+" \
  src/components/landing/*.tsx src/app/\(marketing\)/**/*.tsx 2>/dev/null || echo "OK"
npx vitest run tests/unit/governance/cockpit-vocabulary.test.ts 2>&1 | tail -3
```

## 9.6 — Si drift détecté (règles de fix)

1. Commit fix-only (`chore(version)` / `docs(governance)` / `fix(ui)`) — **NEVER** mélangé à une feature.
2. Lane : celle du contexte (cf. `nefer-ship` §7.3) — trivial (1-3 fichiers, chiffres) → direct ; > 3 fichiers ou structurel → PR séparée.
3. CHANGELOG seulement si substantiel.
4. Message : mentionner « drift post-merge PR #N ».

## 9.7 — Critères de sortie (TOUS requis)

- [ ] Zéro mismatch vérité-registre ↔ prose narrative
- [ ] Zéro mention résiduelle d'état canonique périmé
- [ ] Zéro jargon eng dans la copy publique
- [ ] `git status` clean

## Conditions STOP

- Le drift trouvé révèle une divergence DOCTRINALE (deux canons contradictoires, pas un simple chiffre) → ne pas trancher seul si la doctrine n'écrit rien : **1 question ciblée** avec les deux candidats et une recommandation.
