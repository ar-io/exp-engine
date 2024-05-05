import { ZEALY_PROD_URL } from "./constants";
import { loadAndCalculateHistoricalExp } from "./exp";
import { runZealyAirdrop, runZealyFaucet } from "./zealy";

async function main() {
  const { ioState: state } = await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  await runZealyFaucet(true, ZEALY_PROD_URL);
  await runZealyAirdrop(true, state, ZEALY_PROD_URL);
}

main().catch(console.error);
