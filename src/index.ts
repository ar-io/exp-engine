import { calculateOnChainExpRewards } from "./ar-io";
import { runAirdropCron, runFaucetCron } from "./cron";
import { runZealyAirdrop } from "./zealy";

async function main() {
  console.log("Calculating onchain rewards");
  const { state: enrichedCache } = await calculateOnChainExpRewards(1415082); // including last ticked height here
  //const newFaucetRecipients = await runZealyFaucet(false); // no dry run
  //console.log("New tIO Faucet Recipients: ");
  //console.log(newFaucetRecipients);
  await runFaucetCron();
  await runAirdropCron();
  console.log("Running Zealy EXP Airdrop");
  const newAirdropList = await runZealyAirdrop(true, enrichedCache); // no dry run
  console.log("New EXP Airdrop List: ");
  console.log(newAirdropList);
}

main().catch(console.error);
