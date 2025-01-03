import { chunkAndLoadBalances } from "./aoconnect";
import { loadJsonFile } from "./utilities";
import path from "path";

const recipientsFilePath = path.join(
  __dirname,
  "..",
  "data",
  "chainfeeds-exp-airdrop.json"
);

async function distributeTokens(dryRun = true) {
  const recipientsData = await loadJsonFile(recipientsFilePath);
  // Perform the airdrop
  await chunkAndLoadBalances(recipientsData, dryRun);
}

distributeTokens(true) // set to `true` to dry run
  .then(() => {
    console.log("Token distribution completed.");
  })
  .catch((error) => {
    console.error("An error occurred during the distribution:", error);
  });
