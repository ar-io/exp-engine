import { ZEALY_PROD_URL } from "./constants";
import { runZealyAirdrop } from "./zealy";

// import { reviewUseThePermawebModule } from "./zealy";

async function main() {
  // await airdropTestTokens(true, "Upgraded-AO-Gateways.json");
  // await airdropExpTokens(true, "Upgraded-AO-Gateways.json");
  // await runZealyFaucet(true, ZEALY_PROD_URL);
  // await banZealyUsers(true, ZEALY_PROD_URL);
  // await reviewUseThePermawebModule(true, ZEALY_PROD_URL);
  await runZealyAirdrop(true, ZEALY_PROD_URL);
}

main().catch(console.error);
