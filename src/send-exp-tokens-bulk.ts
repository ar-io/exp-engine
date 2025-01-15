import { chunkAndLoadBalances } from "./aoconnect";
import { loadJsonFile } from "./utilities";
import path from "path";

const recipientsFilePath = path.join(
  __dirname,
  "..",
  "data",
  "finalScores_2025-01-15T20-12-52-414Z.json"
);

async function distributeTokens(dryRun = true) {
  const recipientsData = await loadJsonFile(recipientsFilePath);
  // Perform the airdrop
  await chunkAndLoadBalances(recipientsData, dryRun);
}

distributeTokens(false) // set to `true` to dry run
  .then(() => {
    console.log("Token distribution completed.");
  })
  .catch((error) => {
    console.error("An error occurred during the distribution:", error);
  });
