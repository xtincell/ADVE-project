/**
 * PANTHER ATHLETICS — Pillar Content Data (A partial only)
 * Score: 5/25 — PROSPECT (just completed intake)
 * Marque de sport — vetements de performance conçus au Wakanda
 */

// ── Pilier A — Authenticite (PARTIAL — archetype set, 2-act journey, draft ikigai, 2 values only) ──

export const pantherPillarA = {
  archetype: "HEROS" as const,
  // No secondary archetype set yet

  citationFondatrice:
    "\"Le sport africain n'a pas besoin de Nike — il a besoin de sa propre armure.\" — Nakia Runako, fondatrice Panther Athletics, 2025.",

  noyauIdentitaire:
    "Panther Athletics veut devenir la premiere marque de sport concue par et pour les athletes africains. Nakia Runako, ex-sprinteuse nationale wakandaise, a decouvert que les equipements sportifs vendus en Afrique sont des surplus de collections occidentales — jamais adaptes aux morphologies, au climat ou aux pratiques sportives locales. Panther Athletics est une reponse : des vetements de performance conçus au Wakanda.",

  // Hero's Journey — 2 acts only (3-5 MISSING — brand just completed intake)
  herosJourney: [
    {
      actNumber: 1 as const,
      title: "L'Humiliation — Les Maillots Qui Ne Vont Pas",
      narrative:
        "Nakia Runako represente le Wakanda aux Jeux Panafricains 2019 en sprint 200m. Elle court avec un maillot Nike taille M qui la serre aux epaules et flotte a la taille — aucune coupe pour sa morphologie. En demi-finale, la couture laterale cede. Elle termine la course en tenant son maillot. A l'arrivee, la honte est double : eliminee, et en maillot dechire devant les cameras. Ce soir-la, dans sa chambre d'hotel, elle dessine le premier croquis d'un maillot qui epouserait un corps de sprinteuse africaine.",
      emotionalArc: "Humiliation publique → Rage interieure → Premiere vision",
    },
    {
      actNumber: 2 as const,
      title: "L'Etude — De la Piste au Patron",
      narrative:
        "Nakia prend sa retraite sportive a 26 ans et s'inscrit en design textile a l'Institut de Mode de Birnin Zana. Elle mesure 200 athletes wakandais (hommes et femmes, 15 sports differents) pour creer une base de donnees morphologiques africaines — la premiere du genre. Ses decouvertes confirment son intuition : les mensurations standard occidentales ne correspondent a aucun des 200 athletes. Le decalage est de 8-15% sur les mesures cles (epaules, hanches, buste).",
      emotionalArc: "Methode → Decouverte scientifique → Validation de l'intuition",
      causalLink: "La base de donnees morphologiques africaines devient la propriete intellectuelle fondatrice de Panther Athletics",
    },
    // Acts 3-5 MISSING — brand is in early intake stage
  ],

  // Ikigai — draft only, not fully developed
  ikigai: {
    love: "Panther Athletics aime le mouvement — la course, le saut, la danse, le combat. Chaque vetement est concu pour liberer le geste, pas le contraindre.",
    competence:
      "Base de donnees morphologiques de 200 athletes africains. Design textile specifique climat tropical (ventilation, sechage rapide, anti-UV). Prototypage rapide au FabLab de Birnin Zana.",
    worldNeed:
      "Le marche du sportswear en Afrique est inonde de surplus occidentaux et de contrefacons. Les athletes africains meritent des equipements concus pour eux.",
    remuneration:
      "Pas encore defini en detail. Gamme envisagee : T-shirts performance (8 000-12 000 XAF), shorts (6 000-10 000 XAF), leggings (10 000-15 000 XAF). Canal DTC + partenariats clubs sportifs.",
  },

  // 2 values only — minimum viable
  valeurs: [
    {
      value: "ACCOMPLISSEMENT" as const,
      customName: "Performance Sans Excuses",
      rank: 1,
      justification:
        "Panther Athletics croit que la performance sportive ne devrait jamais etre limitee par l'equipement. Un sprinter wakandais merite le meme niveau de technicite qu'un sprinter americain.",
      costOfHolding:
        "Les tissus techniques haute performance coutent 3x plus que les tissus standard disponibles localement.",
    },
    {
      value: "AUTONOMIE" as const,
      customName: "Made for Africa, by Africa",
      rank: 2,
      justification:
        "Chaque vetement Panther Athletics est concu, patronne et cousu au Wakanda. L'autonomie industrielle sportive est un acte de souverainete — pas un slogan marketing.",
      costOfHolding:
        "La chaine de production locale est plus lente et plus chere qu'une sous-traitance asiatique. Mais c'est non-negociable.",
    },
  ],

  // No community hierarchy yet
  // No timeline narrative yet (brand too young)
  // No prophecy, enemy, doctrine yet

  nomMarque: "Panther Athletics",
  accroche: "L'armure des athletes africains.",
  description:
    "Marque de vetements sportifs de performance concus au Wakanda pour les morphologies et le climat africains. En phase d'intake.",
  brandNature:
    "Sportswear heroique — pas du lifestyle deguise en sport, mais de la performance pure adaptee aux corps et aux conditions africaines.",
  secteur: "Sportswear / Performance Athletique",
  pays: "WK",
  langue: "fr",
  publicCible:
    "Athletes amateurs et professionnels wakandais (18-35 ans), clubs sportifs, federations, passionnes de fitness urbain",
  promesseFondamentale:
    "Panther Athletics est l'equipement sportif qui comprend ton corps, ton climat et ton ambition — parce qu'il est ne ici.",
  equipeDirigeante: [
    {
      nom: "Nakia Runako",
      role: "Fondatrice / Directrice Artistique",
      bio: "Ex-sprinteuse nationale wakandaise. Diplome design textile Institut de Mode de Birnin Zana. Base de donnees morphologiques de 200 athletes africains.",
      experiencePasse: ["Equipe nationale sprint Wakanda — 6 ans", "Institut de Mode Birnin Zana — 2 ans"],
      competencesCles: ["Design textile sportif", "Morphologie africaine", "Prototypage rapide"],
      credentials: ["Demi-finaliste Jeux Panafricains 2019", "Base de donnees morpho 200 athletes"],
    },
  ],
};
