import { ZEALY_PROD_URL } from "./constants";
import { loadAndCalculateHistoricalExp } from "./exp";
import { getUserBanStatus, runZealyFaucet } from "./zealy";

async function main() {
  const bannedZealyUsers = await getUserBanStatus(ZEALY_PROD_URL);
  console.log(bannedZealyUsers.length);
  const {
    /*scores: data ioState: state*/
  } = await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  // await runHistoricalAirdrop(false, "exp-balances-1415082.json");
  await runZealyFaucet(true, ZEALY_PROD_URL);
  // await runZealyAirdrop(true, state, ZEALY_PROD_URL);
}

main().catch(console.error);
