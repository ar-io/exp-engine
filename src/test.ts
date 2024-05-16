import { loadAndCalculateHistoricalExp } from "./exp";

async function main() {
  // const { /*scores: data*/ ioState: state } =
  await loadAndCalculateHistoricalExp(1415082); // including last ticked height here
  // await runHistoricalAirdrop(true, "exp-balances-1415082.json");
  // await runZealyFaucet(true, ZEALY_PROD_URL);
  // const bannedZealyUsers = await banZealyUsers(true, ZEALY_PROD_URL,);
  // console.log(bannedZealyUsers.length);
  // await runZealyAirdrop(true, ZEALY_PROD_URL);
}

main().catch(console.error);
