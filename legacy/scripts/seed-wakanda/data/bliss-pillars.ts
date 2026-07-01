/**
 * BLISS by Wakanda — Pillar Content Data (A + D)
 * Score: 25/25 per pillar = ICONE 200/200
 */

// ── Pilier A — Authenticite (Identite) ────────────────────────────────────────
// Schema: PillarASchema (pillar-schemas.ts)
// Enums: ARCHETYPES, SCHWARTZ_VALUES, DEVOTION_LEVELS

export const blissPillarA = {
  // Identite — archetype must be from ARCHETYPES enum
  archetype: "MAGICIEN" as const,
  archetypeSecondary: "AMOUREUX" as const,
  citationFondatrice:
    "\"La beaute africaine n'a jamais eu besoin d'etre decouverte — elle a besoin d'etre liberee.\" — Amara Udaku, fondatrice BLISS by Wakanda, 2019. Le vibranium n'est pas un ingredient. C'est une philosophie.",
  noyauIdentitaire:
    "BLISS est ne d'un refus : celui d'accepter que la beaute africaine doive se conformer a des standards importes. Amara Udaku, heritiere directe des formulatrices royales du Wakanda, a grandi entre les laboratoires secrets de Birnin Zana et les rituels ancestraux de soin de la peau transmis de mere en fille depuis 14 generations. BLISS n'est pas une marque de cosmetiques — c'est un acte de souverainete. Chaque formule fusionne la science vibranium (nano-particules stabilisees a basse frequence) avec les recettes botaniques panafricaines pour creer une skincare qui n'imite personne. La peau africaine n'a pas besoin d'etre corrigee — elle a besoin d'etre revelee.",

  // Hero's Journey — HeroJourneyActSchema: { actNumber, title, narrative (100+ chars), emotionalArc, causalLink? }
  herosJourney: [
    {
      actNumber: 1 as const,
      title: "Les Racines — Le Jardin Secret de Birnin Zana",
      narrative:
        "Amara grandit dans le quartier royal de Birnin Zana, entouree de femmes qui fabriquent des onguents a base de plantes et de vibranium micronise. Sa grand-mere, Nana Adaeze, maitrise 47 formules ancestrales transmises oralement. A 14 ans, Amara guerit une cicatrice profonde sur son propre visage avec un baume au karite noir et vibranium — le moment ou elle comprend que ce savoir n'est pas de la tradition, c'est de la science avancee que le monde ignore.",
      emotionalArc: "Emerveillement → Revelation → Conviction precoce",
    },
    {
      actNumber: 2 as const,
      title: "L'Exil Formateur — Paris, Londres, Lagos",
      narrative:
        "Amara etudie la cosmetologie a Paris puis la biochimie a Londres. Elle decouvre que l'industrie mondiale de la beaute traite les peaux noires comme un segment secondaire — les formules sont des adaptations paresseuses de produits concus pour d'autres. A Lagos, elle rencontre des femmes qui depensent des fortunes en produits importes qui ne fonctionnent pas sur leur peau. La colere se transforme en mission : creer une skincare de luxe nee en Afrique, par l'Afrique, pour le monde.",
      emotionalArc: "Frustration → Colere → Determination",
      causalLink:
        "L'experience directe du mepris de l'industrie envers les peaux africaines transforme une heritiere en revolutionnaire",
    },
    {
      actNumber: 3 as const,
      title: "Le Laboratoire Clandestin — Retour au Wakanda",
      narrative:
        "Amara revient au Wakanda avec un double diplome et une rage froide. Elle installe un laboratoire dans l'ancien atelier de sa grand-mere et commence a stabiliser le vibranium en micro-emulsions compatibles avec les formulations cosmetiques. 18 mois de recherche. 200+ formulations testees. 3 echecs majeurs (instabilite moleculaire, reactions cutanees, cout prohibitif). Le Serum Vibranium Glow — la premiere formule stable — nait a 3h du matin un jeudi de septembre 2021.",
      emotionalArc: "Obsession → Echec → Perseverance → Euphorie controlee",
      causalLink:
        "La maitrise technique du vibranium cosmetique cree une barriere d'entree que personne ne peut repliquer sans le savoir ancestral wakandais",
    },
    {
      actNumber: 4 as const,
      title: "Le Bouche-a-Oreille Royal — Les 100 Premieres",
      narrative:
        "Amara offre le Serum a 100 femmes triees sur le volet — diplomates, artistes, entrepreneures panafricaines. En 6 semaines, les resultats sont visibles et les photos circulent sur WhatsApp entre Lagos, Nairobi, Dakar et Johannesburg. Aucune publicite. Zero influenceur. Le produit parle. Les commandes arrivent par DM Instagram avant meme que le site soit en ligne. Le Coffret Decouverte est cree pour repondre a la demande — pas comme strategie marketing, mais comme reponse d'urgence.",
      emotionalArc: "Anticipation → Validation → Acceleration organique",
      causalLink:
        "La preuve sociale par les resultats concrets cree une demande organique qui precede l'offre — le luxe authentique n'a pas besoin de publicite",
    },
    {
      actNumber: 5 as const,
      title: "Le Mouvement — De Marque a Souverainete",
      narrative:
        "BLISS ne se contente plus de vendre des produits — elle incarne un mouvement. L'ouverture du flagship Birnin Zana (premier concept store beaute vibranium au monde), le lancement de la BLISS Academy (formation de 50 formulatrices panafricaines par an), et la creation du Fonds Heritage Cosmetique (preservation des recettes ancestrales en voie de disparition). L'objectif 2027 : 12 pays africains, 200 formulatrices formees, et le premier standard de beaute ne en Afrique reconnu mondialement.",
      emotionalArc: "Ambition mesuree → Vision panafricaine → Heritage vivant",
      causalLink:
        "Le succes commercial finance la mission civilisationnelle — chaque flacon vendu finance la preservation du savoir ancestral",
    },
  ],

  // Ikigai — BrandIkigaiSchema: { love, competence, worldNeed, remuneration } (each 50+ chars)
  ikigai: {
    love: "BLISS aime reveler la beaute intrinseque de chaque peau africaine — pas la corriger, pas l'eclaircir, pas la conformer. Chaque formule est un acte d'amour envers un heritage cosmetique de 14 generations. La passion n'est pas le skincare — c'est la souverainete esthetique.",
    competence:
      "BLISS excelle dans la fusion impossible : la science vibranium (nano-particules a basse frequence) avec la botanique ancestrale panafricaine (karite noir, baobab fermente, moringa concentre). 18 mois de R&D, 200+ formulations, un processus de stabilisation que personne d'autre ne maitrise. La barriere d'entree n'est pas le capital — c'est le savoir.",
    worldNeed:
      "L'Afrique represente 17% de la population mondiale mais moins de 3% du marche mondial de la beaute de luxe. Les peaux noires et metisses sont traitees comme un afterthought par les grands groupes. 78% des femmes africaines urbaines declarent ne pas trouver de produits de luxe concus pour elles. BLISS comble un vide civilisationnel, pas un gap de marche.",
    remuneration:
      "Gamme premium (12 000 – 28 000 XAF) avec marges brutes 72-80% grace a l'approvisionnement direct en ingredients (chaine courte Wakanda-continent). Modele DTC dominant (e-commerce 60% + flagship 25% + wholesale select 15%). BLISS App freemium (diagnostic gratuit, abonnement premium 5 000 XAF/mois pour routines personnalisees). ARR cible Y3 : 850M XAF.",
  },

  // Valeurs Schwartz — BrandValueSchema: { value: SCHWARTZ_VALUES, customName, rank, justification (50+), costOfHolding (30+), tensionWith? }
  valeurs: [
    {
      value: "UNIVERSALISME" as const,
      customName: "Heritage Universel",
      rank: 1,
      justification:
        "BLISS croit que la beaute africaine est un patrimoine universel, pas une niche exotique. Chaque formule est concue pour celebrer la diversite des peaux melaninees (du Sahel au Cap, de l'Afrique de l'Ouest a l'Afrique de l'Est). Le vibranium ne discrimine pas — il revele. Cette valeur est le socle sur lequel tout le reste est construit.",
      costOfHolding:
        "Refuser de cibler un seul phototype oblige a des formulations plus complexes et couteuses. La R&D est 3x plus chere qu'une marque mono-segment. Chaque nouveau marche exige une adaptation botanico-culturelle.",
      tensionWith: ["POUVOIR" as const],
    },
    {
      value: "TRADITION" as const,
      customName: "Science Ancestrale",
      rank: 2,
      justification:
        "Les 47 formules de Nana Adaeze ne sont pas du folklore — ce sont des protocoles biochimiques valides par des siecles d'observation empirique. BLISS les documente, les stabilise et les modernise sans les trahir. La BLISS Academy forme la prochaine generation de formulatrices pour que ce savoir ne meure jamais. Chaque produit contient au moins un ingredient issu d'une recette ancestrale documentee.",
      costOfHolding:
        "Le respect des formules ancestrales limite l'innovation pure. Certains ingredients traditionnels sont rares et non-scalables industriellement. Le temps de documentation et de validation est incompatible avec les cycles fast-beauty.",
      tensionWith: ["STIMULATION" as const],
    },
    {
      value: "ACCOMPLISSEMENT" as const,
      customName: "Excellence Sans Compromis",
      rank: 3,
      justification:
        "BLISS ne fait pas du 'assez bien pour l'Afrique' — chaque produit rivalise avec les meilleurs serums de La Prairie ou Augustinus Bader en termes de formulation, packaging et resultats. Le standard n'est pas le marche africain — c'est le marche mondial. L'excellence est la reponse a des decennies de sous-estimation. Quand on ouvre un flacon BLISS, on doit sentir que c'est du luxe veritable, pas du luxe 'emergent'.",
      costOfHolding:
        "Les couts de production sont 40% plus eleves qu'une marque premium classique. Le packaging eco-luxe et les ingredients vibranium stabilises creent une pression constante sur les marges.",
      tensionWith: ["BIENVEILLANCE" as const],
    },
    {
      value: "AUTONOMIE" as const,
      customName: "Souverainete Esthetique",
      rank: 4,
      justification:
        "BLISS refuse toute dependance aux canons de beaute occidentaux. La marque definit ses propres standards — pas de blanchiment, pas d'eclaircissement, pas d'excuses. La souverainete esthetique signifie que la peau africaine est la reference, pas l'exception. Les campagnes BLISS ne montrent jamais un 'avant/apres' qui suggere que la peau naturelle est un probleme a resoudre.",
      costOfHolding:
        "Le refus des codes beaute dominants complique la penetration des marches ou ces codes sont la norme. Les distributeurs internationaux demandent des visuels 'universels' que BLISS refuse systematiquement.",
      tensionWith: ["CONFORMITE" as const],
    },
  ],

  // Hierarchie — CommunityLevelSchema: { level: DEVOTION_LEVELS, description (30+), privileges (30+), entryCriteria? }
  hierarchieCommunautaire: [
    {
      level: "SPECTATEUR" as const,
      description:
        "Curieuse — Decouvre BLISS via les reseaux sociaux ou le bouche-a-oreille. Suit le compte Instagram, regarde les tutoriels, lit les temoignages. N'a pas encore achete mais est intriguee par la promesse vibranium.",
      privileges:
        "Acces au contenu educatif gratuit (blog, tutoriels video, guide des ingredients). Diagnostic de peau gratuit via la BLISS App. Newsletter hebdomadaire avec conseils skincare personnalises.",
      entryCriteria: "Follow Instagram ou telechargement BLISS App",
    },
    {
      level: "INTERESSE" as const,
      description:
        "Initiee — A fait son premier achat (generalement le Coffret Decouverte a 12 000 XAF). Teste les produits et commence a comprendre la difference vibranium. Partage ses premieres impressions en stories.",
      privileges:
        "Acces aux tutoriels avances. Invitation aux evenements virtuels mensuels 'Les Secrets de Nana Adaeze'. Remise de bienvenue 15% sur la deuxieme commande.",
      entryCriteria: "Premier achat confirme + compte BLISS App actif",
    },
    {
      level: "PARTICIPANT" as const,
      description:
        "Adepte — Utilise BLISS quotidiennement depuis 3+ mois. A essaye au moins 3 produits differents. Commence a recommander activement a son entourage. Comprend les rituels et les associe a son identite.",
      privileges:
        "Acces prioritaire aux lancements. Programme de parrainage actif (offrir un mini-serum a une amie). Invitation aux ateliers en boutique. Badge 'Adepte' sur la BLISS App.",
      entryCriteria: "3+ commandes sur 3 mois + 3 produits differents achetes",
    },
    {
      level: "ENGAGE" as const,
      description:
        "Devouee — BLISS est devenu son rituel non-negociable. Achete la gamme complete. Cree du contenu UGC spontanement. Participe aux evenements physiques. Evangelise sans qu'on le lui demande.",
      privileges:
        "Acces VIP aux lancements exclusifs. Invitation au Cercle BLISS (diner annuel avec Amara). Produits en avant-premiere 30 jours avant le public. Co-creation de nuances et textures lors des workshops.",
      entryCriteria:
        "6+ mois de fidelite continue + 5+ produits achetes + UGC documante ou participation evenement",
    },
    {
      level: "AMBASSADEUR" as const,
      description:
        "Pretresse — Incarne les valeurs BLISS dans sa vie quotidienne. Influence son cercle. Peut animer des ateliers. Son temoignage est utilise dans les campagnes (avec son accord). Elle ne recommande pas BLISS — elle EST BLISS.",
      privileges:
        "Produits gratuits a chaque lancement. Commission sur les ventes via lien affilie (8%). Invitation aux voyages presse. Mention dans les campagnes. Acces direct a l'equipe BLISS pour feedback produit.",
      entryCriteria:
        "12+ mois de fidelite + 10+ parrainages convertis + contenu UGC regulier + validation par l'equipe BLISS",
    },
    {
      level: "EVANGELISTE" as const,
      description:
        "Gardienne — Amara Udaku et le cercle fondateur. Celles qui portent la vision originale et qui garantissent que BLISS ne devie jamais de sa mission de souverainete esthetique. Le comite de 7 femmes qui valide chaque nouveau produit avant lancement.",
      privileges:
        "Droit de veto sur les decisions strategiques qui touchent a l'identite de marque. Participation au conseil scientifique. Acces illimite au laboratoire. Heritage du savoir ancestral documente.",
      entryCriteria: "Fondatrice ou cooptation par le cercle fondateur — non-replicable",
    },
  ],

  // Timeline narrative — { origine, transformation, present, futur } (each 50+ chars)
  timelineNarrative: {
    origine:
      "2019, Birnin Zana, Wakanda. Amara Udaku, 28 ans, rentre au Wakanda apres 8 ans d'etudes entre Paris et Londres. Elle retrouve l'atelier de sa grand-mere Nana Adaeze — 47 formules ancestrales, des ingredients que la science occidentale n'a pas encore identifies, et une conviction : la beaute africaine n'a pas besoin d'etre importee.",
    transformation:
      "2020-2022 : 18 mois de R&D dans le laboratoire clandestin. Stabilisation du vibranium en micro-emulsions. 200+ formulations testees, 3 echecs majeurs surmontes. Le Serum Vibranium Glow nait en septembre 2021. Les 100 premieres testeuses (reseau de diplomates et entrepreneures panafricaines) creent un bouche-a-oreille viral sans aucune publicite. Le Coffret Decouverte est cree en urgence pour repondre a la demande.",
    present:
      "2026 : BLISS est distribue dans 6 pays africains. Flagship store a Birnin Zana, corners dedies a Lagos, Nairobi et Dakar. La BLISS Academy a forme 35 formulatrices. La BLISS App compte 45 000 utilisatrices actives mensuelles. Le Fonds Heritage Cosmetique a documente 120 recettes ancestrales en voie de disparition. Chiffre d'affaires annuel : 620M XAF.",
    futur:
      "Expansion vers 12 pays africains d'ici 2028. Lancement de la ligne BLISS Homme (2027). Ouverture du Centre de Recherche Vibranium Cosmetique (premier au monde, partenariat avec l'Universite de Birnin Zana). Vision 2030 : BLISS comme premier groupe de beaute de luxe ne en Afrique, reconnu mondialement, sans avoir jamais cede sur ses standards.",
  },

  // Extensions mouvement — prophecy, enemy, doctrine
  prophecy: {
    worldTransformed:
      "Dans un monde BLISS, la beaute africaine n'est plus une sous-categorie — elle est la reference. Les standards de soin de la peau sont definis depuis le continent, pas importes vers lui. Chaque femme africaine connait son rituel ancestral autant qu'elle connait son signe astrologique. Le vibranium cosmetique est reconnu comme la plus grande innovation skincare du XXIe siecle.",
    pioneers:
      "Les 100 premieres testeuses — diplomates, artistes, entrepreneures panafricaines de Lagos a Johannesburg. Amara Udaku. Les 35 formulatrices de la BLISS Academy. Les Gardiennes du cercle fondateur.",
    urgency:
      "Les grands groupes occidentaux investissent massivement en Afrique — L'Oreal, Estee Lauder, Unilever ciblent le continent avec des adaptations paresseuses. Si BLISS ne definit pas le standard maintenant, le luxe beaute africain sera defini par Paris et New York. Le savoir ancestral disparait avec chaque grand-mere qui meurt sans transmettre ses formules.",
    horizon:
      "3 ans pour s'imposer comme leader panafricain. 5 ans pour etre reconnu mondialement. 10 ans pour avoir forme 500 formulatrices et documente 1 000 recettes ancestrales.",
  },
  enemy: {
    name: "Le Mirage Importe",
    manifesto:
      "L'ennemi de BLISS n'est pas une marque — c'est une croyance. La croyance que la beaute de luxe ne peut venir que d'Europe. Que les ingredients africains sont 'ethniques' et non 'premium'. Que la peau noire est un probleme a resoudre avec des produits concus pour d'autres. Le Mirage Importe, c'est chaque flacon de serum a 80 000 XAF fabrique a Grasse ou Seoul qui ne contient aucun ingredient adapte aux peaux melaninees mais qui porte le prestige du 'Made in France'.",
    narrative:
      "Chaque jour en Afrique, des millions de femmes depensent des fortunes en produits de beaute importes qui n'ont jamais ete testes sur leur type de peau. Les rayons 'beaute ethnique' relegues au fond des pharmacies. Les publicites qui montrent des peaux eclaircies comme ideal. Le Mirage Importe prospere sur l'insecurite et l'ignorance — il fait croire que le luxe est toujours ailleurs. BLISS est ne pour le detruire.",
    enemySchwartzValues: ["CONFORMITE" as const, "POUVOIR" as const],
    overtonMap: {
      ourPosition:
        "La beaute africaine est un heritage scientifique millenaire — les ingredients et le savoir-faire du continent surpassent les formulations importees pour les peaux melaninees",
      enemyPosition:
        "Le luxe beaute est defini par les marques occidentales — les marques africaines ne peuvent etre que des alternatives 'ethniques' ou 'naturelles' a prix bas",
      battleground:
        "La perception du luxe cosmetique en Afrique : heritage local vs. prestige importe",
      shiftDirection:
        "De 'le luxe vient d'ailleurs' vers 'le luxe vient de chez nous' — shift de la dependance esthetique vers la souverainete cosmetique",
    },
    enemyBrands: [
      {
        name: "L'Oreal Paris (gamme Afrique)",
        howTheyFight:
          "Adapte des formules concues pour des peaux caucasiennes avec un marketing 'diversite' superficiel — le packaging change, pas la science",
      },
      {
        name: "Produits eclaircissants (marche gris)",
        howTheyFight:
          "Exploitent l'insecurite et le colorisme pour vendre des produits dangereux — le contraire absolu de la mission BLISS",
      },
      {
        name: "K-Beauty / marques coreennes",
        howTheyFight:
          "Seduisent par le packaging et le rituel en 10 etapes, mais les formulations ne prennent pas en compte la melanine ni les conditions climatiques africaines",
      },
    ],
    activeOpposition: [
      "Les grands groupes investissent massivement en distribution africaine — chaque lineaire de pharmacie conquis par L'Oreal est un espace ou BLISS n'est pas",
      "Le marche des produits eclaircissants represente 2 milliards USD en Afrique — une industrie entiere qui prospere sur le rejet de la peau naturelle",
      "Les influenceuses beaute financees par les marques occidentales promeuvent des standards importes aupres de millions de followers africaines",
    ],
    passiveOpposition: [
      "Le reflexe 'importe = meilleur' est profondement ancre dans la psychologie du consommateur africain premium depuis les independances",
      "L'absence de reglementation cosmetique harmonisee en Afrique permet aux produits dangereux de coexister avec le luxe authentique",
      "Le manque d'infrastructure de recherche cosmetique sur le continent limite la credibilite perdue des innovations locales",
    ],
    counterStrategy: {
      marketingCounter:
        "BLISS ne combat pas par la publicite — elle combat par les resultats. Chaque photo avant/apres (sans eclaircissement) est une arme. Le label 'Formule Ancestrale Certifiee' cree un standard que les marques importees ne peuvent pas revendiquer. Le vibranium est l'ingredient que personne d'autre ne possede — l'avantage competitif definitif.",
      alliances: [
        "Les formulatrices de la BLISS Academy — 35 ambassadrices scientifiques dans 8 pays",
        "Les dermatologues panafricains qui recommandent BLISS comme alternative cliniquement validee aux produits importes",
        "Les organisations anti-eclaircissement qui voient en BLISS un allie dans la lutte pour la sante de la peau",
        "Les entrepreneures et diplomatiques du reseau des 100 premieres testeuses — preuve sociale du plus haut niveau",
      ],
    },
    fraternityFuel: {
      sharedHatred:
        "La colere partagee contre le Mirage Importe soude la communaute BLISS. Chaque histoire de produit importe qui a abime une peau ('j'ai depense 50 000 XAF pour un serum qui m'a donne des taches') renforce le lien tribal. Le hashtag #MonHeritageMaPeau est un cri de guerre collectif.",
      bondingRituals: [
        "Le #DemaskTheImport challenge — montrer un produit importe decevant et son equivalent BLISS qui fonctionne vraiment",
        "Le Cercle des Gardiennes — diner trimestriel ou les ambassadrices partagent les recettes ancestrales de leurs familles",
        "Le Rituel du Premier Serum — video de la premiere application du Serum Vibranium Glow, moment de revelation partagee",
      ],
    },
  },
  doctrine: {
    dogmas: [
      "Nous croyons que la peau africaine est la plus belle du monde — pas malgre sa melanine, mais grace a elle. Chaque formule BLISS est concue pour reveler cette beaute, jamais pour la modifier.",
      "Nous croyons que le luxe veritable nait de la terre, pas de l'etiquette. Un ingredient cultive au Wakanda depuis 14 generations a plus de valeur qu'un actif synthetique brevete a Zurich.",
      "Nous croyons que le savoir ancestral est de la science non-documentee. La BLISS Academy existe pour que les formules de nos grand-meres survivent a l'industrialisation et au temps.",
      "Nous croyons que la souverainete esthetique est un droit — pas un luxe. Chaque femme africaine merite une skincare qui la comprend, pas qui la tolere.",
    ],
    principles: [
      "Le vibranium revele, il ne masque pas — chaque produit amplifie ce qui existe deja",
      "Ancestral ne signifie pas archaique — la tradition est notre avantage technologique",
      "Le luxe BLISS est inclusif dans sa diversite melaninee et exclusif dans son exigence de qualite",
      "Chaque flacon vendu finance une recette ancestrale preservee — la beaute finance l'heritage",
    ],
    practices: [
      "Chaque nouveau produit est valide par le Cercle des 7 Gardiennes avant lancement — veto possible",
      "Les ingredients sont traces de la source au flacon — transparence totale de la chaine d'approvisionnement",
      "La BLISS Academy forme 50 formulatrices par an — le savoir se multiplie, il ne se garde pas",
    ],
  },
  livingMythology: {
    canon: "Le Mythe Fondateur de BLISS commence dans l'atelier de Nana Adaeze a Birnin Zana. Une adolescente regarde sa grand-mere melanger du karite noir avec une poudre brillante — du vibranium micronise. Le baume guerit sa cicatrice en 3 semaines. Ce moment n'est pas une anecdote — c'est une preuve que la science la plus avancee du monde a toujours existe dans les mains des femmes africaines. BLISS est le pont entre cet atelier et le monde.",
    extensionRules:
      "Toute ambassadrice BLISS peut proposer une histoire ancestrale de soin de la peau de sa famille. Les histoires validees par le Cercle des Gardiennes entrent dans le canon officiel et la recette associee est documentee dans le Fonds Heritage. Le mythe grandit avec chaque formulatrice formee.",
    captureSystem:
      "Le #MonHeritageMaPeau — format video de 90 secondes ou une femme raconte la recette de soin de sa grand-mere. Les meilleures sont archivees dans la Bibliotheque Vivante (BLISS App) et les ingredients sont etudies par le laboratoire.",
  },

  // ── Champs fondamentaux ──────────────────────────────────────────────────
  nomMarque: "BLISS",
  accroche: "Le secret etait la depuis toujours.",
  description:
    "Marque de beaute et skincare premium panafricaine utilisant la technologie vibranium fusionnee avec la botanique ancestrale. BLISS ne suit pas les standards — elle les cree. Chaque produit est un acte de souverainete esthetique pour les peaux melaninees.",
  brandNature:
    "Maison de beaute de luxe panafricaine — pas une marque 'ethnique', pas du naturel bobo, mais du luxe scientifique ancre dans 14 generations de savoir ancestral. Le vibranium est l'ingredient que personne d'autre ne possede.",
  secteur: "Beaute / Skincare Premium",
  pays: "WK", // Wakanda
  langue: "fr",
  publicCible:
    "Femmes et hommes urbains africains (25-45 ans) soucieux de skincare premium et naturel, diaspora africaine (Paris, Londres, New York), et amateurs de luxe conscient mondiaux",
  promesseFondamentale:
    "Le vibranium n'est pas seulement un metal — c'est le secret de la beaute eternelle wakandaise. BLISS libere ce secret pour le monde.",
  equipeDirigeante: [
    {
      nom: "Amara Udaku",
      role: "Fondatrice / CEO",
      bio: "Heritiere des formulatrices royales du Wakanda. Double diplome cosmetologie (Paris) et biochimie (Londres). A stabilise le vibranium en micro-emulsions cosmetiques apres 18 mois de R&D. La vision et la science de BLISS.",
      experiencePasse: [
        "Recherche cosmetique L'Oreal Paris — 2 ans",
        "Laboratoire biochimie Imperial College Londres — 3 ans",
      ],
      competencesCles: [
        "Formulation cosmetique avancee",
        "Biochimie du vibranium",
        "Vision strategique luxe",
      ],
      credentials: [
        "MSc Cosmetologie ISIPCA Paris",
        "MSc Biochemistry Imperial College London",
        "47 formules ancestrales heritees de Nana Adaeze",
      ],
    },
    {
      nom: "Okoye Nnamdi",
      role: "Directrice Operations / COO",
      bio: "Ex-supply chain manager chez Kering (Gucci, Saint Laurent). Maitrise la chaine logistique du luxe en Afrique. A construit le reseau d'approvisionnement en ingredients vibranium et botaniques pour BLISS.",
      experiencePasse: [
        "Kering Group — supply chain luxe 6 ans",
        "DHL Afrique — logistique continentale 3 ans",
      ],
      competencesCles: [
        "Supply chain luxe",
        "Sourcing ingredients rares",
        "Operations multi-pays",
      ],
      credentials: [
        "MBA INSEAD",
        "Reseau logistique 12 pays africains",
      ],
    },
    {
      nom: "Zuri Bashenga",
      role: "Directrice Scientifique / CTO",
      bio: "Biochimiste specialisee en nano-particules. A co-developpe le processus de stabilisation vibranium avec Amara. Dirige le laboratoire BLISS et la BLISS Academy.",
      experiencePasse: [
        "Universite de Birnin Zana — recherche nano-materiaux 5 ans",
        "Johnson & Johnson R&D — formulation 4 ans",
      ],
      competencesCles: [
        "Nano-emulsions",
        "Stabilisation vibranium",
        "Formation de formulatrices",
      ],
      credentials: [
        "PhD Biochimie Universite de Birnin Zana",
        "12 brevets cosmetiques deposes",
      ],
    },
  ],
  equipeComplementarite: {
    scoreGlobal: 9.2,
    couvertureTechnique: true,
    couvertureCommerciale: true,
    couvertureOperationnelle: true,
    capaciteExecution: "forte" as const,
    lacunes: [
      "Pas de CDO digital dedie (Amara cumule)",
      "Pas de directeur financier temps plein avant Y2",
    ],
    verdict:
      "Equipe fondatrice exceptionnellement complementaire : science (Amara + Zuri), operations luxe (Okoye), heritage ancestral (Amara). La credibilite est non-replicable — aucun concurrent ne peut assembler cette combinaison de biochimie vibranium et savoir ancestral.",
  },
};

// ── Pilier D — Distinction (Positionnement) ────────────────────────────────────
// Schema: PillarDSchema — PersonaSchema, CompetitorSchema

export const blissPillarD = {
  // Personas — full detail
  personas: [
    {
      name: "Aissatou Biryongo",
      age: 32,
      csp: "Cadre superieur / Banque & Finance",
      location: "Douala, Cameroun",
      income: "650 000 XAF/mois",
      familySituation: "Mariee, 1 enfant, vie sociale active",
      tensionProfile: {
        segmentId: "MON-04",
        category: "MONEY" as const,
        position:
          "Discrete dominant — elle investit dans le luxe pour elle-meme, pas pour le montrer aux autres",
      },
      lf8Dominant: [
        "CONDITIONS_CONFORT" as const,
        "SUPERIORITE_STATUT" as const,
      ],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "SECURITE" as const],
      lifestyle:
        "Matinale. Routine skincare sacree de 20 minutes matin et soir. Achete en ligne (e-commerce premium) et en duty-free lors de ses voyages d'affaires. Ne suit pas les tendances — cherche ce qui fonctionne. Investit dans sa peau comme dans son portefeuille : strategiquement, a long terme.",
      mediaConsumption:
        "LinkedIn quotidien, Instagram curate (suit 200 comptes max, principalement lifestyle et business). Lit Jeune Afrique et Forbes Afrique. Podcasts business pendant ses trajets. Ne regarde pas de tutoriels beaute — fait confiance aux recommandations de son dermatologue et de ses pairs.",
      brandRelationships:
        "Fidele et exigeante. Une fois convaincue, elle rachete pendant des annees. Mais la premiere deception = la derniere. Recommande discretement a son cercle intime (3-5 amies proches). Son avis pese 10x celui d'une influenceuse aupres de son reseau.",
      motivations:
        "Maintenir une peau impeccable comme extension de son excellence professionnelle. Pour Aissatou, la skincare n'est pas de la vanite — c'est de la discipline. La meme rigueur qu'elle applique a ses analyses financieres, elle l'applique a sa routine de soin. Elle cherche des resultats mesurables, pas des promesses.",
      fears:
        "Vieillissement premature visible qui compromettrait son image professionnelle. Utiliser un produit contenant des ingredients douteux (eclaircissants caches, perturbateurs endocriniens). Perdre du temps avec des produits qui ne fonctionnent pas — son temps vaut plus que le prix du serum.",
      hiddenDesire:
        "Trouver LA marque definitive — celle qui comprend sa peau, son mode de vie, et qui lui evite de tester indefiniment. BLISS comme le 'conseiller financier de sa peau' : fiable, expert, discret, et qui delivre des resultats mesurables.",
      whatTheyActuallyBuy:
        "De la certitude. Chaque flacon BLISS lui garantit qu'elle n'a pas besoin de chercher ailleurs. Elle achete le Serum Vibranium Glow (15 000 XAF) + Creme Eternelle (22 000 XAF) tous les 2 mois. LTV estimee sur 3 ans : 660 000 XAF.",
      jobsToBeDone: [
        "Maintenir une peau radieuse et saine sans routine de 45 minutes",
        "Trouver des produits premium concus pour sa peau melaninee, pas adaptes d'une formule caucasienne",
        "Offrir un cadeau beaute premium a ses collegues et amies — le Coffret Decouverte comme geste sophistique",
      ],
      decisionProcess:
        "Analytique et methodique. Lit les compositions (INCI). Teste pendant 30 jours avant de se prononcer. Compare les resultats objectivement. Une fois convaincue, ne change plus.",
      devotionPotential: "AMBASSADEUR" as const,
      rank: 1,
    },
    {
      name: "Fatou Diallo",
      age: 28,
      csp: "Consultante mode / Diaspora",
      location: "Paris 11e, France (originaire de Dakar)",
      income: "3 200 EUR/mois",
      familySituation: "Celibataire, vie sociale intense entre Paris et Dakar",
      tensionProfile: {
        segmentId: "IDE-02",
        category: "IDENTITY" as const,
        position:
          "Roots dominant — elle affirme son africanite a travers ses choix esthetiques, y compris sa skincare",
      },
      lf8Dominant: [
        "APPROBATION_SOCIALE" as const,
        "SUPERIORITE_STATUT" as const,
      ],
      schwartzValues: ["AUTONOMIE" as const, "STIMULATION" as const],
      lifestyle:
        "Fashion-forward. Melange haute couture et createurs africains. Sa salle de bain est un musee de marques niches. Voyage entre Paris, Dakar et Lagos 4x/an. Poste des routines beaute sur Instagram (12K followers). Sa peau est son premier accessoire de mode.",
      mediaConsumption:
        "Instagram 3h/jour (creation + inspiration). TikTok pour les tendances. Suit les comptes beaute afro-centrees (Jackie Aina, Nyma Tang). Lit Vogue et Trace. Ecoute des podcasts sur le business de la mode africaine.",
      brandRelationships:
        "Early adopter perpetuelle. Adore decouvrir avant les autres et etre la premiere a recommander. Fidelite moderate — change facilement si un nouveau produit la seduit. Mais si une marque incarne ses valeurs (africanite, luxe, independance), elle devient une evangeliste feeroce.",
      motivations:
        "Prouver que le luxe beaute africain existe et surpasse les marques parisiennes qu'elle cotait tous les jours. BLISS est son argument dans un diner : 'Mon serum vient du Wakanda et il est meilleur que ton La Mer.' Chaque application est un acte politique autant qu'esthetique.",
      fears:
        "Etre percue comme quelqu'un qui suit les tendances 'afro' par mode et non par conviction. Que les marques africaines decoivent en qualite et lui donnent tort devant ses amies parisiennes. Que le Made in Africa reste synonyme de low-cost dans l'esprit de ses collegues.",
      hiddenDesire:
        "Devenir l'ambassadrice officielle de BLISS a Paris. Etre le pont entre le luxe africain et le marche europeen. Son reve : presenter BLISS a la Fashion Week de Paris comme LA revelation beaute.",
      whatTheyActuallyBuy:
        "De l'identite et du storytelling. Chaque produit BLISS est une histoire qu'elle raconte. Le Masque Ancestral (18 000 XAF) est son prefere — le rituel, le nom, l'heritage. Elle achete aussi pour offrir : le Coffret Decouverte comme cadeau signature a ses amies parisiennes.",
      jobsToBeDone: [
        "Affirmer son identite africaine a travers une marque de luxe qui n'a rien a envier a Chanel ou Dior",
        "Decouvrir et recommander des marques africaines premium a son reseau parisien",
        "Creer du contenu beaute authentique qui melange heritage africain et sophistication contemporaine",
      ],
      decisionProcess:
        "Emotionnelle et narrative. Le storytelling de la marque compte autant que la formule. Si l'histoire la touche et les resultats suivent, elle est convertie en 1 semaine.",
      devotionPotential: "EVANGELISTE" as const,
      rank: 2,
    },
    {
      name: "Chidinma Okafor",
      age: 25,
      csp: "Influenceuse beaute / Creatrice de contenu",
      location: "Lagos, Nigeria",
      income: "800 000 NGN/mois (variable)",
      familySituation: "Celibataire, vie 100% digitale",
      tensionProfile: {
        segmentId: "IDE-05",
        category: "IDENTITY" as const,
        position:
          "Aspirationnel dominant — elle projette une image de beaute experte superieure a ce qu'elle maitrise reellement",
      },
      lf8Dominant: [
        "APPROBATION_SOCIALE" as const,
        "SUPERIORITE_STATUT" as const,
      ],
      schwartzValues: ["ACCOMPLISSEMENT" as const, "STIMULATION" as const],
      lifestyle:
        "Vit pour le contenu. Chaque produit teste est filme, chaque routine est documentee. 85K followers sur Instagram, 120K sur TikTok. Ses revenus dependent de sa credibilite beaute. Teste 15-20 produits par mois. Cherche constamment LA marque qui la distinguera des 500 autres beauty influencers nigerianes.",
      mediaConsumption:
        "Instagram 5h/jour (creation), TikTok 3h/jour, YouTube 2h/semaine (long-form reviews). Analyse ses metriques quotidiennement. Compare ses engagement rates aux concurrentes. Suit les tendances K-Beauty et les adapte pour son audience africaine.",
      brandRelationships:
        "Transactionnelle par defaut — les marques la paient ou lui envoient des produits gratuits. Mais quand un produit la bouleverse reellement, elle devient une advocateuse sincere qui ne monnaye pas son avis. C'est la difference entre un post sponsorise et un coup de coeur authentique.",
      motivations:
        "Se demarquer dans un marche sature d'influenceuses beaute. BLISS l'interesse parce que le vibranium est un ingredient que personne d'autre n'a — contenu exclusif garanti. Etre la premiere a faire un unboxing BLISS a Lagos = 500K vues minimum.",
      fears:
        "Recommander un produit qui decoit ses followers et perdre sa credibilite durement construite. Etre percue comme une influenceuse 'achetable' qui promeut n'importe quoi. Que le marche de l'influence beaute en Afrique se sature au point ou personne ne l'ecoute plus.",
      hiddenDesire:
        "Devenir la Jackie Aina de l'Afrique de l'Ouest — une autorite beaute incontestable, pas juste une fille qui poste des tutoriels. Le partenariat BLISS lui donnerait la credibilite scientifique qui lui manque (vibranium, formules ancestrales = contenu educatif premium).",
      whatTheyActuallyBuy:
        "Du contenu et de la credibilite. En tant qu'influenceuse, elle ne paie pas directement — BLISS lui offre des produits en echange de contenu. Mais sa valeur marketing est immense : chaque video = 50 000 vues organiques. ROI estime 15x le cout des produits offerts.",
      jobsToBeDone: [
        "Obtenir des produits exclusifs et innovants qui generent du contenu viral",
        "Construire une reputation d'experte beaute serieuse au-dela de l'influence superficielle",
        "Etre la premiere a presenter des marques africaines premium a son audience avant les autres creatrices",
      ],
      decisionProcess:
        "Strategique et calculee. Evalue chaque produit selon 3 criteres : potentiel contenu, credibilite brand, et exclusivite. Si les 3 sont reunis, elle s'engage a fond.",
      devotionPotential: "AMBASSADEUR" as const,
      rank: 3,
    },
    {
      name: "Kwame Asante",
      age: 38,
      csp: "Entrepreneur wellness / Fondateur spa premium",
      location: "Accra, Ghana",
      income: "1 200 000 GHS/an (equivalent ~180M XAF/an)",
      familySituation: "Marie, 2 enfants, implique dans la communaute wellness panafricaine",
      tensionProfile: {
        segmentId: "POW-05",
        category: "POWER" as const,
        position:
          "Independant dominant — il construit son propre ecosysteme wellness plutot que de rejoindre un existant",
      },
      lf8Dominant: [
        "CONDITIONS_CONFORT" as const,
        "PROTECTION_PROCHES" as const,
      ],
      schwartzValues: ["AUTONOMIE" as const, "BIENVEILLANCE" as const],
      lifestyle:
        "Holiste. Meditation, nutrition, fitness et skincare sont un seul systeme pour lui. Dirige 3 spas premium a Accra et projette d'ouvrir a Abidjan. Voyage en Asie pour etudier les rituels de soin. Cherche des marques partenaires qui partagent sa vision holistique.",
      mediaConsumption:
        "LinkedIn (thought leadership wellness), Instagram (inspiration et reseau), podcasts wellness (Huberman Lab, Rich Roll). Lit des etudes scientifiques sur le skincare. Ne consomme pas de contenu beaute mainstream — trop superficiel pour lui.",
      brandRelationships:
        "Partenaire, pas client. Il ne veut pas acheter BLISS — il veut l'integrer dans son offre spa. Cherche des marques avec une histoire authentique et une science solide qu'il peut raconter a ses clients. La relation ideale est B2B + co-branding.",
      motivations:
        "Integrer BLISS dans ses protocoles spa comme la reference skincare vibranium. Chaque soin BLISS propose dans ses spas renforce son positionnement 'wellness africain premium'. Il voit BLISS comme le complement parfait a sa vision : le bien-etre panafricain de luxe n'a pas besoin d'etre importe de Bali.",
      fears:
        "S'associer a une marque qui ne tient pas ses promesses scientifiques — sa reputation de spa premium repose sur la confiance de ses clients. Que le vibranium soit percu comme du marketing et non comme une vraie innovation. Que BLISS ne puisse pas livrer en volume les quantites necessaires pour ses 3 spas.",
      hiddenDesire:
        "Co-creer une ligne BLISS x Asante Wellness exclusive a ses spas — le premier protocole spa vibranium au monde. Devenir l'ambassadeur masculin de la marque et prouver que le skincare premium n'est pas genere.",
      whatTheyActuallyBuy:
        "Du volume B2B. Commande l'Huile Royale (28 000 XAF) et le Masque Ancestral (18 000 XAF) par lots de 50+ unites pour ses protocoles spa. Commande mensuelle estimee : 1 500 000 XAF. LTV annuelle : 18 000 000 XAF. Le client B2B le plus precieux du portfolio.",
      jobsToBeDone: [
        "Integrer une gamme skincare premium africaine dans ses protocoles spa pour renforcer son positionnement panafricain",
        "Offrir a ses clients une experience sensorielle unique que les marques importees ne peuvent pas reproduire",
        "Co-developper des soins exclusifs vibranium pour differencier ses spas de la concurrence",
      ],
      decisionProcess:
        "Business-first. Evalue ROI, supply chain, storytelling, et exclusivite territoriale. Negocie un partenariat B2B avant de commander. Decision en 2-3 semaines apres test terrain avec ses estheticiennes.",
      devotionPotential: "ENGAGE" as const,
      rank: 4,
    },
  ],

  // Paysage concurrentiel — CompetitorSchema
  paysageConcurrentiel: [
    {
      name: "L'Oreal Paris (gammes Afrique & Melanin)",
      partDeMarcheEstimee: 35,
      avantagesCompetitifs: [
        "Distribution massive via pharmacies et grandes surfaces dans 20+ pays africains — presence physique inegalee avec plus de 50 000 points de vente sur le continent",
        "Budget R&D annuel de 1.1 milliard EUR permettant des formulations validees cliniquement et un portefeuille de brevets colossal en depigmentation et anti-age",
      ],
      faiblesses: [
        "Formulations adaptees de produits caucasiens plutot que concues pour les peaux melaninees",
        "Image corporate impersonnelle — aucune histoire authentiquement africaine a raconter",
        "Controverse recurrente sur les gammes eclaircissantes qui contredisent le discours diversite",
      ],
      strategiePos:
        "Geant industriel qui traite l'Afrique comme un marche a conquerir, pas comme une source d'innovation — le volume sans l'ame",
    },
    {
      name: "Shea Moisture / Sundial Brands",
      partDeMarcheEstimee: 12,
      avantagesCompetitifs: [
        "Positionnement 'heritage africain' credible aupres de la diaspora avec un storytelling ancestral bien construit et une distribution chez Sephora/Target",
      ],
      faiblesses: [
        "Rachete par Unilever en 2017 — perte d'authenticite perdue aupres des puristes",
        "Focus capillaire plutot que skincare — pas de concurrence frontale sur le serum/creme premium",
        "Production aux USA, pas sur le continent — le 'Made in Africa' manque",
      ],
      strategiePos:
        "Heritage sincere mais coopte par le corporate — le dilemme de l'authenticite vendue a un conglomerat",
    },
    {
      name: "K-Beauty (Innisfree, COSRX, The Ordinary via revendeurs)",
      partDeMarcheEstimee: 18,
      avantagesCompetitifs: [
        "Rituel en 10 etapes qui seduit les millennials africaines urbanisees — packaging instagrammable, prix accessibles, et perception d'innovation technologique asiatique",
      ],
      faiblesses: [
        "Zero adaptation aux conditions climatiques africaines (humidite, UV intense, types de peau specifiques)",
        "Aucun ingredient adapte a la melanine — les AHA/BHA concus pour les peaux asiatiques peuvent provoquer hyperpigmentation sur peaux noires",
        "Aucun ancrage culturel africain — attraction purement esthetique et tendancielle",
      ],
      strategiePos:
        "Innovation perdue attractive mais culturellement deconnectee — le cool sans la comprehension",
    },
  ],

  // Promesses
  promesseMaitre:
    "La beaute la plus avancee du monde a toujours ete africaine. BLISS vous la rend.",
  sousPromesses: [
    "Serum Vibranium Glow : Eclat visible en 14 jours — la nano-technologie vibranium penetre 3x plus profondement que l'acide hyaluronique classique, sans irritation sur les peaux melaninees.",
    "Creme Eternelle : Protection et regeneration 24h — un bouclier anti-pollution et anti-UV formule specifiquement pour les peaux qui produisent plus de melanine, pas moins.",
    "Rituel Ancestral Complet : 3 produits, 10 minutes, 14 generations de savoir — la routine la plus efficace jamais concue pour la peau africaine, validee par la biochimie et par le temps.",
  ],

  positionnement:
    "BLISS est la premiere maison de beaute de luxe nee en Afrique qui ne s'excuse pas d'etre africaine. Pas du 'naturel ethnique' — du luxe scientifique ancre dans le patrimoine cosmetique le plus ancien du monde.",

  // Ton de voix
  tonDeVoix: {
    personnalite: [
      "Souveraine — parle avec l'assurance de 14 generations de savoir, sans arrogance mais sans excuses",
      "Sensorielle — chaque mot evoque une texture, un parfum, une sensation sur la peau",
      "Educatrice subtile — enseigne sans condescendance, revele la science derriere la beaute",
      "Panafricaine dans l'ame — parle a Douala comme a Dakar, a Nairobi comme a Lagos",
      "Luxueuse sans ostentation — le raffinement est dans la precision, pas dans l'exces",
    ],
    onDit: [
      "Reveler / Revelation — BLISS revele la beaute, elle ne la cree pas. Le verbe fondateur de toute communication",
      "Heritage vivant — la tradition n'est pas du passe, c'est une technologie qui evolue avec nous",
      "Vibranium-infuse — l'ingredient signature qui distingue BLISS de tout ce qui existe sur le marche",
      "Souverainete esthetique — le droit de definir sa propre beaute sans se conformer a des standards importes",
      "Formulatrices — pas des 'chimistes' ou 'laborantines', mais des gardiennes d'un savoir ancestral scientifique",
    ],
    onNeditPas: [
      "Ethnique / exotique / tribal — termes reducteurs qui exotisent et marginalisent au lieu de celebrer",
      "Eclaircissant / unifiant / correcteur de teint — le vocabulaire de l'industrie qui traite la melanine comme un defaut",
      "Naturel / bio / clean beauty — trop generiques, trop occidentaux, et BLISS est bien au-dela du 'naturel'",
      "Consommatrices / utilisatrices — ce sont des Gardiennes, des Adeptes, des Pretresses, pas des metriques",
      "Anti-age / anti-rides — BLISS celebre chaque age, elle ne combat pas le temps mais l'accompagne",
    ],
  },

  // Assets linguistiques
  archetypalExpression: {
    visualTranslation:
      "Le Magicien se traduit par une direction artistique ou chaque visuel suggere la transformation invisible : des textures qui semblent changer sous la lumiere, des reflets vibranium subtils (violet-dore), des mises en scene qui evoquent l'alchimie ancestrale mise a jour. L'Amoureux secondaire ajoute la sensualite — peaux touchees, gestes lents, intimite du rituel.",
    verbalTranslation:
      "Ton assertif, poetique et scientifique a la fois. BLISS parle comme une chercheuse qui a aussi lu Cesaire. Les phrases sont courtes et percutantes pour les campagnes, longues et enveloppantes pour le contenu educatif. Pas de jargon marketing — de la precision et de l'emotion.",
    emotionalRegister:
      "Curiosite → Emerveillement → Fierte → Souverainete. L'emotion progresse de 'qu'est-ce que le vibranium ?' a 'ma beaute est un heritage millenaire que personne ne peut m'enlever'.",
  },

  assetsLinguistiques: {
    languePrincipale: "fr",
    slogan: "Revelee. Pas inventee.",
    tagline: "Le secret etait la depuis toujours.",
    motto: "La beaute la plus avancee du monde est nee en Afrique. BLISS ne la decouvre pas — elle la libere. 14 generations. 1 mission.",
    mantras: [
      "La peau se souvient de ce que le monde a oublie.",
      "Le vibranium revele. Il ne masque jamais.",
      "Ancestral n'est pas archaique — c'est notre avance technologique.",
    ],
    lexiquePropre: [
      { word: "Gardienne", definition: "Membre de la communaute BLISS au niveau le plus eleve — celle qui protege et transmet le savoir" },
      { word: "Revelation", definition: "Le moment ou un produit BLISS revele le plein potentiel de la peau — pas une transformation, un devoilement" },
      { word: "Formulatrice", definition: "Herbaliste-biochimiste formee par la BLISS Academy — gardienne du savoir ancestral modernise" },
      { word: "Vibranium-infuse", definition: "Technologie proprietary de nano-particules vibranium stabilisees en micro-emulsions cosmetiques" },
      { word: "Rituel", definition: "Pas une 'routine' — un acte intentionnel de soin qui connecte a l'heritage ancestral" },
      { word: "Heritage Vivant", definition: "Le savoir ancestral en evolution constante — ni fige dans le passe ni deconnecte de la science moderne" },
      { word: "Le Cercle", definition: "Le conseil des 7 Gardiennes qui valide chaque nouveau produit avant lancement" },
      { word: "Pretresse", definition: "Ambassadrice BLISS de niveau avance — elle incarne la marque dans sa vie quotidienne" },
      { word: "Le Mirage", definition: "L'ennemi — la croyance que le luxe beaute ne peut venir que d'Europe ou d'Asie" },
      { word: "Nana Adaeze", definition: "La grand-mere fondatrice symbolique — les 47 formules originales portent son nom" },
    ],
  },

  // Direction artistique
  directionArtistique: {
    chromaticStrategy: {
      primaire: "#1A0A2E (Violet Vibranium profond — mystere, science, royaute africaine)",
      secondaire: "#C9A96E (Or Ancestral — luxe, heritage, chaleur)",
      accent: "#7B2FBE (Violet Eclat — le vibranium actif, l'energie, la transformation)",
      neutre: "#FAF5EF (Ivoire Chaud — purete sans sterilite, douceur, lumiere naturelle)",
    },
    typographySystem: {
      principale: "Didot (titres — elegance haute-couture, luxe intemporel, precision)",
      secondaire: "Jost (corps — modernite panafricaine, lisibilite, chaleur geometrique)",
      technique: "Space Mono (ingredients, INCI, donnees scientifiques — credibilite labo)",
    },
    visualLandscape: {
      style: "Luxe sensoriel afro-futuriste — eclairage studio dore sur peaux melaninees, textures produits macro (cremes, serums en mouvement), botanique africaine sublimee. Pas de studio froid occidental — chaleur, profondeur, intimite. Chaque visuel doit evoquer l'atelier de Nana Adaeze modernise.",
    },
    semioticAnalysis: {
      symboles: "Le losange vibranium (forme cristalline) comme motif recurrent. Les mains de femmes — geste d'application, geste de transmission. Les ingredients botaniques (karite, baobab, moringa) photographiees comme des pierres precieuses. L'oeil en gros plan — la peau comme paysage.",
      mascotte: "Pas de mascotte — la figure tutellaire est Nana Adaeze (silhouette stylisee, jamais un visage precis). Elle apparait dans les patterns du packaging comme une presence protectrice.",
    },
    moodboard: {
      theme: "Alchimie royale panafricaine — laboratoire ancestral rencontre design contemporain. Violet profond et or sur noir. Textures liquides et organiques. Femmes puissantes en lumiere doree. Ingredients bruts sublimes en macro.",
      keywords: [
        "vibranium glow",
        "alchimie ancestrale",
        "luxe panafricain",
        "melanine magnifiee",
        "or et violet",
        "science royale",
        "heritage vivant",
        "peau comme paysage",
        "botanique precieuse",
        "afro-futurisme sensoriel",
      ],
      cartes: "2 types : Carte Produit (fiche ingredient, rituel d'application, heritage ancestral) et Carte Gardienne (profil communautaire, niveau de devotion, rituels partages).",
    },
    designTokens: {
      darkMode: "Violet #1A0A2E dominant, accents or #C9A96E, textes ivoire #FAF5EF. Animations fluides de type 'liquide vibranium' sur les transitions. Mode clair reserve au contenu educatif/scientifique.",
    },
    brandGuidelines: {
      packaging: "Flacons en verre violet fonce avec bouchons en bois d'iroko grave. Etiquettes en papier texture avec impression a chaud doree. Chaque flacon porte le losange vibranium et le numero de formule ancestrale. Zero plastique — verre + bois + papier recycle.",
      retail: "Flagship Birnin Zana : concept store immersif (bois sombre, lumiere doree, murs botaniques vivants). Corners dedies en parfumeries selectes. Pas de grande distribution — jamais. L'experience physique est un rituel, pas un achat.",
    },
    motionIdentity: {
      interactions: "Animations de type 'flux vibranium' (particules violettes-dorees en mouvement lent). Transitions liquides entre les ecrans de la BLISS App. Son de cristal vibranium discret sur les notifications. Micro-animations sur le diagnostic de peau (scan lumineux violet).",
    },
    lsiMatrix: {
      concepts: [
        "La Revelation",
        "L'Heritage",
        "La Souverainete",
        "La Science Ancestrale",
        "Le Vibranium",
      ],
      layers: {
        visuel: [
          "Losange vibranium sur chaque support",
          "Peaux melaninees en lumiere doree",
          "Ingredients botaniques comme pierres precieuses",
          "Violet profond + or ancestral",
          "Flacons en verre violet avec bois d'iroko",
        ],
        verbal: [
          "Revellee, pas inventee",
          "Heritage Vivant",
          "Gardienne",
          "Formulatrice",
          "Vibranium-infuse",
        ],
        comportemental: [
          "Rituel de soin intentionnel (pas routine)",
          "Partage discret entre proches",
          "Diagnostic de peau via BLISS App",
          "Achat du Coffret comme initiation",
          "Parrainage de la prochaine Gardienne",
        ],
        emotionnel: [
          "Fierte de l'heritage africain",
          "Emerveillement devant les resultats vibranium",
          "Colere saine contre le Mirage Importe",
          "Sérénite du rituel quotidien",
          "Appartenance au Cercle des Gardiennes",
        ],
        rituel: [
          "Le Premier Serum — moment de revelation initiale",
          "Le Cercle Trimestriel — diner des ambassadrices",
          "Le Rituel du Soir — 10 minutes de reconnection ancestrale",
          "La Transmission — offrir le Coffret a une amie comme acte de sororite",
          "Le Wrapped Annuel — bilan personnalise de sa peau via BLISS App",
        ],
      },
      sublimationRules: [
        {
          literal: "Creme hydratante",
          sublimated: "Bouclier vibranium — protection et regeneration en une seule formule nee de 14 generations de savoir",
        },
        {
          literal: "Routine skincare",
          sublimated: "Rituel ancestral de reconnection — 10 minutes ou ta peau se souvient de ce que le monde a oublie",
        },
        {
          literal: "Programme fidelite",
          sublimated: "Parcours de la Gardienne — de Curieuse a Pretresse, chaque niveau est un heritage qui s'approfondit",
        },
      ],
    },
  },
};
