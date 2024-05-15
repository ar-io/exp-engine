import { loadBalances } from "./aoconnect";
import { devKey, prodKey } from "./apikeys";
import {
  fetchSaveAndEnrichIOState,
  transferTestTokens,
  verifyNameQuests,
} from "./ar-io";
import {
  BASIC_NAME_REWARD,
  BASIC_UNDERNAME_REWARD,
  FAUCET_QUANTITY,
  MIN_FAUCET_XP,
  ROOT_DATA_POINTER_SET_REWARD,
  UNDERNAME_DATA_POINTER_SET_REWARD,
  ZEALY_DEV_URL,
  honeyPotQuestId,
} from "./constants";
import { AirdropList, Balances, FaucetRecipient } from "./types";
import {
  getCurrentBlockHeight,
  isArweaveAddress,
  loadJsonFile,
  loadCachedZealyUserInfo,
  saveJsonToFile,
  loadCachedBannedZealyUsers,
} from "./utilities";
import path from "path";

export async function getLeaderboard(zealyUrl: string) {
  console.log("Getting Zealy Leaderboard from", zealyUrl);
  let totalPages = 1;
  let currentPage = 0;
  let zealyUserInfo = await loadCachedZealyUserInfo();
  while (currentPage <= totalPages) {
    currentPage += 1;
    const response = await fetch(
      `${zealyUrl}/leaderboard?page=${currentPage}&limit=500`,
      {
        method: "GET",
        headers: { "x-api-key": devKey },
      }
    );
    const data: any = await response.json();
    for (let i = 0; i < data.data.length; i += 1) {
      if (!zealyUserInfo[data.data[i].userId]) {
        console.log("User not found in local cache: ", data.data[i].userId);
        const userData: any = await getUserInfo(data.data[i].userId, zealyUrl);
        zealyUserInfo[data.data[i].userId] = userData;
      }
    }
    totalPages = data.totalPages;
  }
  saveJsonToFile(zealyUserInfo, `zealy-user-info.json`);
  return zealyUserInfo;
}

export async function getUserInfo(zealyUserId: string, zealyUrl: string) {
  const response = await fetch(`${zealyUrl}/users/${zealyUserId}`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  return await response.json();
}

export async function getHoneyPotUsers(zealyUrl: string) {
  let currentCursor = "";
  const zealyBannedUserArray: any[] = [];

  while (true) {
    const response = await fetch(
      `${zealyUrl}/reviews?questId=${honeyPotQuestId}&cursor=${currentCursor}`,
      {
        method: "GET",
        headers: { "x-api-key": devKey },
      }
    );

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === honeyPotQuestId &&
        data.items[i].status === "success"
      ) {
        zealyBannedUserArray.push(data.items[i].user.id);
      }
    }
    if (data.nextCursor !== null) {
      currentCursor = data.nextCursor;
    } else {
      break;
    }
  }
  return zealyBannedUserArray;
}

export async function banZealyUsers(dryRun: boolean = true, zealyUrl: string) {
  const banReason = "Banned for eating the honey";
  const zealyUsersToBan = await getHoneyPotUsers(zealyUrl);
  console.log("Got honey pot users");
  const bannedZealyUsers = await loadCachedBannedZealyUsers();
  console.log("Loaded cached banned users");
  const zealyUserInfo = await loadCachedZealyUserInfo();
  console.log("Loaded rest of zealy users");

  for (const bannedZealyUser of zealyUsersToBan) {
    if (dryRun === false) {
      try {
        if (!bannedZealyUsers[bannedZealyUser]) {
          console.log(`Banning: ${bannedZealyUser}`);
          await fetch(`${zealyUrl}/users/${bannedZealyUser}/ban`, {
            method: "POST",
            headers: {
              "x-api-key": prodKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reason: banReason,
            }),
          });
          bannedZealyUsers[bannedZealyUser] = banReason;
        } else {
          console.log(`Already banned: ${bannedZealyUser}`);
        }

        if (zealyUserInfo[bannedZealyUser]) {
          console.log(
            "Updating cached Zealy user status for: ",
            bannedZealyUser
          );
          zealyUserInfo[bannedZealyUser].isBanned = true;
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log(`Dry Run Banning: ${bannedZealyUser}`);
      bannedZealyUsers[bannedZealyUser] = banReason;
    }
  }

  if (!dryRun) {
    await Promise.all([
      saveJsonToFile(zealyUserInfo, `zealy-user-info.json`),
      saveJsonToFile(bannedZealyUsers, `banned-zealy-users.json`),
    ]);
  }
  return bannedZealyUsers;
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

  for (const zealyId in zealyUsers) {
    const zealyUser: any = zealyUsers[zealyId];
    if (zealyUser.xp >= MIN_FAUCET_XP && zealyUser.isBanned === false) {
      if (
        zealyUser.unVerifiedBlockchainAddresses.arweave &&
        isArweaveAddress(zealyUser.unVerifiedBlockchainAddresses.arweave)
      ) {
        const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
        //console.log(
        //  `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
        //);
        // check if user has already received airdrop
        let receivedAirdrop = false;
        if (faucetRecipients[arweaveAddress]) {
          receivedAirdrop = true;
        }

        for (const key in faucetRecipients) {
          if (faucetRecipients[key].zealyId === zealyId) {
            receivedAirdrop = true;
            continue;
          }
        }

        if (!receivedAirdrop) {
          //console.log("- Sending Faucet reward");
          const transferTxId = await transferTestTokens(
            arweaveAddress,
            FAUCET_QUANTITY,
            dryRun
          );
          faucetRecipients[arweaveAddress] = {
            zealyId: zealyId,
            transferTxId,
            timestamp: Math.floor(Date.now() / 1000),
          };
          newFaucetRecipients[arweaveAddress] =
            faucetRecipients[arweaveAddress];
          saveJsonToFile(faucetRecipients, "faucet-recipients.json");
        } else {
          // console.log("- Faucet reward already sent");
        }
      } else {
        console.log(`UserId: ${zealyId} Arweave Wallet: (empty)... skipping`);
      }
    } else {
      // console.log(`${zealyUser.id} is not eligible for faucet reward`);
    }
  }
  console.log(
    `Airdropped tIO to ${Object.keys(newFaucetRecipients).length} users`
  );
  return newFaucetRecipients;
}

export async function runZealyAirdrop(
  dryRun?: boolean,
  zealyUrl: string = ZEALY_DEV_URL,
  enrichedCache?: any
) {
  console.log("Running Zealy EXP Airdrop");
  let balancesList: Balances = {};
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
    console.log("Fetching an enriching AR.IO State");
    const blockHeight = await getCurrentBlockHeight();
    enrichedCache = await fetchSaveAndEnrichIOState(blockHeight);
  }

  for (const zealyId in zealyUsers) {
    const zealyUser: any = zealyUsers[zealyId];
    if (zealyUser.unVerifiedBlockchainAddresses.arweave) {
      const arweaveAddress = zealyUser.unVerifiedBlockchainAddresses.arweave;
      //console.log(
      //  `UserId: ${zealyUser.id} Arweave Wallet: ${arweaveAddress} XP: ${zealyUser.xp}`
      //);

      // Add a new Wallet user if not created in airdrop list already.
      if (!airdropList.recipients[arweaveAddress]) {
        airdropList.recipients[arweaveAddress] = {
          zealyId: zealyId,
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
        console.log(
          `Zealy EXP Airdrop already sent to ${arweaveAddress} for this sprint ${sprintId}`
        );
      } else if (
        airdropList.recipients[arweaveAddress] &&
        airdropList.recipients[arweaveAddress].zealyId !== "" &&
        airdropList.recipients[arweaveAddress].zealyId !== zealyId
      ) {
        console.log("This Zealy user is not the initiator of this wallet");
      } else if (zealyUsers[zealyId] && zealyUsers[zealyId].isBanned === true) {
        console.log(`This Zealy user is banned: `, zealyId);
      } else {
        // This must be a new sprint
        // Verify and reward on chain actions
        let expToReward = 0;
        const nameQuestsCompleted = verifyNameQuests(
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
        airdropList.recipients[arweaveAddress].zealyId = zealyId;

        if (expToReward > 0) {
          airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId] =
            {
              transferTxId: "",
              xpEarned: currentSprintXp,
              expRewarded: expToReward,
              timestamp: Math.floor(Date.now() / 1000),
            };
          balancesList[arweaveAddress] = expToReward;
        } else {
          // console.log(
          //   "- User earned no XP since last sprint. No EXP to airdrop!"
          // );
          airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId] =
            {
              transferTxId: "",
              xpEarned: currentSprintXp,
              expRewarded: 0,
              timestamp: Math.floor(Date.now() / 1000),
            };
        }
      }
    } else {
      console.log(`UserId: ${zealyId} Arweave Wallet: (empty)... skipping`);
    }
  }

  saveJsonToFile(airdropList, "airdrop-list.json");

  // Perform the airdrop
  const result = await loadBalances(balancesList, dryRun);

  // Update the airdroplist
  for (const recipient in airdropList.recipients) {
    if (
      airdropList.recipients[recipient].sprintsParticipated[sprintId] &&
      airdropList.recipients[recipient].sprintsParticipated[sprintId]
        .expRewarded > 0
    ) {
      airdropList.recipients[recipient].sprintsParticipated[
        sprintId
      ].transferTxId = result;
    }
  }

  // Save any last changes to the .json file
  saveJsonToFile(airdropList, "airdrop-list.json");
  console.log("Zealy EXP Airdrop complete");
  return airdropList;
}
