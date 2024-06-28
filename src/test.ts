import { ZEALY_PROD_URL } from "./constants";
import { runZealyFaucet } from "./zealy";

async function main() {
  await runZealyFaucet(true, ZEALY_PROD_URL);
  // await banZealyUsers(true, ZEALY_PROD_URL);
  // await runZealyAirdrop(true, ZEALY_PROD_URL);
}

main().catch(console.error);
