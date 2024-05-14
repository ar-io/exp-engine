import { loadBalances } from "./aoconnect";
import { fetchAndSaveIOState } from "./ar-io";
import {
  DEFAULT_ARNS_DATA_POINTER,
  HISTORICAL_BASIC_DELEGATES_REWARD,
  HISTORICAL_BASIC_NAME_REWARD,
  HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD,
  HISTORICAL_MULTIPLE_UNDERNAME_REWARD,
  HISTORICAL_CONTROLLER_REWARD,
  HISTORICAL_GOOD_GATEWAY_REWARD,
  HISTORICAL_GOOD_OBSERVER_REWARD,
  HISTORICAL_JOINED_GATEWAY_REWARD,
  HISTORICAL_MANY_DELEGATES_REWARD,
  HISTORICAL_MANY_STAKED_GATEWAYS_REWARD,
  HISTORICAL_OG_NAME_REWARD,
  HISTORICAL_ROOT_DATA_POINTER_SET_REWARD,
  HISTORICAL_TEST_TOKEN_HOLDER_REWARD,
  HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD,
  HISTORICAL_U_REWARD,
  HISTORICAL_TURBO_TOP_UP_REWARD,
  HISTORICAL_TURBO_1GB_REWARD,
  HISTORICAL_CUSTOM_GATEWAY_NOTE_REWARD,
  HISTORICAL_OG_GATEWAY_REWARD,
  HISTORICAL_OG_OBSERVER_REWARD,
  HISTORICAL_SMALL_ARDRIVE_UPLOAD_REWARD,
  HISTORICAL_MEDIUM_ARDRIVE_UPLOAD_REWARD,
  HISTORICAL_LARGE_ARDRIVE_UPLOAD_REWARD,
  HISTORICAL_MAX_ARDRIVE_UPLOAD_REWARD,
  HISTORICAL_LARGE_ARWEAVE_UPLOAD_REWARD,
  HISTORICAL_MAX_ARWEAVE_UPLOAD_REWARD,
  HISTORICAL_MEDIUM_ARWEAVE_UPLOAD_REWARD,
  HISTORICAL_SMALL_ARWEAVE_UPLOAD_REWARD,
  HISTORICAL_EVENT_ATTENDEE_REWARD,
  HISTORICAL_ARDRIVE_TOKEN_REWARD,
  HISTORICAL_MANIFEST_UPLOAD_REWARD,
} from "./constants";
import {
  AirdropList,
  Balances,
  CachedRecords,
  Categories,
  CategoryDetails,
  Gateways,
  HistoricalScores,
} from "./types";
import {
  getCurrentBlockHeight,
  isArweaveAddress,
  jsonToCSV,
  loadJsonFile,
  saveBalancesToFile,
  saveJsonToFile,
  writeCSVToFile,
} from "./utilities";
import path from "path";

export async function runHistoricalAirdrop(
  dryRun: boolean = true,
  balancesJsonFileName: string
) {
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

  let balancesList: Balances;
  try {
    const airdropRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      balancesJsonFileName
    );
    balancesList = await loadJsonFile(airdropRecipientsFilePath);
  } catch {
    console.log(
      `Balances data is missing.  Ensure ${balancesJsonFileName} exists`
    );
    return {};
  }

  let sprintId = 0;
  airdropList.lastAirdropTimeStamp = Math.floor(Date.now() / 1000);

  const result = await loadBalances(balancesList, dryRun);
  if (result === false) {
    console.log("Error minting EXP");
    return {};
  }

  for (const recipient in balancesList) {
    // if recipient key is not an arweave wallet, skip
    if (!isArweaveAddress(recipient)) {
      console.log("Invalid arweave wallet: ", recipient);
      continue;
    }

    // Add a new Wallet user if not created in airdrop list already.
    if (!airdropList.recipients[recipient]) {
      airdropList.recipients[recipient] = {
        zealyId: "", // this zealy id can be mapped later if found
        xpEarned: 0,
        expRewarded: 0,
        categories: {},
        sprintsParticipated: {},
      };
    }

    if (
      airdropList.recipients[recipient] &&
      airdropList.recipients[recipient].sprintsParticipated[sprintId]
    ) {
      // console.log("Historical EXP Airdrop already sent for this sprint");
      continue;
    }

    const expToReward = balancesList[recipient];
    if (expToReward > 0) {
      console.log("- Airdropped Historical EXP - ", recipient);
      airdropList.recipients[recipient].expRewarded += expToReward;
      airdropList.recipients[recipient].sprintsParticipated[sprintId] = {
        transferTxId: result,
        xpEarned: 0,
        expRewarded: expToReward,
        timestamp: Math.floor(Date.now() / 1000),
      };
    } else {
      console.log(
        "- User earned no XP since last sprint. No EXP to airdrop - ",
        recipient
      );
      airdropList.recipients[recipient].sprintsParticipated[sprintId] = {
        transferTxId: "",
        xpEarned: 0,
        expRewarded: 0,
        timestamp: Math.floor(Date.now() / 1000),
      };
    }
  }
  saveJsonToFile(airdropList, "airdrop-list.json");
  return airdropList;
}

export function calculateHistoricalExp(
  records: CachedRecords,
  gateways: Gateways,
  ioBalances: Balances,
  arDriveState: any,
  uBalances: Balances,
  turboTopUpBalances: Balances,
  turbo1GBUploadBalances: Balances,
  ogGatewayBalances: Balances,
  ogObserverBalances: Balances,
  exemptWallets: Balances,
  arDriveUploaders: Balances,
  arweaveUploaders: Balances,
  eventAttendees: Balances,
  manifestUploaders: Balances
): HistoricalScores {
  const scores: HistoricalScores = {};

  for (const key in records) {
    const record = records[key];
    const owner = record.contract.owner;

    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }
    scores[owner].totalNames += 1;
    scores[owner].names.push(key);

    // Basic points for having a record
    if (!scores[owner].categories.basicName) {
      scores[owner].totalPoints += HISTORICAL_BASIC_NAME_REWARD;
      scores[owner].categories.basicName = {
        value: key,
        exp: HISTORICAL_BASIC_NAME_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Extra points for being an OG Pilot
    if (
      !scores[owner].categories.ogName &&
      record.startTimestamp <= 1695081600
    ) {
      scores[owner].totalPoints += HISTORICAL_OG_NAME_REWARD;
      scores[owner].categories.ogName = {
        value: key,
        exp: HISTORICAL_OG_NAME_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Specific transactionId conditions
    if (
      record.contract.records["@"] &&
      record.contract.records["@"].transactionId !== "" &&
      record.contract.records["@"].transactionId !==
        DEFAULT_ARNS_DATA_POINTER &&
      !scores[owner].categories.rootDataPointerSet
    ) {
      scores[owner].totalPoints += HISTORICAL_ROOT_DATA_POINTER_SET_REWARD;
      scores[owner].categories.rootDataPointerSet = {
        value: key,
        exp: HISTORICAL_ROOT_DATA_POINTER_SET_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Points for having multiple undernames
    if (
      Object.keys(record.contract.records).length > 1 &&
      !scores[owner].categories.multipleUndernames
    ) {
      for (const undername in record.contract.records) {
        if (undername !== "@") {
          scores[owner].totalPoints += HISTORICAL_MULTIPLE_UNDERNAME_REWARD;
          scores[owner].categories.multipleUndernames = {
            value: `${undername}_${key}`,
            exp: HISTORICAL_MULTIPLE_UNDERNAME_REWARD,
            awardedOnSprint: 0,
          };
          break;
        }
      }
    }

    // Points for having a controller that isnt the owner
    if (
      record.contract.controllers &&
      (record.contract.controllers.length > 1 ||
        !record.contract.controllers.includes(owner)) &&
      !scores[owner].categories.controllersAdded
    ) {
      scores[owner].totalPoints += HISTORICAL_CONTROLLER_REWARD;
      scores[owner].categories.controllersAdded = {
        value: key,
        exp: HISTORICAL_CONTROLLER_REWARD,
        awardedOnSprint: 0,
      };
    }

    if (
      Object.keys(record.contract.records).length &&
      !scores[owner].categories.undernameDataPointerSet
    ) {
      for (const undername in record.contract.records) {
        if (
          undername !== "@" &&
          record.contract.records[undername].transactionId &&
          record.contract.records[undername].transactionId !==
            DEFAULT_ARNS_DATA_POINTER &&
          isArweaveAddress(record.contract.records[undername].transactionId)
        ) {
          scores[owner].totalPoints +=
            HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD;
          scores[owner].categories.undernameDataPointerSet = {
            value: `${undername}_${key}`,
            exp: HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD,
            awardedOnSprint: 0,
          };
          break;
        }
      }
    }
  }

  for (const key in gateways) {
    const gateway = gateways[key];
    const owner = key;
    const fqdn = gateway.settings.fqdn;

    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    // Basic points for having a gateway
    if (!scores[owner].categories.joinedGateway) {
      scores[owner].totalPoints += HISTORICAL_JOINED_GATEWAY_REWARD;
      scores[owner].categories.joinedGateway = {
        value: fqdn,
        exp: HISTORICAL_JOINED_GATEWAY_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Points for being a good gateway
    if (
      !scores[owner].categories.goodGateway &&
      gateway.stats.totalEpochParticipationCount >= 50 &&
      gateway.stats.passedEpochCount /
        gateway.stats.totalEpochParticipationCount >
        0.75
    ) {
      scores[owner].totalPoints += HISTORICAL_GOOD_GATEWAY_REWARD;
      scores[owner].categories.goodGateway = {
        value: fqdn,
        exp: HISTORICAL_GOOD_GATEWAY_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Points for being a good observer
    if (
      !scores[owner].categories.goodObserver &&
      gateway.stats.totalEpochsPrescribedCount >= 10 &&
      gateway.stats.submittedEpochCount /
        gateway.stats.totalEpochsPrescribedCount >
        0.33
    ) {
      scores[owner].totalPoints += HISTORICAL_GOOD_OBSERVER_REWARD;
      scores[owner].categories.goodObserver = {
        value: fqdn,
        exp: HISTORICAL_GOOD_OBSERVER_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Points for having delegates
    if (
      !scores[owner].categories.hasDelegates &&
      Object.keys(gateway.delegates).length > 0
    ) {
      let delegatedStakeReward = 0;
      if (Object.keys(gateway.delegates).length >= 10) {
        delegatedStakeReward = HISTORICAL_MANY_DELEGATES_REWARD;
      } else {
        delegatedStakeReward = HISTORICAL_BASIC_DELEGATES_REWARD;
      }
      scores[owner].totalPoints += delegatedStakeReward;
      scores[owner].categories.hasDelegates = {
        value: fqdn,
        exp: delegatedStakeReward,
        awardedOnSprint: 0,
      };
    }

    // Points for customizing gateway note
    if (
      !scores[owner].categories.customGatewayNote &&
      gateway.settings.note === "Owned and operated by DTF."
    ) {
      scores[owner].totalPoints += HISTORICAL_CUSTOM_GATEWAY_NOTE_REWARD;
      scores[owner].categories.customGatewayNote = {
        value: fqdn,
        exp: HISTORICAL_CUSTOM_GATEWAY_NOTE_REWARD,
        awardedOnSprint: 0,
      };
    }

    // Points for delegating stake
    for (const delegate in gateway.delegates) {
      // Initialize the score detail if not already
      if (!scores[delegate]) {
        scores[delegate] = {
          totalPoints: 0,
          totalNames: 0,
          names: [],
          categories: {},
        };
      }

      if (scores[delegate].categories.delegatedStaker) {
        if (Number(scores[delegate].categories.delegatedStaker.value) === 5) {
          scores[delegate].totalPoints +=
            HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD;
          scores[delegate].categories.delegatedStaker = {
            value:
              Number(scores[delegate].categories.delegatedStaker.value) + 1,
            exp:
              HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD +
              HISTORICAL_MANY_STAKED_GATEWAYS_REWARD,
            awardedOnSprint: 0,
          };
        } else {
          scores[delegate].categories.delegatedStaker.value =
            Number(scores[delegate].categories.delegatedStaker.value) + 1;
        }
      } else {
        scores[delegate].totalPoints += HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD;
        scores[delegate].categories.delegatedStaker = {
          value: 1,
          exp: HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD,
          awardedOnSprint: 0,
        };
      }
    }
  }
  // Points for having test IO tokens
  for (const owner in ioBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }
    if (!scores[owner].categories.ioBalance) {
      scores[owner].totalPoints += HISTORICAL_TEST_TOKEN_HOLDER_REWARD;
      scores[owner].categories.ioBalance = {
        value: ioBalances[owner],
        exp: HISTORICAL_TEST_TOKEN_HOLDER_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for having unlocked ArDrive tokens
  for (const owner in arDriveState.balances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }
    if (!scores[owner].categories.arDriveBalance) {
      if (arDriveState.balances[owner] !== 0) {
        scores[owner].totalPoints += HISTORICAL_ARDRIVE_TOKEN_REWARD;
        scores[owner].categories.arDriveBalance = {
          value: arDriveState.balances[owner],
          exp: HISTORICAL_ARDRIVE_TOKEN_REWARD,
          awardedOnSprint: 0,
        };
      }
    }
  }

  // Points for having vaulted ArDrive tokens
  for (const owner in arDriveState.vault) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }
    if (!scores[owner].categories.arDriveBalance) {
      // Add up all vaults
      let vaultBalance = arDriveState.vault[owner].reduce(
        (total: number, vault: any) => total + vault.balance,
        0
      );
      if (vaultBalance !== 0) {
        scores[owner].totalPoints += HISTORICAL_ARDRIVE_TOKEN_REWARD;
        scores[owner].categories.arDriveVaults = {
          value: vaultBalance,
          exp: HISTORICAL_ARDRIVE_TOKEN_REWARD,
          awardedOnSprint: 0,
        };
      }
    }
  }

  // Points for having U tokens
  for (const owner in uBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }
    if (!scores[owner].categories.uBalance) {
      if (uBalances[owner] !== 0) {
        scores[owner].totalPoints += HISTORICAL_U_REWARD;
        scores[owner].categories.uBalance = {
          value: uBalances[owner],
          exp: HISTORICAL_U_REWARD,
          awardedOnSprint: 0,
        };
      }
    }
  }

  // Points for having topped up with turbo
  for (const owner in turboTopUpBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (!scores[owner].categories.turboTopUpSnapshot) {
      scores[owner].totalPoints += HISTORICAL_TURBO_TOP_UP_REWARD;
      scores[owner].categories.turboTopUpSnapshot = {
        value: 1,
        exp: HISTORICAL_TURBO_TOP_UP_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for having uploaded more than 1GB to turbo
  for (const owner in turbo1GBUploadBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (!scores[owner].categories.turbo1GBUploadSnapshot) {
      scores[owner].totalPoints += HISTORICAL_TURBO_1GB_REWARD;
      scores[owner].categories.turbo1GBUploadSnapshot = {
        value: 1,
        exp: HISTORICAL_TURBO_1GB_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for being an OG Gateway
  for (const owner in ogGatewayBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (!scores[owner].categories.ogGateway) {
      scores[owner].totalPoints += HISTORICAL_OG_GATEWAY_REWARD;
      scores[owner].categories.ogGateway = {
        value: 1,
        exp: HISTORICAL_OG_GATEWAY_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for being an OG Observer
  for (const owner in ogObserverBalances) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (!scores[owner].categories.ogObserver) {
      scores[owner].totalPoints += HISTORICAL_OG_OBSERVER_REWARD;
      scores[owner].categories.ogObserver = {
        value: 1,
        exp: HISTORICAL_OG_OBSERVER_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for uploading data to ArDrive
  for (const owner in arDriveUploaders) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (
      !scores[owner].categories.arDriveUserUploads &&
      arDriveUploaders[owner] >= 100_000
    ) {
      let arDriveReward = 0;
      if (
        arDriveUploaders[owner] >= 100_000 &&
        arDriveUploaders[owner] < 100_000_000
      ) {
        arDriveReward = HISTORICAL_SMALL_ARDRIVE_UPLOAD_REWARD;
      } else if (
        arDriveUploaders[owner] >= 100_000_000 &&
        arDriveUploaders[owner] < 1_000_000_000_000
      ) {
        arDriveReward = HISTORICAL_MEDIUM_ARDRIVE_UPLOAD_REWARD;
      } else if (
        arDriveUploaders[owner] >= 1_000_000_000_000 &&
        arDriveUploaders[owner] < 10_000_000_000_000
      ) {
        arDriveReward = HISTORICAL_LARGE_ARDRIVE_UPLOAD_REWARD;
      } else if (arDriveUploaders[owner] >= 10_000_000_000_000) {
        arDriveReward = HISTORICAL_MAX_ARDRIVE_UPLOAD_REWARD;
      }
      scores[owner].totalPoints += arDriveReward;
      scores[owner].categories.arDriveUserUploads = {
        value: arDriveUploaders[owner],
        exp: arDriveReward,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for having uploaded data to Arweave
  for (const owner in arweaveUploaders) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (
      !scores[owner].categories.arweaveUserUploads &&
      arweaveUploaders[owner] >= 100_000
    ) {
      let arweaveReward = 0;
      if (
        arweaveUploaders[owner] >= 5_000_000 &&
        arweaveUploaders[owner] < 500_000_000
      ) {
        arweaveReward = HISTORICAL_SMALL_ARWEAVE_UPLOAD_REWARD;
      } else if (
        arweaveUploaders[owner] >= 500_000_000 &&
        arweaveUploaders[owner] < 5_000_000_000_000
      ) {
        arweaveReward = HISTORICAL_MEDIUM_ARWEAVE_UPLOAD_REWARD;
      } else if (
        arweaveUploaders[owner] >= 5_000_000_000_000 &&
        arweaveUploaders[owner] < 50_000_000_000_000
      ) {
        arweaveReward = HISTORICAL_LARGE_ARWEAVE_UPLOAD_REWARD;
      } else if (arDriveUploaders[owner] >= 50_000_000_000_000) {
        arweaveReward = HISTORICAL_MAX_ARWEAVE_UPLOAD_REWARD;
      }
      scores[owner].totalPoints += arweaveReward;
      scores[owner].categories.arweaveUserUploads = {
        value: arweaveUploaders[owner],
        exp: arweaveReward,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for having uploaded manifests to arweave
  for (const owner in manifestUploaders) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (
      !scores[owner].categories.manifestUploader &&
      manifestUploaders[owner] >= 5_000_000
    ) {
      scores[owner].totalPoints += HISTORICAL_MANIFEST_UPLOAD_REWARD;
      scores[owner].categories.manifestUploader = {
        value: manifestUploaders[owner],
        exp: HISTORICAL_MANIFEST_UPLOAD_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // Points for attending an event
  for (const owner in eventAttendees) {
    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {},
      };
    }

    if (!scores[owner].categories.eventAttendee) {
      scores[owner].totalPoints += HISTORICAL_EVENT_ATTENDEE_REWARD;
      scores[owner].categories.eventAttendee = {
        value: 1,
        exp: HISTORICAL_EVENT_ATTENDEE_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  // TO DO: ADD AR HOLDERS

  // Filter out team wallets
  for (const owner in exemptWallets) {
    if (scores[owner]) {
      delete scores[owner];
    }
  }

  // Filter out empty scores
  for (const owner in scores) {
    if (scores[owner].totalPoints === 0) {
      delete scores[owner];
    }
  }
  return scores;
}

export async function loadAndCalculateHistoricalExp(blockHeight?: number) {
  let ioState: any = {};
  let arDriveState: any = {};
  let uState: any = {};
  let turboTopUpSnapshot: any = {};
  let turbo1GBUploadSnapshot: any = {};
  let ogGatewaySnapshot: any = {};
  let ogObserverSnapshot: any = {};
  let exemptWalletSnapshot: any = {};
  let arDriveUsersSnapshot: any = {};
  let arweaveUsersSnapshot: any = {};
  let eventAttendeesSnapshot: any = {};
  let manifestUploaderSnapshot: any = {};

  if (blockHeight) {
    const ioStatePath = path.join(
      __dirname,
      "..",
      "data",
      `ar-io-state-${blockHeight}.json`
    );
    const ardriveStatePath = path.join(
      __dirname,
      "..",
      "data",
      `ardrive-state-${blockHeight}.json`
    );
    const uStatePath = path.join(
      __dirname,
      "..",
      "data",
      `u-state-1416315.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const turboTopUpSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `turbo_top_up_snapshot.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const turbo1GBUploadSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `turbo_1gb_upload_snapshot.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const ogGatewaySnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `testnet_og_gateway_snapshot.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const ogObserverSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `testnet_og_observer_snapshot.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const exemptWalletSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `exempt_team_wallet_snapshot.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const arDriveUsersSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `ardrive_users_1415082.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const arweaveUsersSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `arweave_users_1415082.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const eventAttendeesSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `event_attendees.json` // TO DO: SET THIS TO BE DYNAMIC
    );
    const manifestUploaderSnapshotPath = path.join(
      __dirname,
      "..",
      "data",
      `arweave_manifest_uploaders_1415082.json` // TO DO: SET THIS TO BE DYNAMIC
    );

    try {
      ioState = await loadJsonFile(ioStatePath);
      arDriveState = await loadJsonFile(ardriveStatePath);
      uState = await loadJsonFile(uStatePath);
      turboTopUpSnapshot = await loadJsonFile(turboTopUpSnapshotPath);
      turbo1GBUploadSnapshot = await loadJsonFile(turbo1GBUploadSnapshotPath);
      ogGatewaySnapshot = await loadJsonFile(ogGatewaySnapshotPath);
      ogObserverSnapshot = await loadJsonFile(ogObserverSnapshotPath);
      exemptWalletSnapshot = await loadJsonFile(exemptWalletSnapshotPath);
      arDriveUsersSnapshot = await loadJsonFile(arDriveUsersSnapshotPath);
      arweaveUsersSnapshot = await loadJsonFile(arweaveUsersSnapshotPath);
      eventAttendeesSnapshot = await loadJsonFile(eventAttendeesSnapshotPath);
      manifestUploaderSnapshot = await loadJsonFile(
        manifestUploaderSnapshotPath
      );
    } catch (err) {
      console.log(err);
      console.log(
        `Fetching and saving the ar.io cache at block height ${blockHeight}`
      );
      ioState = await fetchAndSaveIOState(blockHeight);
    }
  } else {
    console.log(
      "Fetching and saving the latest ar.io cache at current block height"
    );
    blockHeight = await getCurrentBlockHeight();
    ioState = await fetchAndSaveIOState(blockHeight);
  }

  let scores = {};
  if (ioState) {
    console.log("Analyzing snapshot and calculating EXP Rewards");
    scores = calculateHistoricalExp(
      ioState.records,
      ioState.gateways,
      ioState.balances,
      arDriveState.state,
      uState.balances,
      turboTopUpSnapshot.balances,
      turbo1GBUploadSnapshot.balances,
      ogGatewaySnapshot.balances,
      ogObserverSnapshot.balances,
      exemptWalletSnapshot.balances,
      arDriveUsersSnapshot.uploads,
      arweaveUsersSnapshot.uploads,
      eventAttendeesSnapshot.attendees,
      manifestUploaderSnapshot.manifestUploaders
    );
    const jsonFileName = "historical-exp-rewards-" + blockHeight + ".json";
    saveJsonToFile(scores, jsonFileName);

    const balancesFileName = "exp-balances-" + blockHeight + ".json";
    saveBalancesToFile(scores, balancesFileName);

    const csvData = jsonToCSV(scores);
    writeCSVToFile(csvData, "historicalScores.csv");
  }
  analyzeScores(scores);
  return { scores, ioState, arDriveState };
}

// Function to analyze the data
function analyzeScores(data: HistoricalScores): void {
  let totalParticipants = 0;
  let grandTotalPoints = 0;
  let highestPoints = 0;
  const categoryExpSummary: Record<string, number> = {};
  const categoryParticipantCounts: Record<string, number> = {};
  let allCategoriesCount = 0;

  // Initialize counters for each category to zero
  const allCategories: (keyof Categories)[] = [
    "basicName",
    "ogName",
    "multipleUndernames",
    "rootDataPointerSet",
    "undernameDataPointerSet",
    "controllersAdded",
    "ogGateway",
    "ogObserver",
    "joinedGateway",
    "goodGateway",
    "goodObserver",
    "hasDelegates",
    "customGatewayNote",
    "delegatedStaker",
    "ioBalance",
    "arDriveBalance",
    "arDriveVaults",
    "uBalance",
    "turboTopUpSnapshot",
    "turbo1GBUploadSnapshot",
    "arDriveUserUploads",
    "arweaveUserUploads",
    "manifestUploader",
    "eventAttendee",
  ];

  allCategories.forEach(
    (category) => (categoryParticipantCounts[category] = 0)
  );

  for (const owner in data) {
    const { totalPoints, categories } = data[owner];
    if (highestPoints < totalPoints) {
      highestPoints = totalPoints;
    }
    grandTotalPoints += totalPoints;
    totalParticipants++;
    let allCategoriesPresent = true;

    allCategories.forEach((category) => {
      if (categories[category]) {
        categoryParticipantCounts[category]++;
      } else {
        allCategoriesPresent = false;
      }
    });

    if (allCategoriesPresent) {
      allCategoriesCount++;
    }

    Object.keys(categories).forEach((category) => {
      const details: CategoryDetails = categories[category as keyof Categories];
      if (details) {
        if (!categoryExpSummary[category]) {
          categoryExpSummary[category] = 0;
        }
        categoryExpSummary[category] += details.exp;
      }
    });
  }

  // Calculate the average EXP per user
  const averageEXP =
    totalParticipants > 0 ? grandTotalPoints / totalParticipants : 0;

  console.log(`Total Participants: ${totalParticipants}`);
  console.log(`Grand Total Points: ${grandTotalPoints}`);
  console.log("Category Participation Counts:", categoryParticipantCounts);
  console.log("Users with All Categories:", allCategoriesCount);
  console.log("Highest EXP earned: ", highestPoints);
  console.log(`Average EXP per User: ${averageEXP.toFixed(2)}`);
  console.log("EXP by Category:", categoryExpSummary);
}
