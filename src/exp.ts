import {
  DEFAULT_ARNS_DATA_POINTER,
  HISTORICAL_BASIC_NAME_REWARD,
  HISTORICAL_BASIC_UNDERNAME_REWARD,
  HISTORICAL_CONTROLLER_REWARD,
  HISTORICAL_JOINED_GATEWAY_REWARD,
  HISTORICAL_MANY_UNDERNAMES_REWARD,
  HISTORICAL_OG_NAME_REWARD,
  HISTORICAL_ROOT_DATA_POINTER_SET_REWARD,
  HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD,
} from "./constants";
import { CachedRecords, Gateways, HistoricalScores } from "./types";
import { isArweaveAddress } from "./utilities";

// Function to calculate scores based on the rules provided
export function calculateArNSExpFlat(records: CachedRecords) {
  const scores: { [key: string]: number } = {};

  for (const key in records) {
    const record = records[key];
    const owner = record.contract.owner;

    // Initialize the score if not already
    if (!scores[owner]) {
      scores[owner] = 0;
    }

    // Basic points for having a record
    scores[owner] += 10;

    // Check for specific transactionId conditions
    if (
      record.contract.records["@"] &&
      record.contract.records["@"].transactionId !== "" &&
      record.contract.records["@"].transactionId !==
        "UyC5P5qKPZaltMmmZAWdakhlDXsBF6qmyrbWYFchRTk"
    ) {
      scores[owner] += 25;
    }

    // Points for having multiple undernames
    if (Object.keys(record.contract.records).length > 1) {
      scores[owner] += 15;
    }

    // Points for having more than 10 undernames purchased
    if (record.undernames > 10) {
      scores[owner] += 5;
    }

    // Points for having controllers
    if (record.contract.controllers) {
      scores[owner] += 10;
    }
  }

  return scores;
}

export function calculateHistoricalExp(
  records: CachedRecords,
  gateways: Gateways
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
        name: key,
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
        name: key,
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
        name: key,
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
          scores[owner].totalPoints += HISTORICAL_BASIC_UNDERNAME_REWARD;
          scores[owner].categories.basicUndername = {
            name: `${undername}_${key}`,
            exp: HISTORICAL_BASIC_UNDERNAME_REWARD,
            awardedOnSprint: 0,
          };
          break;
        }
      }
    }

    // Points for more than 10 undernames
    if (
      record.undernames > 10 &&
      !scores[owner].categories.purchasedMoreUndernames
    ) {
      scores[owner].totalPoints += HISTORICAL_MANY_UNDERNAMES_REWARD;
      scores[owner].categories.purchasedMoreUndernames = {
        name: key,
        exp: HISTORICAL_MANY_UNDERNAMES_REWARD,
        awardedOnSprint: 0,
      };
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
        name: key,
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
            name: `${undername}_${key}`,
            exp: HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD,
            awardedOnSprint: 0,
          };
          break;
        }
      }
    }
  }

  for (const key in gateways) {
    const owner = key;
    const fqdn = gateways[key].settings.fqdn;

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
        name: fqdn,
        exp: HISTORICAL_JOINED_GATEWAY_REWARD,
        awardedOnSprint: 0,
      };
    }
  }

  return scores;
}
