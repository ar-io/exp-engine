import { transferEXP } from "./aoconnect";
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

export async function runZealyFaucet(dryRun: boolean) {
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
          console.log("Faucet reward already sent");
        } else {
          console.log("Sending Faucet reward");
          const transferTxId = await transferTestTokens(
            arweaveAddress,
            zealyFaucetAmount,
            dryRun
          );
          faucetRecipients[arweaveAddress] = transferTxId;
          newFaucetRecipients[arweaveAddress] = transferTxId;
          saveJsonToFile(faucetRecipients, "faucet-recipients.json");
        }
      } else {
        console.log(
          `UserId: ${zealyUser.id} Arweave Wallet: (empty)... skipping`
        );
      }
    } else {
      console.log(`${zealyUser.id} is not eligible for faucet reward`);
    }
  }

  return newFaucetRecipients;
}

export async function runZealyAirdrop(sprintId: string, dryRun: boolean) {
  const zealyUsers: any = await getLeaderboard();

  let airdropRecipients: {
    [key: string]: {
      [sprint: string]: {
        xpEarned: number;
        expRewarded: number;
        transferTxId: string;
      };
    };
  } = {};
  let newAirdropRecipients: {
    [key: string]: {
      [sprint: string]: {
        xpEarned: number;
        expRewarded: number;
        transferTxId: string;
      };
    };
  } = {};

  try {
    const airdropRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      "airdrop-recipients.json"
    );
    airdropRecipients = await loadJsonFile(airdropRecipientsFilePath);
  } catch {
    console.log(
      "Airdrop Recipients data is missing.  Ensure airdrop-recipients.json exists"
    );
    return {};
  }

  for (let i = 0; i < zealyUsers.length; i += 1) {
    const zealyUser: any = zealyUsers[i];
    if (zealyUser.unVerifiedBlockchainAddresses.arweave) {
      const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
      console.log(
        `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
      );

      // check if user has already received airdrop for this sprint
      if (
        airdropRecipients[arweaveAddress] &&
        airdropRecipients[arweaveAddress][sprintId]
      ) {
        console.log("EXP Airdrop already sent for this sprint");
      } else {
        if (!airdropRecipients[arweaveAddress]) {
          airdropRecipients[arweaveAddress] = {};
        }

        // Verify on chain actions TO DO

        console.log("Airdropping EXP");
        const currentTotalXpRewarded = calculateTotalXpRewarded(
          airdropRecipients[arweaveAddress]
        );
        const xpToReward = zealyUser.xp - currentTotalXpRewarded;
        const expToReward = xpToReward / 10;
        const result = await transferEXP(arweaveAddress, expToReward, dryRun);
        airdropRecipients[arweaveAddress][sprintId] = {
          transferTxId: result,
          xpEarned: zealyUser.xp,
          expRewarded: expToReward,
        };
        newAirdropRecipients[arweaveAddress] =
          airdropRecipients[arweaveAddress];
        saveJsonToFile(airdropRecipients, "airdrop-recipients.json");
      }
    } else {
      console.log(
        `UserId: ${zealyUser.id} Arweave Wallet: (empty)... skipping`
      );
    }
  }
  return newAirdropRecipients;
}

export function calculateTotalXpRewarded(airdropRecipient: any) {
  let totalXpRewarded = 0;
  for (const sprint in airdropRecipient) {
    totalXpRewarded += airdropRecipient[sprint].xpEarned;
  }
  return totalXpRewarded;
}
