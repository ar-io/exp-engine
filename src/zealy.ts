import { chunkAndLoadBalances } from "./aoconnect";
import { devKey, prodKey } from "./apikeys";
import {
  getGateways,
  getRecords,
  getState,
  getTxInformation,
  transferTestTokens,
} from "./ar-io";
import { getProfilesByWalletAddresses } from "./bazar-profiles";
import {
  EXP_DENOMINATION,
  FAUCET_MTIO_QUANTITY,
  MIN_XP_TO_QUALIFY,
  PERMAWEB_MODULE_ARDRIVE_START_TIME,
  PERMAWEB_MODULE_ARNS_START_TIME,
  ZEALY_DEV_URL,
  ardriveUploadQuestId,
  arnsNameQuestId,
  bazarQuestId,
  delegatedStakeQuestId,
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

function findRecordByName(name: string, records: any): any {
  return records.find((record: { name: string }) => record.name === name);
}

function findZealyUserById(id: string, users: any): any {
  return users.find((user: { id: string }) => user.id === id);
}

export async function successToFailed(
  dryRun: boolean,
  zealyUrl: string,
  claimedQuestId: string
) {
  if (!dryRun) {
    await fetch(`${zealyUrl}/reviews`, {
      method: "POST",
      headers: {
        "x-api-key": prodKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claimedQuestIds: [claimedQuestId],
        status: "pending",
      }),
    });

    await fetch(`${zealyUrl}/reviews`, {
      method: "POST",
      headers: {
        "x-api-key": prodKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claimedQuestIds: [claimedQuestId],
        status: "fail",
      }),
    });
  }
}

export async function pendingToSuccess(
  dryRun: boolean,
  zealyUrl: string,
  claimedQuestId: string
) {
  if (!dryRun) {
    await fetch(`${zealyUrl}/reviews`, {
      method: "POST",
      headers: {
        "x-api-key": prodKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claimedQuestIds: [claimedQuestId],
        status: "success",
      }),
    });
  }
}

export async function pendingToFail(
  dryRun: boolean,
  zealyUrl: string,
  claimedQuestId: string
) {
  if (!dryRun) {
    await fetch(`${zealyUrl}/reviews`, {
      method: "POST",
      headers: {
        "x-api-key": prodKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        claimedQuestIds: [claimedQuestId],
        status: "fail",
      }),
    });
  }
}

export function extractNameFromUrl(input: string): string {
  // Use regex to match the word after 'http://' or 'https://'
  const match = input.match(/https?:\/\/([a-zA-Z0-9-]+)/);

  // If match is found, return the captured group, otherwise return the input
  return match ? match[1] : input;
}

/**
 * Checks if an Arweave wallet is a delegate in any gateway.
 *
 * @param walletAddress The Arweave wallet address to check.
 * @param registry The state of the gateway address registry.
 * @returns True if the wallet is a delegate in any gateway, false otherwise.
 */
function isDelegate(walletAddress: string, registry: any): boolean {
  for (const gateway in registry) {
    if (registry.hasOwnProperty(gateway)) {
      const delegates = registry[gateway].delegates;
      if (walletAddress in delegates) {
        return true;
      }
    }
  }
  return false;
}

export async function reviewUseThePermawebModule(
  dryRun: boolean = true,
  zealyUrl: string
) {
  let arnsCursor;
  let arnsQuesters = 0;
  let delegatedStakeCursor;
  let bazarCursor;
  let nameNotFoundCount = 0;
  let nameTooEarlyCount = 0;
  let zealyUserDoesntOwnNameCount = 0;
  let delegatedStakerQuesterCount = 0;
  let bazarQuesterCount = 0;
  let bazarQuesterFailedCount = 0;
  let delegatedStakerCount = 0;

  // get all Zealy users
  // const zealyUsers: any = await getLeaderboard(zealyUrl);

  // get all ArNS Records
  const records = await getRecords();

  const gateways = await getGateways();

  // console.log(`Got ${Object.keys(records).length} ArNS names`);

  // Get arns name quest and process reviews
  let arnsNameBuyers: any[] = [];
  console.log("Processing ArNS Quest Reviews");
  while (true) {
    let response;
    if (arnsCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${arnsNameQuestId}&cursor=${arnsCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": prodKey },
        }
      );
    } else {
      response = await fetch(`${zealyUrl}/reviews?questId=${arnsNameQuestId}`, {
        method: "GET",
        headers: { "x-api-key": prodKey },
      });
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === arnsNameQuestId &&
        data.items[i].status === "pending"
      ) {
        arnsQuesters++;
        const name = extractNameFromUrl(
          data.items[i].tasks[0].value.toLowerCase()
        );
        console.log(`   Zealy ID: ${data.items[i].user.id}`);
        console.log(`      Processing Name: ${name}`);

        const nameFound = findRecordByName(name, records);
        if (!nameFound) {
          // DISQUALIFIED
          // Name Not Found
          nameNotFoundCount++;
          console.log("      DISQUALIFIED (ArNS name not found)");
          await pendingToFail(dryRun, zealyUrl, data.items[i].id);
          continue;
        }
        if (nameFound.startTimestamp < PERMAWEB_MODULE_ARNS_START_TIME) {
          // DISQUALIFIED
          // Name created before start time
          nameTooEarlyCount++;
          console.log(
            "      DISQUALIFIED (ArNS name created before start time)"
          );
          await pendingToFail(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        console.log(`      Fetching State from ANT: ${nameFound.processId}`);
        const state = await getState(nameFound.processId);

        const matchedZealyUser: any = await getUserInfo(
          data.items[i].user.id,
          zealyUrl
        );

        if (
          matchedZealyUser.unVerifiedBlockchainAddresses.arweave !== state.Owner
        ) {
          zealyUserDoesntOwnNameCount++;
          console.log("      DISQUALIFIED (This user does not own this name)");
          await pendingToFail(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        console.log(
          `      VALID NAME ${nameFound.name} uploaded by ${matchedZealyUser.unVerifiedBlockchainAddresses.arweave} with Zealy ID: ${matchedZealyUser.id} `
        );

        matchedZealyUser.arnsName = nameFound;
        matchedZealyUser.antState = state;
        arnsNameBuyers.push(matchedZealyUser);

        await pendingToSuccess(dryRun, zealyUrl, data.items[i].id);
      } else {
        console.log(
          `Not pending! ArNS Quest Status: ${data.items[i].status} for Zealy ID: ${data.items[i].user.id}`
        );
      }
    }
    if (data.nextCursor !== null) {
      arnsCursor = data.nextCursor;
    } else {
      break;
    }
  }

  let delegatedStakers: any[] = [];
  console.log("Processing Delegated Staker Quest Review");
  while (true) {
    let response;
    if (delegatedStakeCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${delegatedStakeQuestId}&cursor=${delegatedStakeCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": prodKey },
        }
      );
    } else {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${delegatedStakeQuestId}`,
        {
          method: "GET",
          headers: { "x-api-key": prodKey },
        }
      );
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === delegatedStakeQuestId &&
        data.items[i].status === "pending"
      ) {
        delegatedStakerQuesterCount++;
        const matchedZealyUser: any = await getUserInfo(
          data.items[i].user.id,
          zealyUrl
        );

        if (
          !isDelegate(
            matchedZealyUser.unVerifiedBlockchainAddresses.arweave,
            gateways
          )
        ) {
          zealyUserDoesntOwnNameCount++;
          console.log("      DISQUALIFIED (This user did not delegate stake)");
          await pendingToFail(dryRun, zealyUrl, data.items[i].id);
          continue;
        } else {
          console.log(
            `      VALID DELEGATED STAKER ${matchedZealyUser.unVerifiedBlockchainAddresses.arweave} with Zealy ID: ${matchedZealyUser.id} `
          );

          delegatedStakers.push(matchedZealyUser);
          delegatedStakerCount++;
          await pendingToSuccess(dryRun, zealyUrl, data.items[i].id);
        }
      } else {
        console.log(
          `Not pending! Delegated Stake Quest Status: ${data.items[i].status} for Zealy ID: ${data.items[i].user.id}`
        );
      }
    }
    if (data.nextCursor !== null) {
      delegatedStakeCursor = data.nextCursor;
    } else {
      break;
    }
  }

  let bazarQuesters: any[] = [];
  console.log("Processing Bazar Quest Reviews");
  while (true) {
    let response;
    if (bazarCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${bazarQuestId}&cursor=${bazarCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": prodKey },
        }
      );
    } else {
      response = await fetch(`${zealyUrl}/reviews?questId=${bazarQuestId}`, {
        method: "GET",
        headers: { "x-api-key": prodKey },
      });
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === bazarQuestId &&
        data.items[i].status === "pending"
      ) {
        const matchedZealyUser: any = await getUserInfo(
          data.items[i].user.id,
          zealyUrl
        );

        if (
          (await getProfilesByWalletAddresses({
            addresses: [matchedZealyUser.unVerifiedBlockchainAddresses.arweave],
          })) === false
        ) {
          bazarQuesterFailedCount++;
          console.log(
            "      DISQUALIFIED (This user did not create a bazar profile)"
          );
          await pendingToFail(dryRun, zealyUrl, data.items[i].id);
          continue;
        } else {
          console.log(
            `      VALID BAZAR PROFILE ${matchedZealyUser.unVerifiedBlockchainAddresses.arweave} with Zealy ID: ${matchedZealyUser.id} `
          );

          bazarQuesters.push(matchedZealyUser);
          bazarQuesterCount++;
          await pendingToSuccess(dryRun, zealyUrl, data.items[i].id);
        }
      } else {
        console.log(
          `Not pending! Bazar Quest Status: ${data.items[i].status} for Zealy ID: ${data.items[i].user.id}`
        );
      }
    }
    if (data.nextCursor !== null) {
      bazarCursor = data.nextCursor;
    } else {
      break;
    }
  }

  console.log(`Total ArNS Questers: ${arnsQuesters}`);
  console.log(
    `Approved ${
      Object.keys(arnsNameBuyers).length
    } successful ArNS Name Questers`
  );
  console.log(`   Names not found: ${nameNotFoundCount}`);
  console.log(`   Name Created Too Early: ${nameTooEarlyCount}`);
  console.log(`   Mismatched Name Owner: ${zealyUserDoesntOwnNameCount}`);
  console.log(`Total Delegated Stake Questers: ${delegatedStakerQuesterCount}`);
  console.log(`   Total Delegated Stakers: ${delegatedStakerCount}`);
  console.log(
    `Total Bazar Questers: ${bazarQuesterCount + bazarQuesterFailedCount}`
  );
  console.log(`   Total Bazar Profile Creators: ${bazarQuesterCount}`);
  return { arnsNameBuyers, delegatedStakers, bazarQuesters };
}

export async function reviewUseThePermawebModuleSprint10(
  dryRun: boolean = true,
  zealyUrl: string
) {
  let ardriveCursor;
  let arnsCursor;
  let uploadQuesters = 0;
  let arnsQuesters = 0;
  const arDriveUploaders: any[] = [];
  let noDataCount = 0;
  let invalidUploaderCount = 0;
  let tooSmallCount = 0;
  let tooEarlyCount = 0;
  let nameNotFoundCount = 0;
  let nameTooEarlyCount = 0;
  let notMatchedUserCount = 0;
  let zealyUserDoesntOwnNameCount = 0;
  let unmatchedDataPointerCount = 0;
  let errorTxIdCount = 0;

  // Get ardrive upload quest and process reviews
  console.log("Processing ArDrive Upload Quest Reviews");
  while (true) {
    let response;
    if (ardriveCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${ardriveUploadQuestId}&cursor=${ardriveCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": devKey },
        }
      );
    } else {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${ardriveUploadQuestId}`,
        {
          method: "GET",
          headers: { "x-api-key": devKey },
        }
      );
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === ardriveUploadQuestId &&
        data.items[i].status === "success"
      ) {
        uploadQuesters++;
        const user: any = await getUserInfo(data.items[i].user.id, zealyUrl);

        if (
          user.unVerifiedBlockchainAddresses.arweave &&
          !isArweaveAddress(user.unVerifiedBlockchainAddresses.arweave)
        ) {
          console.log("Invalid Arweave wallet found");
          continue;
        }
        console.log(
          `   Zealy ID: ${user.id} Arweave Wallet: ${user.unVerifiedBlockchainAddresses.arweave}`
        );
        console.log(`      Checking TxId: ${data.items[i].tasks[2].value}`);

        const txData = await getTxInformation(data.items[i].tasks[2].value);
        if (txData.errors) {
          console.log("      DISQUALIFIED (TX ERROR)");
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          errorTxIdCount++;
          continue;
        }
        if (txData.data.transactions.edges.length === 0) {
          // DISQUALIFIED
          // No Data Found
          noDataCount++;
          console.log("      DISQUALIFIED (no data uploaded by Zealy wallet)");
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }
        if (
          txData.data.transactions.edges[0].node.owner.address !==
          user.unVerifiedBlockchainAddresses.arweave
        ) {
          // DISQUALIFIED
          // Mismatching wallet
          invalidUploaderCount++;
          console.log("      DISQUALIFIED (not uploaded by Zealy wallet)");
          console.log(
            `         Expected: ${user.unVerifiedBlockchainAddresses.arweave} Found: ${txData.data.transactions.edges[0].node.owner.address}`
          );
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }
        if (
          txData.data.transactions.edges[0].node.block.timestamp <
          PERMAWEB_MODULE_ARDRIVE_START_TIME
        ) {
          // 4/20/2024
          // DISQUALIFIED
          tooEarlyCount++;
          console.log("      DISQUALIFIED (before 7/24/2024)");
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }
        /*if (txData.data.transactions.edges[0].node.data.size < 102400) {
          // Must be greater than 100 KiB
          // DISQUALIFIED
          tooSmallCount++;
          console.log("      DISQUALIFIED (not greater than 100KiB)");
          console.log(
            `          Size Found: ${txData.data.transactions.edges[0].node.data.size} bytes`
          );
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }*/

        console.log("      VALID UPLOAD!");
        user.arnsDataPointerTxId = data.items[i].tasks[2].value;
        arDriveUploaders.push(user);

        if (!dryRun) {
          await fetch(`${zealyUrl}/reviews`, {
            method: "POST",
            headers: {
              "x-api-key": prodKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              claimedQuestIds: [data.items[i].id],
              status: "success",
            }),
          });
        }
      }
    }
    if (data.nextCursor !== null) {
      ardriveCursor = data.nextCursor;
    } else {
      break;
    }
  }
  ////////////////////////////////////////////////

  // get all ArNS Records
  const records = await getRecords();
  // console.log(`Got ${Object.keys(records).length} ArNS names`);

  // Get arns name quest and process reviews
  let arnsNameBuyers: any[] = [];
  console.log("Processing ArNS Quest Reviews");
  while (true) {
    let response;
    if (arnsCursor) {
      response = await fetch(
        `${zealyUrl}/reviews?questId=${arnsNameQuestId}&cursor=${arnsCursor}`,
        {
          method: "GET",
          headers: { "x-api-key": prodKey },
        }
      );
    } else {
      response = await fetch(`${zealyUrl}/reviews?questId=${arnsNameQuestId}`, {
        method: "GET",
        headers: { "x-api-key": prodKey },
      });
    }

    const data: any = await response.json();
    for (let i = 0; i < data.items.length; i += 1) {
      if (
        data.items[i].quest.id === arnsNameQuestId &&
        data.items[i].status === "success"
      ) {
        arnsQuesters++;
        console.log(`   Zealy ID: ${data.items[i].user.id}`);
        console.log(`      Processing Name: ${data.items[i].tasks[3].value}`);
        const nameFound = findRecordByName(
          data.items[i].tasks[3].value,
          records
        );
        if (!nameFound) {
          // DISQUALIFIED
          // Name Not Found
          nameNotFoundCount++;
          console.log("      DISQUALIFIED (ArNS name not found)");
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }
        if (nameFound.startTimestamp < PERMAWEB_MODULE_ARNS_START_TIME) {
          // DISQUALIFIED
          // Name created before start time
          nameTooEarlyCount++;
          console.log(
            "      DISQUALIFIED (ArNS name created before start time)"
          );
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        console.log(`      Fetching State from ANT: ${nameFound.processId}`);
        const state = await getState(nameFound.processId);

        const matchedZealyUser = findZealyUserById(
          data.items[i].user.id,
          arDriveUploaders
        );
        if (!matchedZealyUser) {
          notMatchedUserCount++;
          console.log(
            "      DISQUALIFIED (This user did not complete the upload quest)"
          );
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        if (
          matchedZealyUser.unVerifiedBlockchainAddresses.arweave !== state.Owner
        ) {
          zealyUserDoesntOwnNameCount++;
          console.log("      DISQUALIFIED (This user does not own this name)");
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        if (
          state.Records["@"].transactionId !==
          matchedZealyUser.arnsDataPointerTxId
        ) {
          unmatchedDataPointerCount++;
          console.log(
            "      DISQUALIFIED (The datapointer does not match the ArDrive Upload quest)"
          );
          console.log(
            `      Expected: ${matchedZealyUser.arnsDataPointerTxId} Found: ${state.Records["@"].transactionId}`
          );
          await successToFailed(dryRun, zealyUrl, data.items[i].id);
          continue;
        }

        console.log(
          `      VALID NAME ${nameFound.name} uploaded by ${matchedZealyUser.unVerifiedBlockchainAddresses.arweave} with Zealy ID: ${matchedZealyUser.id} `
        );

        matchedZealyUser.arnsName = nameFound;
        matchedZealyUser.antState = state;
        arnsNameBuyers.push(matchedZealyUser);

        if (!dryRun) {
          await fetch(`${zealyUrl}/reviews`, {
            method: "POST",
            headers: {
              "x-api-key": prodKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              claimedQuestIds: [data.items[i].id],
              status: "success",
            }),
          });
        }
      }
    }
    if (data.nextCursor !== null) {
      arnsCursor = data.nextCursor;
    } else {
      break;
    }
  }

  console.log(`Total ArDrive Upload Questers: ${uploadQuesters}`);
  console.log(
    `Approved ${arDriveUploaders.length} successful ArDrive Upload Questers`
  );
  console.log(`   No Data: ${noDataCount}`);
  console.log(`   Mismatched Uploaders: ${invalidUploaderCount}`);
  console.log(`   Too Small: ${tooSmallCount}`);
  console.log(`   Too Early: ${tooEarlyCount}\n`);

  console.log(`Total ArNS Questers: ${arnsQuesters}`);
  console.log(
    `Approved ${
      Object.keys(arnsNameBuyers).length
    } successful ArNS Name Questers`
  );
  console.log(`   Names not found: ${nameNotFoundCount}`);
  console.log(`   Name Created Too Early: ${nameTooEarlyCount}`);
  console.log(`   Didnt Complete Upload Quest: ${notMatchedUserCount}`);
  console.log(`   Mismathced Name Owner: ${zealyUserDoesntOwnNameCount}`);
  console.log(`   Mismatched Data Pointer: ${unmatchedDataPointerCount}`);
  console.log(`   Errored TxId Count: ${errorTxIdCount}`);
  return arnsNameBuyers;
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
  zealyUrl: string = ZEALY_DEV_URL
) {
  console.log("Running Zealy EXP Airdrop");
  let balancesList: Balances = {};
  let skippedUsers = 0;
  let notEnoughXpUsers = 0;
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

        if (expToReward > 0 && zealyUser.xp >= MIN_XP_TO_QUALIFY) {
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
          //   "- User did not earn enough XP since last sprint. No EXP to airdrop!"
          // );
          airdropList.recipients[arweaveAddress].sprintsParticipated[sprintId] =
            {
              transferTxId: "",
              xpEarned: currentSprintXp,
              expRewarded: 0,
              timestamp: Math.floor(Date.now() / 1000),
            };
          notEnoughXpUsers += 1;
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

  console.log("Missing arweave wallet users: ", skippedUsers);
  console.log("Duplicate wallets: ", duplicateWallet);
  console.log(`Users not qualified for this sprint: ${notEnoughXpUsers}`);
  console.log("Zealy EXP Airdrop complete");
  return airdropList;
}
