import { calculateHistoricalExpRewards } from "./ar-io";

async function main() {
  await calculateHistoricalExpRewards(1415082); // including last ticked height here
  //const newFaucetRecipients = await runZealyFaucet(false); // no dry run
  //console.log("New tIO Faucet Recipients: ");
  //console.log(newFaucetRecipients);
  // await runFaucetCron();
  // await runAirdropCron();
  // await runZealyAirdrop(true, enrichedCache);
}

main().catch(console.error);
