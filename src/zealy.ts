import { chunkAndLoadBalances } from "./aoconnect";
import { devKey, prodKey } from "./apikeys";
import { transferTestTokens } from "./ar-io";
import {
  EXP_DENOMINATION,
  FAUCET_MTIO_QUANTITY,
  ZEALY_DEV_URL,
  faucetQuestId,
  honeyPotQuestId,
} from "./constants";
import { AirdropList, Balances, FaucetRecipient } from "./types";
import {
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
  let totalLeaderboardUsers = 0;
  let totalNotFoundLocally = 0;
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
      totalLeaderboardUsers += 1;
      if (!zealyUserInfo[data.data[i].userId]) {
        totalNotFoundLocally += 1;
        console.log("User not found in local cache: ", data.data[i].userId);
        const userData: any = await getUserInfo(data.data[i].userId, zealyUrl);
        zealyUserInfo[data.data[i].userId] = userData;
      } else {
        zealyUserInfo[data.data[i].userId].xp = data.data[i].xp;
      }
    }
    totalPages = data.totalPages;
  }
  console.log("Total Users Found on Leaderboard: ", totalLeaderboardUsers);
  console.log("Total users synced to local cache: ", totalNotFoundLocally);
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
  console.log("Getting Zealy Honey eaters");
  let currentCursor;
  const zealyBannedUserArray: any[] = [];

  while (true) {
    let response;
    if (currentCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${honeyPotQuestId}&cursor=${currentCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": devKey },
        }
      );
    } else {
      response = await fetch(`${zealyUrl}/reviews?questId=${honeyPotQuestId}`, {
        method: "GET",
        headers: { "x-api-key": devKey },
      });
    }

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

  let bannedZealyUserCount = 0;
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
          bannedZealyUserCount += 1;
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
      bannedZealyUserCount += 1;
      bannedZealyUsers[bannedZealyUser] = banReason;
    }
  }

  console.log(`Banned ${bannedZealyUserCount} new users`);
  if (!dryRun) {
    await Promise.all([
      saveJsonToFile(zealyUserInfo, `zealy-user-info.json`),
      saveJsonToFile(bannedZealyUsers, `banned-zealy-users.json`),
    ]);
  }
  return bannedZealyUsers;
}

export async function getFaucetQuestUsers(zealyUrl: string) {
  console.log("Getting Faucet Quest Users");
  let currentCursor;
  const zealyFaucetUsers: any[] = [];

  while (true) {
    let response;
    if (currentCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${faucetQuestId}&cursor=${currentCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": devKey },
        }
      );
    } else {
      response = await fetch(`${zealyUrl}/reviews?questId=${faucetQuestId}`, {
        method: "GET",
        headers: { "x-api-key": devKey },
      });
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === faucetQuestId &&
        data.items[i].status === "success"
      ) {
        zealyFaucetUsers.push(data.items[i].user.id);
      }
    }
    if (data.nextCursor !== null) {
      currentCursor = data.nextCursor;
    } else {
      break;
    }
  }
  console.log(
    `Found ${zealyFaucetUsers.length} users who completed Faucet Quest`
  );
  return zealyFaucetUsers;
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

  const faucetQuestUsers = await getFaucetQuestUsers(zealyUrl);
  for (const zealyId of faucetQuestUsers) {
    const zealyUser: any = zealyUsers[zealyId];
    if (zealyUser && zealyUser.isBanned === false) {
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
            FAUCET_MTIO_QUANTITY,
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
        console.log(
          `UserId: ${zealyId} Arweave Wallet: (empty)... skipping for faucet`
        );
      }
    } else {
      console.log(`${zealyId} is not eligible for faucet reward`);
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
  let skippedUsers = 0;
  let duplicateWallet = 0;
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

  // setup a new sprint in the airdrop list
  let sprintId = 1;
  if (airdropList.lastSprint >= 0) {
    sprintId = airdropList.lastSprint + 1;
    airdropList.lastSprint = sprintId;
  }
  airdropList.lastAirdropTimeStamp = Math.floor(Date.now() / 1000);

  // enrich the arns registry by adding information about every single ANT registered, including ownership and undernames
  if (!enrichedCache) {
    // console.log("Fetching an enriching AR.IO State");
    // const blockHeight = await getCurrentBlockHeight();
    // enrichedCache = await fetchSaveAndEnrichIOState(blockHeight);
  }

  // calculate how much exp to award each zealy user based on their current xp and previous exp that has already been rewarded
  for (const zealyId in zealyUsers) {
    const zealyUser: any = zealyUsers[zealyId];
    if (
      zealyUser.unVerifiedBlockchainAddresses.arweave &&
      isArweaveAddress(zealyUser.unVerifiedBlockchainAddresses.arweave)
    ) {
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
        duplicateWallet += 1;
        //console.log(
        //  `Zealy EXP Airdrop already sent to ${arweaveAddress} for this sprint ${sprintId}`
        //);
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

        /*
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
        } */

        // Convert new Zealy XP to EXP
        const currentSprintXp =
          zealyUser.xp - airdropList.recipients[arweaveAddress].xpEarned || 0;
        //console.log(
        //  `${zealyId}: Current sprint XP: ${currentSprintXp} total XP: ${zealyUser.xp}`
        //);

        expToReward += currentSprintXp * EXP_DENOMINATION; // 1 XP = 1,000,000 EXP with a Denomination of 6
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
      skippedUsers += 1;
      // console.log(`UserId: ${zealyId} Arweave Wallet: (empty)... skipping`);
    }
  }

  // Save results of the airdrop as a new sprint in the airdrop-list
  if (dryRun) {
    saveJsonToFile(airdropList, "airdrop-list-dryrun.json");
  } else {
    saveJsonToFile(airdropList, "airdrop-list.json");
  }

  // Perform the airdrop
  const result = await chunkAndLoadBalances(balancesList, dryRun);

  // Update the airdroplist with the result message id from loading all balances
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
  if (dryRun) {
    saveJsonToFile(airdropList, `airdrop-list-dryrun.json`); // master json
    saveJsonToFile(airdropList, `airdrop-list-${sprintId}-dryrun.json`); // sprint snapshot json
    saveJsonToFile(
      balancesList,
      `sprint-${sprintId}-distribution-list-dryrun.json`
    ); // balances snapshot json
  } else {
    saveJsonToFile(airdropList, `airdrop-list.json`); // master json
    saveJsonToFile(airdropList, `airdrop-list-${sprintId}.json`); // sprint snapshot json
    saveJsonToFile(balancesList, `sprint-${sprintId}-distribution-list.json`); // balances snapshot json
  }

  console.log("Duplicate wallets: ", duplicateWallet);
  console.log("Skipped users: ", skippedUsers);
  console.log("Zealy EXP Airdrop complete");
  return airdropList;
}
