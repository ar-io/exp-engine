import { ZEALY_PROD_URL } from "./constants";
import { runFaucetCron } from "./cron";

async function main() {
  await runFaucetCron(true, ZEALY_PROD_URL);
  // await runAirdropCron(true, ZEALY_PROD_URL);
}

main().catch(console.error);
