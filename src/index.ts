import { calculateOnChainExpRewards } from "./ar-io";
import { runZealyAirdrop, runZealyFaucet } from "./zealy";

async function main() {
  console.log("Calculating onchain rewards");
  const onchainRewards = await calculateOnChainExpRewards(1411738); // including last ticked height here
  console.log("Onchain Rewards: ");
  console.log(onchainRewards);
  console.log("Running Zealy tIO Faucet");
  const newFaucetRecipients = await runZealyFaucet(true);
  console.log("New tIO Faucet Recipients: ");
  console.log(newFaucetRecipients);
  console.log("Running Zealy EXP Airdrop");
  const newAirdropRecipients = await runZealyAirdrop("sprint2", true);
  console.log("New EXP Airdrop Recipients: ");
  console.log(newAirdropRecipients);
}

main().catch(console.error);
