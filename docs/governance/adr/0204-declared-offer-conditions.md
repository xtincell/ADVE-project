# ADR-0204 — Conditions déclarées des offres dans le catalogue existant

- **Status** : Accepted
- **Date** : 2026-10-08
- **Phase** : réception Shinkiro C2/C3/C5
- **Depends on** : ADR-0171, ADR-0184, ADR-0203
- **Supersedes** : aucune doctrine métier

## Contexte

Une offre peut avoir un prix mensuel et annuel, des montants HT/TTC, des options
ou une disponibilité non encore reçue. Le scalaire `prix` ne conserve pas ces
conditions. Les anciennes chaînes sont encore en base : un lecteur les convertit
en nombre et imprime NaN ; zéro disparaît de la carte partagée. Le budget utilise
une moyenne non pondérée, ou un ticket de 10 000 si le catalogue est absent.
Le validateur compare le CAC au premier prix, même non comparable.

Audit anti-doublon : `product-catalog`, ProduitService et ProductLadderTier
existent. PricingOverride, Invoice et MissionQuote servent la facturation de
l'opérateur et des missions ; ils ne décrivent pas les offres d'une marque.
On étend le produit de V et ses lecteurs, sans moteur de facturation nouveau.
Aucun modèle, router, service, page, Intent ou Neter ajouté.

## Décision

Guidance / Mestor reste responsable de l'amendement manuel de V. Thot consomme
les références économiques ; Seshat observe, sans transformer une hypothèse en
mesure. L'offre fidèle soutient la promesse et la confiance avant publication.

- `conditionsTarifaires?`, texte déclaré, conserve montants, périodes, fiscalité,
  options et état de l'offre. Il n'est pas parsé en prix comparable. Un scalaire
  absent reste absent ; seul zéro explicite représente un accès gratuit.
- Schéma, éditeur structuré, volet Offre, carte partagée et présentation lisent
  ce même champ. Les gammes le relisent via leurs produitIds existants : pas
  de second champ tarifaire à saisir. Une référence cassée est visible ; un
  ancien prix de gamme ne la masque pas. Les chaînes historiques restent
  lisibles sans coercition.
  L'éditeur existant expose les références produit et les noms libres ; son
  quatrième rang n'est plus une limite arbitraire au schéma de deux à sept paliers.
  Le contrôle `prix` est retiré de la gamme : conserver un scalaire historique
  ne justifie pas une seconde saisie qui serait ignorée par le lecteur canonique.
  Le champ scalaire de coût conserve son type numérique dans l'éditeur.
- Le garde anti-fabrication existant exclut les conditions des cellules vides
  que l'auto-filler et Notoria proposent de compléter. L'inférence qualitative
  demeure possible. Une extraction de source et une proposition ne sont pas
  une approbation commerciale ; le gateway/provenance existant reste en place.
- Le lecteur pur du catalogue retourne une référence seulement pour des prix
  numériques tous identiques, sans conditions. Catalogue absent, hétérogène,
  mal typé ou conditionnel : pas de moyenne ni ticket de repli, CA/ROAS null.
  Le scénario scalaire reste explicitement qualifié et ne devient pas un panier
  mesuré. CAC/prix nominal ne démontre jamais rentabilité, marge ou période.

## Conséquences

Aucune donnée de marque réécrite par le déploiement ; la réconciliation des
catalogues doit passer par l'amendement gouverné et ses versions. Aucun texte
commercial privé dans le dépôt. Les identifiants déjà présents sont conservés.
Le backfill d'identifiants n'est pas encore commun à tous les writers : cette
limite historique reste à résoudre avant l'onboarding commercial, sans
réécriture SQL du catalogue de production.

Il n'existe pas ici de panier mesuré, de taux de conversion mesuré ni de contrat
monétaire multi-devise. Les benchmarks XAF de budget-allocator ne sont pas une
preuve économique locale pour une autre monnaie ou période. Cette limite reste
au registre avec son plan de reprise. Les prix déclarés ne valent pas mise en
vente, paiement opérationnel ou livraison de tous les parcours Shinkiro.

Réception : contre-exemples schéma/lecteurs/gratuit/legacy, projection absente
et catalogue non comparable, garde anti-fabrication ; recette native de la
saisie et du rendu long, propagation de la présentation, typecheck/gouvernance.

Réception bornée du 8 octobre : compilation figée et gauntlet verts ; catalogue
et gamme relus sous session locale, DOM 232 ms, 58 réponses, aucun HTTP >=400
ni exception, 20 requêtes Fetch annulées, trace non tronquée. Le titre est observé
avant 9 020 ms, borne incluant les appels d'outil, pas un premier rendu mesuré.
Deux amendements manuels, versions 1→2→3, deux archives et aucun appel IA :
conditions puis palier lié au rang cinq. L'éditeur final n'expose plus de Prix.
La présentation HTML et le PDF natif (5 pages, page d'offre rendue et relue)
conservent les périodes, la fiscalité, la réserve et le gratuit. L'export crée
un snapshot local et laisse le pilier identique. Aucune donnée de prod réécrite.
Les autres sections Oracle ne sont pas reçues par cette vérification.
