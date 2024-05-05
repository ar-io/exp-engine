import { ZEALY_PROD_URL } from "./constants";
import { runFaucetCron, runAirdropCron } from "./cron";

async function main() {
  await runFaucetCron(false, ZEALY_PROD_URL);
  await runAirdropCron(false, ZEALY_PROD_URL);
}

main().catch(console.error);
