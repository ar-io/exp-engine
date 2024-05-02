import { runFaucetCron, runAirdropCron } from "./cron";
import { loadAndCalculateHistoricalExp } from "./exp";
import { runZealyAirdrop } from "./zealy";

async function main() {
  const { scores: scores, ioState: state } =
    await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  console.log(`Historical Exp Recipients: ${Object.keys(scores).length}`);

  //const newFaucetRecipients = await runZealyFaucet(false); // no dry run
  //console.log("New tIO Faucet Recipients: ");
  //console.log(newFaucetRecipients);
  await runFaucetCron(true);
  await runAirdropCron(true);
  //const state = await loadJsonStateFile(1415082);
  await runZealyAirdrop(true, state);
}

main().catch(console.error);
