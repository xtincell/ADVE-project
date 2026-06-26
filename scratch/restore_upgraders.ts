import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";

async function main() {
  const strategyId = "cmqsimrc6000004jpjiw29mmc";
  const strategy = await db.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) {
    console.error("Strategy UP.graders not found!");
    return;
  }

  const restoredCtx = {
    sector: "Agence-opérateur de marque / Industry OS",
    country: "Cameroun",
    businessModel: "SERVICE",
    positioningArchetype: "PREMIUM_ACCESSIBLE",
    bootState: "COMPLETED"
  };

  await db.strategy.update({
    where: { id: strategyId },
    data: {
      countryCode: "CM",
      description: "ADVE de la marque ombrelle UPgraders — la société/agence-opérateur qui construit et opère La Fusée + Argos (séparation société ≠ produit, décision 2026-06-24).",
      businessContext: restoredCtx
    }
  });

  console.log("UP.graders strategy metadata restored successfully!");
}

main().catch(console.error);
