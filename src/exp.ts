import { DEFAULT_ARNS_DATA_POINTER } from "./constants";
import { CachedRecords } from "./types";

interface ScoreDetail {
  totalPoints: number;
  totalNames: number;
  names: string[];
  categories: {
    basicRecord: { name: string; points: number; awarded: boolean };
    rootTransactionIdCheck: { name: string; points: number; awarded: boolean };
    multipleUndernames: { name: string; points: number; awarded: boolean };
    moreThanTenUndernames: { name: string; points: number; awarded: boolean };
    controllersAdded: { name: string; points: number; awarded: boolean };
  };
}

interface Scores {
  [owner: string]: ScoreDetail;
}

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

export function calculateArNSExp(records: CachedRecords): Scores {
  const scores: Scores = {};

  for (const key in records) {
    const record = records[key];
    const owner = record.contract.owner;

    // Initialize the score detail if not already
    if (!scores[owner]) {
      scores[owner] = {
        totalPoints: 0,
        totalNames: 0,
        names: [],
        categories: {
          basicRecord: { name: "", points: 0, awarded: false },
          rootTransactionIdCheck: { name: "", points: 0, awarded: false },
          multipleUndernames: { name: "", points: 0, awarded: false },
          moreThanTenUndernames: { name: "", points: 0, awarded: false },
          controllersAdded: { name: "", points: 0, awarded: false },
        },
      };
    }
    scores[owner].totalNames += 1;
    scores[owner].names.push(key);

    // Basic points for having a record
    if (scores[owner].categories.basicRecord.awarded === false) {
      scores[owner].totalPoints += 10;
      scores[owner].categories.basicRecord.name = key;
      scores[owner].categories.basicRecord.points += 10;
      scores[owner].categories.basicRecord.awarded = true;
    }

    // Specific transactionId conditions
    if (
      record.contract.records["@"] &&
      record.contract.records["@"].transactionId !== "" &&
      record.contract.records["@"].transactionId !==
        DEFAULT_ARNS_DATA_POINTER &&
      scores[owner].categories.rootTransactionIdCheck.awarded === false
    ) {
      scores[owner].totalPoints += 25;
      scores[owner].categories.rootTransactionIdCheck.name = key;
      scores[owner].categories.rootTransactionIdCheck.points += 25;
      scores[owner].categories.rootTransactionIdCheck.awarded = true;
    }

    // Points for having multiple undernames
    if (
      Object.keys(record.contract.records).length > 1 &&
      scores[owner].categories.multipleUndernames.awarded === false
    ) {
      scores[owner].totalPoints += 15;
      scores[owner].categories.multipleUndernames.name = key;
      scores[owner].categories.multipleUndernames.points += 15;
      scores[owner].categories.multipleUndernames.awarded = true;
    }

    // Points for more than 10 undernames
    if (
      record.undernames > 10 &&
      scores[owner].categories.moreThanTenUndernames.awarded === false
    ) {
      scores[owner].totalPoints += 5;
      scores[owner].categories.moreThanTenUndernames.name = key;
      scores[owner].categories.moreThanTenUndernames.points += 5;
      scores[owner].categories.moreThanTenUndernames.awarded = true;
    }

    // Points for having a controller
    if (
      record.contract.controllers &&
      scores[owner].categories.controllersAdded.awarded === false
    ) {
      scores[owner].totalPoints += 10;
      scores[owner].categories.controllersAdded.name = key;
      scores[owner].categories.controllersAdded.points += 10;
      scores[owner].categories.controllersAdded.awarded = true;
    }
  }

  return scores;
}
