import { ZEALY_PROD_URL } from "./constants";
import { loadAndCalculateHistoricalExp } from "./exp";
import { runZealyAirdrop, runZealyFaucet } from "./zealy";

async function main() {
  const { /*scores: data*/ ioState: state } =
    await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  // await runHistoricalAirdrop(true, "exp-balances-1415082.json");
  await runZealyFaucet(true, ZEALY_PROD_URL);
  //const bannedZealyUsers = await banZealyUsers(ZEALY_PROD_URL, false);
  // console.log(bannedZealyUsers.length);
  await runZealyAirdrop(true, state, ZEALY_PROD_URL);
}

main().catch(console.error);
