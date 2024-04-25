// import { fetchAndSaveCache } from "./ar-io-cache";
//import { calculateArNSScores } from "./exp";
import { airdropTestTokens } from "./ar-io";
import { calculateArNSScores } from "./exp";
import { loadJsonFile, saveJsonToFile } from "./utilities";
import { getLeaderboard, getUserInfo } from "./zealy";
import * as path from "path";

async function main() {
  //console.log ('Fetching and saving the latest ar.io cache');
  // const cache = await fetchAndSaveCache();

  // Load JSON data (simulating here, replace with your actual loading code)
  const cacheFilePath = path.join(
    __dirname,
    "..",
    "data",
    "ar-io-1409122.json"
  );
  const cache = await loadJsonFile(cacheFilePath);

  if (cache) {
    console.log("Analyzing ArNS data and calculating EXP");
    const scores = calculateArNSScores(cache.state.records);
    console.log("Scores: ");
    console.log(scores);
    const fileName = "exp-arns-" + cache.state.lastTickedHeight + ".json";
    saveJsonToFile(scores, fileName);
  }

  let faucetRecipients: { [key: string]: string } = {};
  try {
    const faucetRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      "faucet-recipients.json"
    );
    faucetRecipients = await loadJsonFile(faucetRecipientsFilePath);
  } catch {}
  const data: any = await getLeaderboard();
  for (let i = 0; i < data.data.length; i += 1) {
    const userData: any = await getUserInfo(data.data[i].userId);
    if (userData.xp >= 1000) {
      if (userData.unVerifiedBlockchainAddresses.arweave) {
        const arweaveWallet = userData.unVerifiedBlockchainAddresses.arweave;
        console.log(`User: ${arweaveWallet} with ${userData.xp} XP.`);
        // check if user has already received airdrop
        if (faucetRecipients[arweaveWallet]) {
          console.log("Airdrop already sent");
        } else {
          console.log("Airdropping tIO");
          const airdropTxId = await airdropTestTokens(arweaveWallet);
          faucetRecipients[arweaveWallet] = airdropTxId;
          saveJsonToFile(faucetRecipients, "faucet-recipients.json");
        }
      } else {
        console.log(`No arweave wallet for ${userData.id}`);
      }
    } else {
      console.log(`${userData.id} is not eligible for airdrop`);
    }
  }
}

main().catch(console.error);
