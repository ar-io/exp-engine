// Import axios
import axios, { AxiosResponse } from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";
import fs from 'fs';
import * as path from 'path';
import { keyfile } from "./constants";
import { JWKInterface } from "./types";

const gatewayUrl = 'https://arweave.net/'

export const loadWallet = (): JWKInterface => {
    if (process.env.JWK) {
      return JSON.parse(process.env.JWK);
    }
    if (fs.existsSync(keyfile)) {
      return JSON.parse(fs.readFileSync(keyfile, 'utf8'));
    }
  
    throw new Error(
      'No wallet found. Provide it via WALLET_FILE_PATH or JWK, or update the `keyfile` path in constants.ts',
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
      const response = await retryFetch(gatewayUrl + 'height');
      height = await response.data;
      return height;
    } catch (err) {}
    return height;
}

export function saveJsonToFile(data: Object, filename: string): void {
    // Resolve the path to the directory where the JSON file will be saved
    const dataPath = path.join(__dirname, '..', 'data', filename);
  
    // Convert the data object to a JSON string
    const jsonData = JSON.stringify(data, null, 2);
  
    // Write the JSON string to a file in the specified directory
    fs.writeFile(dataPath, jsonData, (err) => {
        if (err) {
            console.error('Error writing JSON to file:', err);
            return;
        }
        console.log(`File successfully saved to ${dataPath}`);
    });
}

export function loadJsonFile(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (parseError) {
                    reject(parseError);
                }
            }
        });
    });
}