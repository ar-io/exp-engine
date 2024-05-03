import { runFaucetCron, runAirdropCron } from "./cron";

async function main() {
  await runFaucetCron(false);
  await runAirdropCron(false);
}

main().catch(console.error);
