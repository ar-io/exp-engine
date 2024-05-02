import { mintEXP } from "./aoconnect";
import { devKey } from "./apikeys";
import {
  cacheUrl,
  enrichRecords,
  fetchAndSaveState,
  transferTestTokens,
  verifyNameQuests,
} from "./ar-io";
import {
  BASIC_NAME_REWARD,
  BASIC_UNDERNAME_REWARD,
  ROOT_DATA_POINTER_SET_REWARD,
  UNDERNAME_DATA_POINTER_SET_REWARD,
} from "./constants";
import { AirdropList, FaucetRecipient } from "./types";
import {
  getCurrentBlockHeight,
  loadJsonFile,
  saveJsonToFile,
} from "./utilities";
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

export async function runZealyFaucet(dryRun?: boolean) {
  console.log("Running Zealy tIO Faucet");
  const zealyUsers: any = await getLeaderboard();

  let faucetRecipients: { [key: string]: FaucetRecipient } = {};
  let newFaucetRecipients: { [key: string]: FaucetRecipient } = {};
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
          console.log("- Faucet reward already sent");
        } else {
          console.log("- Sending Faucet reward");
          const transferTxId = await transferTestTokens(
            arweaveAddress,
            zealyFaucetAmount,
            dryRun
          );
          faucetRecipients[arweaveAddress] = {
            transferTxId,
            timestamp: Math.floor(Date.now() / 1000),
          };
          newFaucetRecipients[arweaveAddress] =
            faucetRecipients[arweaveAddress];
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

export async function runZealyAirdrop(dryRun?: boolean, enrichedCache?: any) {
  const zealyUsers: any = await getLeaderboard();

  let airdropList: AirdropList;
  try {
    const airdropRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      "airdrop-list.json"
    );
    airdropList = await loadJsonFile(airdropRecipientsFilePath);
  } catch {
    console.log(
      "Airdrop Recipients data is missing.  Ensure airdrop-list.json exists"
    );
    return {};
  }

  let sprintId = 1;
  if (airdropList.lastSprint >= 0) {
    sprintId = airdropList.lastSprint + 1;
    airdropList.lastSprint = sprintId;
  }

  airdropList.lastAirdropTimeStamp = Math.floor(Date.now() / 1000);

  if (!enrichedCache) {
    const blockHeight = await getCurrentBlockHeight();
    const state = await fetchAndSaveState(blockHeight);
    enrichedCache.records = await enrichRecords(cacheUrl, state.records);
  }

  for (let i = 0; i < zealyUsers.length; i += 1) {
    const zealyUser: any = zealyUsers[i];
    if (zealyUser.unVerifiedBlockchainAddresses.arweave) {
      const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
      console.log(
        `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
      );

      // Add a new Wallet user if not created in airdrop list already.
      if (!airdropList.recipients[arweaveAddress]) {
        airdropList.recipients[arweaveAddress] = {
          zealyId: zealyUser.id,
          xpEarned: 0,
          expRewarded: 0,
          categories: {},
          sprintsParticipated: {},
        };
      }

      // check if user has already received airdrop for this sprint
      if (
        airdropList.recipients[arweaveAddress] &&
        airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId]
      ) {
        console.log("EXP Airdrop already sent for this sprint");
      } else if (
        airdropList.recipients[arweaveAddress] &&
        airdropList.recipients[arweaveAddress].zealyId !== zealyUser.id
      ) {
        console.log("This Zealy user is not the initiator of this wallet");
      } else {
        // This must be a new sprint

        console.log(
          "- This Zealy user has not participated in this sprint yet"
        );
        // Verify and reward on chain actions
        let expToReward = 0;
        const nameQuestsCompleted = await verifyNameQuests(
          arweaveAddress,
          enrichedCache.records
        );
        console.log("quests completed: ");
        console.log(nameQuestsCompleted);

        // Check if a name was created
        if (
          nameQuestsCompleted.basicName &&
          !airdropList.recipients[arweaveAddress].categories.basicName
        ) {
          airdropList.recipients[arweaveAddress].categories.basicName = {
            name: nameQuestsCompleted.basicName,
            exp: BASIC_NAME_REWARD,
            awardedOnSprint: sprintId,
          };
          expToReward += BASIC_NAME_REWARD;
        }

        // Check for an undername being created
        if (
          nameQuestsCompleted.basicUndername &&
          !airdropList.recipients[arweaveAddress].categories.basicUndername
        ) {
          airdropList.recipients[arweaveAddress].categories.basicUndername = {
            name: nameQuestsCompleted.basicUndername,
            exp: BASIC_UNDERNAME_REWARD,
            awardedOnSprint: sprintId,
          };
          expToReward += BASIC_UNDERNAME_REWARD;
        }

        // Check for root data pointer being set
        if (
          nameQuestsCompleted.rootDataPointerSet &&
          !airdropList.recipients[arweaveAddress].categories.rootDataPointerSet
        ) {
          airdropList.recipients[arweaveAddress].categories.rootDataPointerSet =
            {
              name: nameQuestsCompleted.rootDataPointerSet,
              exp: ROOT_DATA_POINTER_SET_REWARD,
              awardedOnSprint: sprintId,
            };
          expToReward += ROOT_DATA_POINTER_SET_REWARD;
        }

        // Check for undername data pointer being set
        if (
          nameQuestsCompleted.undernameDataPointerSet &&
          !airdropList.recipients[arweaveAddress].categories
            .undernameDataPointerSet
        ) {
          // Undername data pointer set
          airdropList.recipients[
            arweaveAddress
          ].categories.undernameDataPointerSet = {
            name: nameQuestsCompleted.undernameDataPointerSet,
            exp: UNDERNAME_DATA_POINTER_SET_REWARD,
            awardedOnSprint: sprintId,
          };
          expToReward += UNDERNAME_DATA_POINTER_SET_REWARD;
        }

        // Convert new Zealy XP to EXP
        const currentSprintXp =
          zealyUser.xp - airdropList.recipients[arweaveAddress].xpEarned || 0;
        expToReward += currentSprintXp; // 1 XP = 1 EXP
        airdropList.recipients[arweaveAddress].expRewarded += expToReward;
        airdropList.recipients[arweaveAddress].xpEarned = zealyUser.xp;

        if (expToReward > 0) {
          console.log("- Airdropping EXP");
          const result = await mintEXP(arweaveAddress, expToReward, dryRun);
          airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId] =
            {
              transferTxId: result,
              xpEarned: currentSprintXp,
              expRewarded: expToReward,
              timestamp: Math.floor(Date.now() / 1000),
            };
        } else {
          console.log("- No EXP to airdrop!");
          airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId] =
            {
              transferTxId: "",
              xpEarned: currentSprintXp,
              expRewarded: 0,
              timestamp: Math.floor(Date.now() / 1000),
            };
        }
        saveJsonToFile(airdropList, "airdrop-list.json");
      }
    } else {
      console.log(
        `UserId: ${zealyUser.id} Arweave Wallet: (empty)... skipping`
      );
    }
  }
  // Save any last changes to the .json file
  saveJsonToFile(airdropList, "airdrop-list.json");
  return airdropList;
}

export function calculateTotalXpRewarded(airdropRecipient: any) {
  let totalXpRewarded = 0;
  for (const sprint in airdropRecipient) {
    totalXpRewarded += airdropRecipient[sprint].xpEarned;
  }
  return totalXpRewarded;
}
