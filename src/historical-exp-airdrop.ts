import { loadAndCalculateHistoricalExp, runHistoricalAirdrop } from "./exp";

const snapshotHeight = 1415082;
async function main() {
  await loadAndCalculateHistoricalExp(snapshotHeight); // including last ticked height here
  await runHistoricalAirdrop(true, `exp-balances-${snapshotHeight}.json`); // dryrun is true by default
}

main().catch(console.error);
