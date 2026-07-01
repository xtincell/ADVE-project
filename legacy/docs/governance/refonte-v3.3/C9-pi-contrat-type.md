# C9 — 🟡 PI des assets & contrat-type

> **Chantier C — chapitre 9.** **Trou comblé :** `CAHIER_DES_CHARGES.md` Ch.9. **Dépend de :** C1 (sortie),
> C2 (données), C5 (re-forge). **État actuel : ABSENT.** Briques : `ContractStatus` (l.415), `Contract` (l.2470),
> `BrandAsset`/`AssetVersion` (lignage), `sentinel-handlers/` (assets re-générés).

## C9.0 — Décisions (cahier Ch.9)

**Propriété par type d'artefact** : brief (plan intellectuel), asset forgé (matériel), asset **re-généré par
la Sentinel** (Ptah, marketing-patrimoine), rapport (analytique) ; **licence du signal pool** ; **clauses PI**
(cession, licence, durée, sortie) au contrat-type.

## C9.1 — Modèle Prisma (matrice de PI)

```prisma
enum ArtefactType { BRIEF FORGED_ASSET SENTINEL_REFORGED REPORT }
enum IpHolder { FOUNDER AGENCY FLEET }
model AssetIpRule {                    // matrice type × propriétaire × droits
  id String @id @default(cuid())
  artefactType ArtefactType
  holder IpHolder
  rights Json                          // {cession, licence, durée, sortie}
  @@unique([artefactType])
}
```

## C9.2 — Surface

- **Matrice PI** : `AssetIpRule` source de vérité (brief→Founder, forged→Founder, sentinel-reforged→clause
  spécifique, report→Founder ; usage opérationnel Agence tracé). Branchée sur `BrandAsset.kind`.
- **Clause Sentinel/re-forge** : les assets re-générés par `sentinel-handlers/` (Loi 4, anti-fading) suivent
  une clause dédiée (cahier §9.1) — qui possède l'asset auto-entretenu. Relier à C5 (re-forge) + C1 (sortie : patrimoine emporté).
- **Licence signal pool** : droit d'usage de l'Agence sur les patterns anonymisés (C2) — durée, étendue.
- **Contrat-type** : étend `Contract` (l.2470) avec préambule EFR (C1.5) + clauses PI + clause de sortie (C1.4.1) + données (C2).

## C9.3 — Critères d'acceptation

```
[ ] AssetIpRule : matrice type × propriétaire × droits ; brief/forged → Founder
[ ] clause Sentinel/re-forge : propriété des assets auto-régénérés définie (lien C5)
[ ] licence signal pool (C2) : droits Agence sur patterns anonymisés bornés
[ ] contrat-type : préambule EFR (C1) + PI + sortie + données ; le Founder emporte son patrimoine hash-chaîné
```

## C9.4 — Friction

- **F-C9.** Carrefour de C1 (sortie/patrimoine), C2 (données/licence pool), C5 (re-forge/Sentinel). À livrer **après** eux. ADR-0095 consolide la matrice + le contrat-type.
