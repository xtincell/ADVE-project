# ADR-0192 — Le rang de marché s'abstient sous le seuil de sens

- **Statut** : Accepted
- **Date** : 2026-07-31
- **Portée** : `trpc/routers/footprint` (`scoreInstant`) · `app/scorer/page` · `seshat/brand-registry`
- **Gouverneur** : SESHAT — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : aucun. Métrique dérivée, 100 % déterministe.

## Contexte

Décision opérateur du 2026-07-30 : la position dans le registre est livrée **complète, avec le rang**. `getRegistryPosition` était écrit — et n'était appelé nulle part : une métrique dérivée sans consommateur est un livrable invisible (même classe que `oracle.getSection`, ADR-0187).

## Décision

`scoreInstant` rend `registryPosition` ; `/scorer` l'affiche sous la ligne de classification, en français, anglais et chinois.

**La garde est le cœur de cette ADR, pas l'affichage.** `getRegistryPosition` rend `null` — et l'écran n'affiche alors rien — dans deux cas :

1. **Aucun pays déclaré.** Un rang « mondial » mêlerait des marchés incomparables : une boulangerie de quartier et un opérateur télécom ne disputent pas le même classement. Le rang n'existe que borné à un marché.
2. **Moins de `REGISTRY_POSITION_MIN_PEERS` (10) pairs scannés.** « 2ᵉ sur 3 » n'est pas une information, c'est un accident d'échantillon.

`null` signifie **« pas de rang à annoncer »**, jamais un rang fabriqué (ADR-0046). Le registre compte 5 marques prouvées justes après la purge du même jour : la garde s'exerce donc **dès aujourd'hui**, et l'écran reste muet jusqu'à ce que le corpus mérite un classement. C'est le comportement voulu — mieux vaut un écran silencieux qu'un rang qui ment.

## Conséquences

Le rang s'activera **de lui-même** quand le corpus franchira 10 marques d'un même pays, sans redéploiement. Le chemin pour y arriver est le re-scan des marques réelles sorties du registre à la purge — inscrit au registre des dettes, exécutable dès que la passerelle d'administration est rétablie.

Le calcul est celui du rang sportif : nombre de marques **strictement** devant, +1 — deux marques à égalité partagent leur rang, jamais départagées par un critère arbitraire.
