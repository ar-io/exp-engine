import { runZealyAirdrop, runZealyFaucet } from "./zealy";

// Used for scheduling the jobs
const cron = require("node-cron");

export async function runFaucetCron(minutes: number = 30) {
  // Run the faucet first, then schedule every 15 minutes
  await runZealyFaucet(false);
  console.log(`Running Zealy tIO Faucet every ${minutes} minutes.`);
  cron.schedule(`*/${minutes} * * * *`, function () {
    runZealyFaucet(false);
  });
}

export async function runAirdropCron() {
  console.log("Running Zealy EXP Airdrop on Thursday, 12:00 UTC");
  cron.schedule(`0 12 * * 4`, function () {
    runZealyAirdrop(true);
  });
}
