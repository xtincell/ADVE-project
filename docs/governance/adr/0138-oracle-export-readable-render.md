# ADR-0138 — Rendu lisible de l'export Oracle (fin du dump JSON)

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : suite de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) — bloc D
- **Depends on** : ADR-0016 (auto-snapshot pre-export Oracle)
- **Supersedes** : —

## Contexte

L'audit (T15) a relevé que l'export Oracle (`export-oracle.ts`) rendait le corps de chaque section via un **`JSON.stringify(data, null, 2)` brut** — le PDF/Markdown « livrable client » affichait des accolades, guillemets et clés camelCase, pas un document présentable.

## Décision

`sectionDataToBody` rend désormais du **texte structuré lisible** (`renderValue`, récursif borné, pur) au lieu du JSON :

- **objet plat** → `Label : valeur` (clés humanisées camelCase/snake_case → sentence-case) ;
- **objet imbriqué** → sous-titre `## Label` + champs indentés ;
- **tableau** → puces `• ` (éléments objets : puce + champs indentés) ;
- **valeurs vides ignorées**, **clés internes `_*` masquées** (provenance, etc.).

Consommé à la fois par l'export Markdown et le PDF. Le PDF applique un rendu léger : titre de section en **gras**, sous-titres `## ` en gras, puces légèrement indentées. `jsPDF` inchangé par ailleurs.

## Conséquences

- Le PDF/Markdown Oracle est un document présentable (plus de dump JSON). T15 fermé.
- Rendu **déterministe, pur, testable** : `renderValue`/`sectionDataToBody` exportés + `oracle-export-render.test.ts` (7 assertions : humanisation, puces, imbrication, masquage `_`, vide honnête). Vérifié sur PG local (Motion19) : export MD 53 k chars, **0 fuite JSON**.
- 0 modèle, 0 kind, cap 7/7. Mise en page riche par-forme-de-section (tables jsPDF natives) reste possible en amélioration future si besoin ; le rendu texte structuré couvre déjà le besoin « document lisible ».
