# Plan : Recommandations RTIS granulaires (CRUD sur ADVE)

## Contexte
Les recommandations Mestor ne font que du SET (remplacement complet d'un champ). Quand Mestor recommande de modifier les personas, il écrase les 5 existants avec 5 nouveaux. Pas de granularité.

L'opérateur veut voir des opérations précises :
- "Ajouter un 6ème persona : Architecte Jeune Diplômé"
- "Modifier la justification de la valeur ACCOMPLISSEMENT"
- "Supprimer le risque 'perception old school' (résolu)"
- "Étendre le catalogue digital avec 3 actions TikTok"

## Modification

### 1. Étendre `FieldRecommendation` avec un champ `operation`

**Fichier** : `src/server/services/mestor/rtis-cascade.ts`

```typescript
export interface FieldRecommendation {
  field: string;
  operation: "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";
  // SET    — remplace le champ entier (comportement actuel)
  // ADD    — ajoute un item à un array (personas, valeurs, risques...)
  // MODIFY — modifie un item existant dans un array (par index ou id match)
  // REMOVE — supprime un item d'un array (par index ou id match)
  // EXTEND — merge un objet dans un objet existant (ajoute des clés)

  currentSummary: string;
  proposedValue: unknown;

  // Pour ADD/MODIFY/REMOVE sur des arrays :
  targetIndex?: number;       // index de l'item ciblé (pour MODIFY/REMOVE)
  targetMatch?: { key: string; value: string }; // match par champ (ex: { key: "name", value: "Architecte Senior" })

  justification: string;
  source: "R" | "T" | "R+T";
  impact: "LOW" | "MEDIUM" | "HIGH";
  accepted?: boolean;
}
```

### 2. Modifier `applyAcceptedRecommendations` pour gérer les opérations

**Fichier** : `src/server/services/mestor/rtis-cascade.ts`

```typescript
// Actuel : content[reco.field] = reco.proposedValue (SET uniquement)
// Nouveau :
switch (reco.operation) {
  case "SET":
    content[reco.field] = reco.proposedValue;
    break;
  case "ADD":
    const arr = Array.isArray(content[reco.field]) ? content[reco.field] : [];
    arr.push(reco.proposedValue);
    content[reco.field] = arr;
    break;
  case "MODIFY":
    if (Array.isArray(content[reco.field]) && reco.targetIndex !== undefined) {
      content[reco.field][reco.targetIndex] = reco.proposedValue;
    } else if (Array.isArray(content[reco.field]) && reco.targetMatch) {
      const idx = content[reco.field].findIndex(item => item[reco.targetMatch.key] === reco.targetMatch.value);
      if (idx >= 0) content[reco.field][idx] = reco.proposedValue;
    }
    break;
  case "REMOVE":
    if (Array.isArray(content[reco.field])) {
      if (reco.targetIndex !== undefined) {
        content[reco.field].splice(reco.targetIndex, 1);
      } else if (reco.targetMatch) {
        content[reco.field] = content[reco.field].filter(item => item[reco.targetMatch.key] !== reco.targetMatch.value);
      }
    }
    break;
  case "EXTEND":
    content[reco.field] = { ...(content[reco.field] ?? {}), ...(reco.proposedValue as object) };
    break;
}
```

### 3. Mettre à jour le prompt LLM pour générer des opérations granulaires

**Fichier** : `src/server/services/mestor/rtis-cascade.ts` — `RTIS_PROMPTS.ADVE_UPDATE`

Ajouter dans le system prompt :
```
Pour chaque recommandation, choisis l'operation la plus precise :
- SET : remplacer le champ entier (si la valeur actuelle est nulle ou doit etre completement refaite)
- ADD : ajouter un element a un array existant (nouveau persona, nouveau risque, nouvelle valeur)
- MODIFY : modifier un element specifique d'un array (inclure targetMatch pour identifier l'element)
- REMOVE : supprimer un element specifique d'un array (inclure targetMatch pour identifier l'element)
- EXTEND : enrichir un objet existant avec de nouvelles cles (sans ecraser les existantes)

Format JSON pour chaque recommandation :
{
  "field": "valeurs",
  "operation": "ADD",
  "proposedValue": { "value": "HEDONISME", "customName": "Plaisir", "rank": 4, "justification": "...", "costOfHolding": "..." },
  "targetMatch": null,
  "justification": "L'analyse T montre que le segment premium recherche le plaisir sensoriel...",
  "source": "T",
  "impact": "MEDIUM"
}
```

### 4. Mettre à jour l'UI du panel de recommandations

**Fichier** : `src/app/(cockpit)/cockpit/brand/rtis/page.tsx`

Chaque carte de recommandation affiche l'opération :

| Operation | Badge | Couleur | Preview |
|-----------|-------|---------|---------|
| SET | Remplacer | Rouge | Actuel → Proposé (diff complète) |
| ADD | Ajouter | Vert | "+ Nouvel élément" avec preview |
| MODIFY | Modifier | Amber | Élément ciblé → version modifiée |
| REMOVE | Supprimer | Rouge barré | Élément à supprimer (barré) |
| EXTEND | Étendre | Bleu | Clés ajoutées à l'objet |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/server/services/mestor/rtis-cascade.ts` | FieldRecommendation + operation, applyAcceptedRecommendations avec switch, prompt LLM |
| `src/app/(cockpit)/cockpit/brand/rtis/page.tsx` | Badge opération, preview adapté par type, UI REMOVE (barré) |
| `src/server/services/glory-tools/auto-complete.ts` | Compatible — actualizePillar ne change pas |

## Clé : plusieurs opérations par champ

Mestor peut proposer N opérations sur le même champ. Exemple pour `d.personas` :

```
Reco #1 [ADD]    → Persona "Architecte Junior"
Reco #2 [ADD]    → Persona "Promoteur Régional"
Reco #3 [MODIFY] → Persona "Architecte Senior" (targetMatch: name=Architecte Senior) → nouvelles motivations
Reco #4 [REMOVE] → Persona "Client Industriel" (targetMatch: name=Client Industriel) → mal ciblé
```

L'opérateur sélectionne individuellement lesquelles appliquer. L'apply les exécute **séquentiellement dans l'ordre** — les ADD avant les REMOVE pour éviter les shifts d'index.

### Ordre d'application garanti
```
1. EXTEND (enrichir objets)
2. MODIFY (modifier items existants — avant les index shifts)
3. ADD (ajouter items)
4. REMOVE (supprimer items — en dernier pour éviter les index shifts)
5. SET (remplacement complet — en dernier car il écrase tout)
```

### UI : groupement par champ

Dans le panel de recos, les opérations sont **groupées par champ** :

```
╔═ d.personas (4 operations) ═══════════════════════════╗
║ ☑ [ADD vert]    Architecte Junior                     ║
║   Justification : "Le segment junior représente..."   ║
║ ☑ [ADD vert]    Promoteur Régional                    ║
║   Justification : "L'expansion régionale nécessite..."║
║ ☐ [MODIFY amber] Architecte Senior                    ║
║   Justification : "Les motivations ont évolué..."     ║
║ ☑ [REMOVE rouge] Client Industriel ██████████         ║
║   Justification : "Ce persona ne correspond plus..."  ║
╚═══════════════════════════════════════════════════════╝
```

### acceptRecos modifié

L'input n'est plus `fields: string[]` mais `recoIndices: number[]` — les indices des recos sélectionnées dans le tableau `pendingRecos`. Ça permet de sélectionner les opérations individuellement, même quand il y en a plusieurs sur le même champ.

## Backward compat
- Recos sans `operation` → traitées comme `SET`
- `acceptRecos` avec `fields: string[]` → rétro-compat : accepte toutes les recos de ces champs
- Pas de migration DB

## Vérification
1. Générer les recos pour pilier D → voir 4 opérations sur personas (ADD×2 + MODIFY + REMOVE)
2. Sélectionner seulement les 2 ADD + le REMOVE, pas le MODIFY
3. Accepter → 2 personas ajoutés, 1 supprimé, l'existant non modifié
4. Re-générer → Mestor voit le nouvel état et propose d'autres ajustements
