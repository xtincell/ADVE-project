import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSequence } from "../src/server/services/artemis/tools/sequences";
import { checkPrerequisites } from "../src/server/services/sequence-vault";

async function main() {
  const strategyId = "cmqsimrc6000004jpjiw29mmc"; // UP.graders ID from DB check
  const seqKey = "MANIFESTE-A";
  
  const seq = getSequence(seqKey);
  if (!seq) {
    console.error("Sequence not found");
    return;
  }
  
  const requires = seq.requires ?? [];
  console.log("Sequence definition requires:", JSON.stringify(requires, null, 2));
  
  const check = await checkPrerequisites(strategyId, requires as any);
  console.log("Check result:", JSON.stringify(check, null, 2));
}

main().catch(console.error);
