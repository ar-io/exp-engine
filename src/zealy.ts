import { mintEXP } from "./aoconnect";
import { devKey } from "./apikeys";
import {
  enrichRecords,
  fetchAndSaveIOState,
  transferTestTokens,
  verifyNameQuests,
} from "./ar-io";
import {
  BASIC_NAME_REWARD,
  BASIC_UNDERNAME_REWARD,
  CACHE_URL,
  FAUCET_QUANTITY,
  MIN_FAUCET_XP,
  ROOT_DATA_POINTER_SET_REWARD,
  UNDERNAME_DATA_POINTER_SET_REWARD,
  ZEALY_DEV_URL,
} from "./constants";
import { AirdropList, FaucetRecipient } from "./types";
import {
  getCurrentBlockHeight,
  isArweaveAddress,
  loadJsonFile,
  saveJsonToFile,
} from "./utilities";
import path from "path";

export async function getLeaderboard(zealyUrl: string) {
  const response = await fetch(`${zealyUrl}/leaderboard`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  const data: any = await response.json();
  const zealyUserArray: any[] = [];
  for (let i = 0; i < data.data.length; i += 1) {
    const userData: any = await getUserInfo(data.data[i].userId, zealyUrl);
    zealyUserArray.push(userData);
  }
  return zealyUserArray;
}

export async function getUserInfo(zealyUserId: string, zealyUrl: string) {
  const response = await fetch(`${zealyUrl}/users/${zealyUserId}`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  return await response.json();
}

export async function runZealyFaucet(
  dryRun?: boolean,
  zealyUrl: string = ZEALY_DEV_URL
) {
  console.log("Running Zealy tIO Faucet");
  const zealyUsers: any = await getLeaderboard(zealyUrl);

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
    if (zealyUser.xp >= MIN_FAUCET_XP) {
      if (
        zealyUser.unVerifiedBlockchainAddresses.arweave &&
        isArweaveAddress(zealyUser.unVerifiedBlockchainAddresses.arweave)
      ) {
        const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
        console.log(
          `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
        );
        // check if user has already received airdrop
        let receivedAirdrop = false;
        if (faucetRecipients[arweaveAddress]) {
          receivedAirdrop = true;
        }

        for (const key in faucetRecipients) {
          if (faucetRecipients[key].zealyId === zealyUser.id) {
            receivedAirdrop = true;
            continue;
          }
        }

        if (!receivedAirdrop) {
          console.log("- Sending Faucet reward");
          const transferTxId = await transferTestTokens(
            arweaveAddress,
            FAUCET_QUANTITY,
            dryRun
          );
          faucetRecipients[arweaveAddress] = {
            zealyId: zealyUser.id,
            transferTxId,
            timestamp: Math.floor(Date.now() / 1000),
          };
          newFaucetRecipients[arweaveAddress] =
            faucetRecipients[arweaveAddress];
          saveJsonToFile(faucetRecipients, "faucet-recipients.json");
        } else {
          console.log("- Faucet reward already sent");
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

export async function runZealyAirdrop(
  dryRun?: boolean,
  enrichedCache?: any,
  zealyUrl: string = ZEALY_DEV_URL
) {
  const zealyUsers: any = await getLeaderboard(zealyUrl);

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
    const state = await fetchAndSaveIOState(blockHeight);
    enrichedCache.records = await enrichRecords(CACHE_URL, state.records);
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

      // TODO: ensure user cannot "double dip" with different wallet and same zealy id.
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

        // Check if a name was created
        if (
          nameQuestsCompleted.basicName &&
          !airdropList.recipients[arweaveAddress].categories.basicName
        ) {
          airdropList.recipients[arweaveAddress].categories.basicName = {
            value: nameQuestsCompleted.basicName,
            exp: BASIC_NAME_REWARD,
            awardedOnSprint: sprintId,
          };
          expToReward += BASIC_NAME_REWARD;
        }

        // Check for an undername being created
        if (
          nameQuestsCompleted.multipleUndernames &&
          !airdropList.recipients[arweaveAddress].categories.multipleUndernames
        ) {
          airdropList.recipients[arweaveAddress].categories.multipleUndernames =
            {
              value: nameQuestsCompleted.multipleUndernames,
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
              value: nameQuestsCompleted.rootDataPointerSet,
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
            value: nameQuestsCompleted.undernameDataPointerSet,
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
          console.log(
            "- User earned no XP since last sprint. No EXP to airdrop!"
          );
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
