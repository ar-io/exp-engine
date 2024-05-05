// Import axios
import { GATEWAY_URL, keyfile } from "./constants";
import { JWKInterface } from "./types";
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
