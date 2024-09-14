// Import axios
import {
  EXP_DENOMINATION,
  GATEWAY_URL,
  expAirdropKeyfile,
  tIOfaucetKeyfile,
} from "./constants";
import { AirdropList, Balances, HistoricalScores, JWKInterface } from "./types";
import axios, { AxiosResponse } from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";
import fs from "fs";
import * as path from "path";

export function loadWallet(type?: string): JWKInterface {
  if (type === "faucet" || type === "tio") {
    if (fs.existsSync(tIOfaucetKeyfile)) {
      return JSON.parse(fs.readFileSync(tIOfaucetKeyfile, "utf8"));
    }
  } else if (type === "exp") {
    if (fs.existsSync(expAirdropKeyfile)) {
      return JSON.parse(fs.readFileSync(expAirdropKeyfile, "utf8"));
    }
  } else if (process.env.JWK) {
    return JSON.parse(process.env.JWK);
  }

  throw new Error(
    "No wallet found. Provide it via WALLET_FILE_PATH or JWK, or update the `expAirdropKeyfile` path in constants.ts"
  );
}

export async function retryFetch(reqURL: string): Promise<AxiosResponse<any>> {
  const axiosInstance = axios.create();
  const maxRetries = 3;
  axiosRetry(axiosInstance, {
    retries: maxRetries,
    retryDelay: (retryNumber) => {
      console.error(
        `Retry attempt ${retryNumber}/${maxRetries} of request to ${reqURL}`
      );
      return exponentialDelay(retryNumber);
    },
  });
  return await axiosInstance.get(reqURL, {
    responseType: "arraybuffer",
  });
}

// Gets the latest block height
export async function getCurrentBlockHeight() {
  let height = 0;
  try {
    const response = await retryFetch(GATEWAY_URL + "height");
    height = await response.data;
    return height;
  } catch (err) {}
  return height;
}

export function saveJsonToFile(data: Object, filename: string): void {
  // Resolve the path to the directory where the JSON file will be saved
  const dataPath = path.join(__dirname, "..", "data", filename);

  // Convert the data object to a JSON string
  const jsonData = JSON.stringify(data, null, 2);

  // Write the JSON string to a file in the specified directory
  try {
    fs.writeFileSync(dataPath, jsonData); // Use writeFileSync instead of writeFile
    console.log("File successfully written to:", dataPath);
  } catch (err) {
    console.error("Error writing JSON to file:", err);
  }
}

export function saveBalancesToFile(
  data: HistoricalScores,
  filename: string
): void {
  const balances: Balances = {};
  for (const key in data) {
    balances[key] = data[key].totalPoints;
  }

  // Resolve the path to the directory where the JSON file will be saved
  const dataPath = path.join(__dirname, "..", "data", filename);

  // Convert the data object to a JSON string
  const jsonBalancesData = JSON.stringify(balances, null, 2);

  // Write the JSON string to a file in the specified directory
  fs.writeFile(dataPath, jsonBalancesData, (err) => {
    if (err) {
      console.error("Error writing Balances JSON to file:", err);
      return;
    }
  });
}

export function loadJsonFile(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseError) {
          console.log("Error processing: ", filePath);
          reject(parseError);
        }
      }
    });
  });
}

export async function loadCachedZealyUserInfo(): Promise<any> {
  let zealyUserInfo: any = {};
  const zealyUserInfoFilePath = path.join(
    __dirname,
    "..",
    "data",
    "zealy-user-info.json"
  );
  try {
    zealyUserInfo = await loadJsonFile(zealyUserInfoFilePath);
  } catch (err) {
    console.log(err);
  }
  return zealyUserInfo;
}

export async function loadCachedBannedZealyUsers(): Promise<any> {
  let bannedZealyUsers: any = {};
  const bannedZealyUsersFilePath = path.join(
    __dirname,
    "..",
    "data",
    `banned-zealy-users.json`
  );
  try {
    bannedZealyUsers = await loadJsonFile(bannedZealyUsersFilePath);
  } catch (err) {
    console.log(err);
  }
  return bannedZealyUsers;
}

export async function loadJsonStateFile(blockHeight: number): Promise<any> {
  let state: any = {};
  const cacheFilePath = path.join(
    __dirname,
    "..",
    "data",
    `ar-io-state-${blockHeight}.json`
  );
  try {
    state = await loadJsonFile(cacheFilePath);
  } catch {
    console.log(`No saved state found at block height ${blockHeight}`);
  }
  return state;
}

export function isArweaveAddress(address: string): boolean {
  const trimmedAddress = address.toString().trim();
  const ARWEAVE_TX_REGEX = new RegExp("^[a-zA-Z0-9-_s+]{43}$");
  return ARWEAVE_TX_REGEX.test(trimmedAddress);
}

export function jsonToCSV(json: HistoricalScores): string {
  const allCategories = new Set<string>();
  Object.values(json).forEach((score) => {
    Object.keys(score.categories).forEach((category) => {
      allCategories.add(category);
    });
  });

  const headers = ["Owner", "Total Points", "Total Names", ...allCategories];
  let csv = headers.join(",") + "\n";

  for (const owner in json) {
    const details = json[owner];
    const row = [
      owner,
      details.totalPoints,
      details.totalNames,
      ...Array.from(allCategories).map(
        (category) => details.categories[category]?.exp ?? ""
      ), // Use optional chaining and nullish coalescing
    ];
    csv += row.join(",") + "\n";
  }
  return csv;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to write CSV to disk
export function writeCSVToFile(csvData: string, filename: string) {
  const filepath = path.join(__dirname, "..", "data", filename);
  fs.writeFileSync(filepath, csvData);
  console.log(`CSV file has been saved to ${filepath}`);
}

export async function fixAirDropList() {
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
    return false;
  }

  for (const recipient in airdropList.recipients) {
    airdropList.recipients[recipient].expRewarded =
      airdropList.recipients[recipient].expRewarded * EXP_DENOMINATION; // Multiply by 1000000 to account for latest denomination
    for (const sprint in airdropList.recipients[recipient]
      .sprintsParticipated) {
      airdropList.recipients[recipient].sprintsParticipated[
        sprint
      ].expRewarded =
        airdropList.recipients[recipient].sprintsParticipated[sprint]
          .expRewarded * EXP_DENOMINATION; // Multiply by 1000000 to account for latest denomination
    }
  }

  // Save results of the airdrop as a new sprint in the airdrop-list
  saveJsonToFile(airdropList, "airdrop-list-fixed-denomination.json");
  return true;
}

// Function to chunk an object into smaller objects with a specified maximum size
export function chunkObject<T>(
  obj: Record<string, T>,
  chunkSize: number
): Record<string, T>[] {
  const chunks: Record<string, T>[] = [];
  let currentChunk: Record<string, T> = {};
  let currentSize = 0;

  for (const key in obj) {
    if (currentSize >= chunkSize) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentSize = 0;
    }
    currentChunk[key] = obj[key];
    currentSize++;
  }

  if (currentSize > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
