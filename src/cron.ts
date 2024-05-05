import { ZEALY_DEV_URL } from "./constants";
import { runZealyAirdrop, runZealyFaucet } from "./zealy";

// Used for scheduling the jobs
const cron = require("node-cron");

export async function runFaucetCron(
  dryRun?: boolean,
  zealyUrl: string = ZEALY_DEV_URL,
  minutes: number = 15
) {
  console.log(`Running Zealy tIO Faucet every ${minutes} minutes.`);
  cron.schedule(`*/${minutes} * * * *`, function () {
    runZealyFaucet(dryRun, zealyUrl);
  });
}

export async function runAirdropCron(
  dryRun?: boolean,
  zealyUrl: string = ZEALY_DEV_URL
) {
  console.log("Running Zealy EXP Airdrop on Thursday, 12:00 UTC");
  cron.schedule(`0 12 * * 4`, function () {
    runZealyAirdrop(dryRun, zealyUrl);
  });
}
