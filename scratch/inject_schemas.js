const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/server/services/artemis/frameworks.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add import
if (!content.includes('import * as Schemas from "./framework-schemas";')) {
  content = content.replace(
    'import type { ZodType } from "zod";',
    'import type { ZodType } from "zod";\nimport * as Schemas from "./framework-schemas";'
  );
}

// 2. Inject outputSchema
const fwNames = [
  "BrandArcheology", "PersonaConstellation", "HeroJourneyAudit",
  "ValueArchitecture", "PricingPsychology", "UnitEconomics",
  "TouchpointMapping", "RitualDesign", "DevotionPathway",
  "AttributionModel", "BrandMarketFit", "TamSamSom",
  "Roadmap90Day", "CampaignArchitecture", "TeamBlueprint",
  "KpiFramework", "CohortAnalysis", "GrowthLoops",
  "ExpansionStrategy", "BrandEvolution", "InnovationPipeline",
  "RiskMatrix", "CrisisPlaybook", "CompetitiveDefense",
  "BerkusTeam", "BerkusTraction", "BerkusProduct", "BerkusIp"
];

for (let i = 1; i <= 28; i++) {
  const fwNum = i.toString().padStart(2, '0');
  const schemaName = `Fw${fwNum}${fwNames[i-1]}Schema`;
  
  // Find the block for this framework
  // Look for: slug: "fw-XX-..."
  const slugRegex = new RegExp(`slug: "fw-${fwNum}-[^"]*",`);
  const match = content.match(slugRegex);
  
  if (match) {
    // Find the promptTemplate for this framework
    // Since it's a template string, it ends with `,` or `}`
    // Let's use a regex that captures from the slug to the end of promptTemplate
    
    // Easier way: split by the slug, then within the second part, find the end of promptTemplate
    const parts = content.split(match[0]);
    if (parts.length > 1) {
      // Find `},\n  {` or `}\n];` after the promptTemplate
      // The promptTemplate ends with `,` followed by a newline and `  },`
      const endRegex = /(promptTemplate: `[\s\S]*?`)(,?)(?=\s*\n\s*}(,|;))/;
      
      const promptMatch = parts[1].match(endRegex);
      if (promptMatch && !parts[1].includes(`outputSchema: Schemas.${schemaName}`)) {
        parts[1] = parts[1].replace(
          promptMatch[1] + promptMatch[2],
          promptMatch[1] + ',\n    outputSchema: Schemas.' + schemaName
        );
        content = parts.join(match[0]);
      }
    }
  }
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Schemas injected successfully!');
