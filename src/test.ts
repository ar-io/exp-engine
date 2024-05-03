import { loadAndCalculateHistoricalExp } from "./exp";
import { runZealyAirdrop, runZealyFaucet } from "./zealy";

async function main() {
  const { ioState: state } = await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  await runZealyFaucet(true);
  await runZealyAirdrop(true, state);
}

main().catch(console.error);
