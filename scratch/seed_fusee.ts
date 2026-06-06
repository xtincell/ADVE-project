import { db } from "../src/lib/db";
import { createEmptyVector } from "../src/lib/types/advertis-vector";

async function main() {
  console.log("Seeding La Fusée Advertis...");

  // 1. Get or create operator "upgraders"
  let operator = await db.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) {
    operator = await db.operator.create({
      data: {
        name: "UPgraders",
        slug: "upgraders",
        status: "ACTIVE",
        licenseType: "OWNER",
        licensedAt: new Date(),
        licenseExpiry: new Date("2036-01-01T00:00:00.000Z"),
      }
    });
  }

  // 2. Get or create user
  let user = await db.user.findFirst({ where: { email: "alex@upgraders.africa" } });
  if (!user) {
    user = await db.user.create({
      data: {
        name: "Alexandre",
        email: "alex@upgraders.africa",
        role: "ADMIN",
        operatorId: operator.id,
      }
    });
  }

  // 3. Create Client
  const client = await db.client.create({
    data: {
      name: "UPgraders",
      sector: "TECH_AGENCY",
      country: "CMR",
      contactName: "Xtincell",
      contactEmail: "alex@upgraders.africa",
      operatorId: operator.id,
    }
  });

  // 4. Create Strategy
  const strategy = await db.strategy.create({
    data: {
      name: "La Fusée - Industry OS",
      description: "Industry OS pour le marché créatif africain, propulsé par l'agence UPgraders.",
      status: "ACTIVE",
      clientId: client.id,
      userId: user.id,
      operatorId: operator.id,
    }
  });

  // 5. Create Pillars
  const pillars = [
    {
      key: "a",
      name: "Authenticité",
      status: "COMPLETE",
      content: {
        archetype: "Créateur / Magicien",
        doctrine: "De la Poussière à l'Étoile — chaque talent créatif, chaque marque, chaque projet peut atteindre l'excellence s'il a la structure pour.",
        valeurs: [
          { valeur: "Excellence Structurée", justification: "L'artisanat ne passe pas à l'échelle sans protocole.", rang: 1 },
          { valeur: "Empowerment", justification: "Rendre chaque professionnel capable via l'Académie et la Guilde.", rang: 2 },
          { valeur: "Mesurabilité", justification: "Rendre visible ce que personne ne mesure (Le Signal).", rang: 3 }
        ],
        ikigai: {
          love: "Construire des systèmes qui élèvent les créatifs et les marques",
          competence: "Architecture de marque, Ingénierie logicielle (Industry OS)",
          worldNeed: "Le marché africain manque d'une infrastructure méthodologique (Industry OS) pour remplacer l'artisanat",
          remuneration: "Modèle SaaS (Brand OS), Retainers (Oracle), Commissions (Guilde)"
        }
      }
    },
    {
      key: "d",
      name: "Distinction",
      status: "COMPLETE",
      content: {
        positionnement: "Le premier Industry OS pour le marché créatif africain.",
        promesseMaitre: "Fournir l'infrastructure technologique et méthodologique (protocole ADVE) pour structurer, mesurer et accélérer toute la chaîne de valeur créative.",
        personas: [
          { nom: "Le Fixer (Alexandre)", insightCle: "Impossible de scaler sa méthode au-delà de sa présence physique", motivations: ["God mode sur l'écosystème", "Le système porte la méthode à sa place"] },
          { nom: "Le propriétaire de marque (DG)", insightCle: "Ne peut pas mesurer la force de sa marque ni justifier le budget", motivations: ["Score /200", "Cult Index", "Value Reports"] },
          { nom: "Le freelance créatif", insightCle: "Briefs vagues, pricing au rabais, pas de progression", motivations: ["Guilde avec tiers", "Briefs qualifiés", "Tarifs structurés", "Apprentissage ADVE"] }
        ],
        tonDeVoix: {
          personnalite: ["Autoritaire", "Visionnaire", "Technologique", "Structurant"],
          onDit: ["Protocole", "Flywheel", "Cult Marketing", "Score ADVE"],
          onNeDitPas: ["Petite agence", "Bricolage", "Feeling créatif"]
        }
      }
    },
    {
      key: "v",
      name: "Valeur",
      status: "COMPLETE",
      content: {
        propositionValeur: "LaFusée est l'encodage numérique des 5 divisions d'UPgraders dans un système où l'ADVE est le protocole pervasif.",
        sacrements: [
          { nom: "L'Oracle", description: "Architecture et stratégie de marque (IMPULSION, Retainer Stratégique)" },
          { nom: "Le Signal", description: "Intelligence marché et production éditoriale (RADAR, The Upgrade)" },
          { nom: "L'Arène", description: "Communauté et événements (Upgraded Brands Club, La Guilde)" },
          { nom: "La Fusée", description: "Technologie, outils, infrastructure (ADVERTIS SaaS, BOOST)" },
          { nom: "L'Académie", description: "Transmission, formation (Certification ADVE)" }
        ]
      }
    },
    {
      key: "e",
      name: "Engagement",
      status: "COMPLETE",
      content: {
        touchpoints: [
          { nom: "Quick Intake", canal: "Web", type: "Acquisition", stadeAarrr: "Acquisition" },
          { nom: "Client Portal (Cockpit)", canal: "Web", type: "Retention", stadeAarrr: "Retention" },
          { nom: "Creator Portal", canal: "Web", type: "Retention", stadeAarrr: "Retention" },
          { nom: "Fixer Console", canal: "Web", type: "Admin", stadeAarrr: "Revenue" }
        ],
        rituels: [
          { nom: "Quick Intake Assessment", frequence: "One-off", description: "Diagnostic en 15 minutes produisant un score ADVE" },
          { nom: "Value Report", frequence: "Mensuel", description: "Rapport automatisé généré par l'Oracle pour le DG" },
          { nom: "Peer Review QC", frequence: "Par mission", description: "Les Maîtres évaluent les Apprentis" }
        ]
      }
    },
    {
      key: "vector",
      name: "Advertis Vector",
      status: "COMPLETE",
      content: {
        a: 22,
        d: 24,
        v: 25,
        e: 20,
        r: 15,
        t: 18,
        i: 20,
        s: 25,
        composite: 169,
        confidence: 0.95
      }
    }
  ];

  for (const p of pillars) {
    await db.pillar.create({
      data: {
        strategyId: strategy.id,
        key: p.key,
        name: p.name,
        status: p.status as any,
        content: p.content,
        progress: 100
      }
    });
  }

  console.log(`✅ Stratégie "La Fusée Advertis" créée avec succès ! ID: ${strategy.id}`);
  console.log("Run the oracle generation script next!");
}

main().catch(console.error).finally(() => db.$disconnect());
