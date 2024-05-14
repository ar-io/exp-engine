// Import axios
import { GATEWAY_URL, keyfile } from "./constants";
import { Balances, HistoricalScores, JWKInterface } from "./types";
import axios, { AxiosResponse } from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";
import fs from "fs";
import * as path from "path";

export const loadWallet = (): JWKInterface => {
  if (process.env.JWK) {
    return JSON.parse(process.env.JWK);
  }
  if (fs.existsSync(keyfile)) {
    return JSON.parse(fs.readFileSync(keyfile, "utf8"));
  }

  throw new Error(
    "No wallet found. Provide it via WALLET_FILE_PATH or JWK, or update the `keyfile` path in constants.ts"
  );
};

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
  fs.writeFile(dataPath, jsonData, (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
      return;
    }
  });
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
    `zealy-user-info.json`
  );
  try {
    zealyUserInfo = await loadJsonFile(zealyUserInfoFilePath);
  } catch (err) {
    console.log(err);
  }
  return zealyUserInfo;
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
