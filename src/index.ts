import { calculateOnChainExpRewards } from "./ar-io";
import { runZealyFaucet } from "./zealy";

async function main() {
  const onchainRewards = await calculateOnChainExpRewards(1411738); // including last ticked height here
  console.log("Onchain Rewards: ");
  console.log(onchainRewards);
  const faucetRecipients = await runZealyFaucet();
  console.log("Faucet Recipients: ");
  console.log(faucetRecipients);
}

main().catch(console.error);
