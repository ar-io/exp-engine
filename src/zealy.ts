import { devKey } from "./apikeys";
import { transferTestTokens } from "./ar-io";
import { loadJsonFile, saveJsonToFile } from "./utilities";
import path from "path";

const zealy = "https://api-v2.zealy.io/public/communities/";
const zealyFaucetAmount = 1000;

// const zealyProd = zealy + 'ar-io'
// const zealyTest = zealy + 'theawesomecommunity'
const zealyDev = zealy + "theblackfox";
export async function getLeaderboard() {
  const response = await fetch(`${zealyDev}/leaderboard`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  const data: any = await response.json();
  const zealyUserArray: any[] = [];
  for (let i = 0; i < data.data.length; i += 1) {
    const userData: any = await getUserInfo(data.data[i].userId);
    zealyUserArray.push(userData);
  }
  return zealyUserArray;
}

export async function getUserInfo(zealyUserId: string) {
  const response = await fetch(`${zealyDev}/users/${zealyUserId}`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  return await response.json();
}

export async function runZealyFaucet() {
  const zealyUsers: any = await getLeaderboard();

  let faucetRecipients: { [key: string]: string } = {};
  let newFaucetRecipients: { [key: string]: string } = {};
  try {
    const faucetRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      "faucet-recipients.json"
    );
    faucetRecipients = await loadJsonFile(faucetRecipientsFilePath);
  } catch {
    console.log(
      "Faucet Recipients data is missing.  Ensure faucet-recipients.json exists"
    );
    return {};
  }

  for (let i = 0; i < zealyUsers.length; i += 1) {
    const zealyUser: any = zealyUsers[i];
    if (zealyUser.xp >= 1000) {
      if (zealyUser.unVerifiedBlockchainAddresses.arweave) {
        const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
        console.log(
          `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
        );
        // check if user has already received airdrop
        if (faucetRecipients[arweaveAddress]) {
          console.log("Airdrop already sent");
        } else {
          console.log("Airdropping tIO");
          const transferTxId = await transferTestTokens(
            arweaveAddress,
            zealyFaucetAmount
          );
          faucetRecipients[arweaveAddress] = transferTxId;
          newFaucetRecipients[arweaveAddress] = transferTxId;
          saveJsonToFile(faucetRecipients, "faucet-recipients.json");
        }
      } else {
        console.log(`No arweave wallet for ${zealyUser.id}`);
      }
    } else {
      console.log(`${zealyUser.id} is not eligible for airdrop`);
    }
  }

  return newFaucetRecipients;
}
