import { fetchAndSaveIOState } from "./ar-io";
import {
  DEFAULT_ARNS_DATA_POINTER,
  HISTORICAL_ARDRIVE_EXP_RATIO,
  HISTORICAL_BASIC_ARDRIVE_REWARD,
  HISTORICAL_BASIC_DELEGATES_REWARD,
  HISTORICAL_BASIC_NAME_REWARD,
  HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD,
  HISTORICAL_UNDERNAME_REWARD,
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
} from "./constants";
import {
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
  loadJsonFile,
  saveJsonToFile,
} from "./utilities";
import path from "path";

export function calculateHistoricalExp(
  records: CachedRecords,
  gateways: Gateways,
  ioBalances: Balances,
  arDriveBalances: Balances,
  uBalances: Balances
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
      !scores[owner].categories.basicUndername
    ) {
      for (const undername in record.contract.records) {
        if (undername !== "@") {
          scores[owner].totalPoints += HISTORICAL_UNDERNAME_REWARD;
          scores[owner].categories.basicUndername = {
            value: `${undername}_${key}`,
            exp: HISTORICAL_UNDERNAME_REWARD,
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
      !scores[owner].categories.delegatedStakers &&
      Object.keys(gateway.delegates).length > 0
    ) {
      let delegatedStakeReward = 0;
      if (Object.keys(gateway.delegates).length >= 10) {
        delegatedStakeReward = HISTORICAL_MANY_DELEGATES_REWARD;
      } else {
        delegatedStakeReward = HISTORICAL_BASIC_DELEGATES_REWARD;
      }
      scores[owner].totalPoints += delegatedStakeReward;
      scores[owner].categories.delegatedStakers = {
        value: fqdn,
        exp: delegatedStakeReward,
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

      if (scores[delegate].categories.stakedGateways) {
        if (Number(scores[delegate].categories.stakedGateways.value) === 5) {
          scores[delegate].totalPoints +=
            HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD;
          scores[delegate].categories.stakedGateways = {
            value: Number(scores[delegate].categories.stakedGateways.value) + 1,
            exp:
              HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD +
              HISTORICAL_MANY_STAKED_GATEWAYS_REWARD,
            awardedOnSprint: 0,
          };
        } else {
          scores[delegate].categories.stakedGateways.value =
            Number(scores[delegate].categories.stakedGateways.value) + 1;
        }
      } else {
        scores[delegate].totalPoints += HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD;
        scores[delegate].categories.stakedGateways = {
          value: 1,
          exp: HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD,
          awardedOnSprint: 0,
        };
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

    // Points for having ArDrive tokens
    for (const owner in arDriveBalances) {
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
        let arDriveExp = 0;
        if (arDriveBalances[owner] !== 0) {
          arDriveExp =
            (HISTORICAL_BASIC_ARDRIVE_REWARD +
              Math.floor(
                arDriveBalances[owner] / HISTORICAL_ARDRIVE_EXP_RATIO
              )) |
            HISTORICAL_BASIC_ARDRIVE_REWARD;
          scores[owner].totalPoints += arDriveExp;
          scores[owner].categories.arDriveBalance = {
            value: arDriveBalances[owner],
            exp: arDriveExp,
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

    // FILTER OUT ALL TEAM/INVESTOR WALLETS
  }

  // TO DO: CLEAR OUT USERS WITH 0 EXP TO GIVE
  // TO DO: FILTER OUT TEAM WALLETS
  // TO DO: ADD TURBO TOPUP/1GB UPLOADS
  // TO DO: ADD AR HOLDERS
  // TO DO: ADD ARDRIVE UPLOADERS
  // TO DO: ADD AR UPLOADERS
  // TO DO: ADD GNAT, GATEWAY OG AND OBSERVER OG
  // TO DO: ADD EVENT PEOPLE

  for (const key in scores) {
    if (scores[key].totalPoints === 0) {
      delete scores[key];
    }
  }
  return scores;
}

export async function loadAndCalculateHistoricalExp(blockHeight?: number) {
  let ioState: any = {};
  let arDriveState: any = {};
  let uState: any = {};
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
    try {
      ioState = await loadJsonFile(ioStatePath);
      arDriveState = await loadJsonFile(ardriveStatePath);
      uState = await loadJsonFile(uStatePath);
    } catch {
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
  if (ioState && arDriveState) {
    console.log("Analyzing snapshot and calculating EXP Rewards");
    scores = calculateHistoricalExp(
      ioState.records,
      ioState.gateways,
      ioState.balances,
      arDriveState.state.balances,
      uState.balances
    );
    const fileName = "historical-exp-rewards-" + blockHeight + ".json";
    saveJsonToFile(scores, fileName);
  }
  analyzeScores(scores);
  return { scores, ioState, arDriveState };
}

// Function to analyze the data
function analyzeScores(data: HistoricalScores): void {
  let totalParticipants = 0;
  let grandTotalPoints = 0;
  const categoryExpSummary: Record<string, number> = {};
  const categoryParticipantCounts: Record<string, number> = {};
  let allCategoriesCount = 0;

  // Initialize counters for each category to zero
  const allCategories: (keyof Categories)[] = [
    "basicName",
    "ogName",
    "basicUndername",
    "rootDataPointerSet",
    "undernameDataPointerSet",
    "controllersAdded",
    "joinedGateway",
    "goodGateway",
    "goodObserver",
    "delegatedStakers",
    "stakedGateways",
    "ioBalance",
    "arDriveBalance",
    "uBalance",
  ];

  allCategories.forEach(
    (category) => (categoryParticipantCounts[category] = 0)
  );

  for (const owner in data) {
    const { totalPoints, categories } = data[owner];
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
  console.log(`Average EXP per User: ${averageEXP.toFixed(2)}`);
  console.log("EXP by Category:", categoryExpSummary);
}
