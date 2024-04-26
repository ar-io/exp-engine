import { calculateArNSExp } from "./exp";
import { CachedRecords, JWKInterface } from "./types";
import {
  loadJsonFile,
  loadWallet,
  retryFetch,
  saveJsonToFile,
} from "./utilities";
import { ArIO, ArweaveSigner, DENOMINATIONS } from "@ar.io/sdk";
import path from "path";

export const cacheUrl = "https://api.arns.app/v1/contract";
export const contractId = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";

export async function transferTestTokens(
  target: string,
  qty: number,
  dryRun?: boolean
): Promise<string> {
  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();
  const nodeSigner = new ArweaveSigner(wallet);

  // read and write client that has access to all APIs
  const arIOWriteable = ArIO.init({
    signer: nodeSigner,
    contractTxId: contractId,
  });

  if (!dryRun) {
    const transfer = await arIOWriteable.transfer({
      target,
      qty,
      denomination: DENOMINATIONS.IO,
    });
    console.log(`Transferred ${qty} tIO to ${target} with txId ${transfer.id}`);
    return transfer.id;
  } else {
    console.log(`Transferred ${qty} tIO to ${target} as dry run`);
    return "dry run";
  }
}

interface CacheResponse {
  contractTxId: string;
  state: any;
}

// Function to fetch data from ARNS cache with error handling
export async function fetchCache(url: string): Promise<any> {
  try {
    const response = await retryFetch(url);
    return JSON.parse(await response.data);
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error.message);
    return null; // Return null to indicate a failed fetch
  }
}

export async function enrichRecords(cacheUrl: string, records: CachedRecords) {
  const enrichedRecords: CachedRecords = {};
  for (const recordId in records) {
    const record = records[recordId];
    const contractData = await fetchCache(`${cacheUrl}/${record.contractTxId}`);
    if (contractData) {
      // Check if fetch was successful
      enrichedRecords[recordId] = record;
      enrichedRecords[recordId].contract = contractData.state;
      console.log(
        `Enriched reocrd ${recordId} with ticker ${contractData.state.ticker}`
      );
    } else {
      console.log(
        `Skipping enrichment for record ${recordId} due to fetch error.`
      );
    }
  }
  return enrichedRecords;
}

export async function verifyNameOwnership(owner: string, enrichedRecords: any) {
  for (const record in enrichedRecords) {
    if (
      enrichedRecords[record].contract.owner === owner &&
      enrichedRecords[record].startTimestamp >= "1714156995"
    ) {
      return true;
    }
  }
  return false;
}

export async function fetchAndSaveCache() {
  try {
    const data: CacheResponse = await fetchCache(`${cacheUrl}/${contractId}`);
    const enrichedRecords = await enrichRecords(cacheUrl, data.state.records);
    data.state.records = enrichedRecords;

    const fileName = "ar-io-state-" + data.state.lastTickedHeight + ".json";
    saveJsonToFile(data, fileName);
    console.log(
      `AR.IO Contract state data has been fetched and saved as ${fileName}, with skipped records where data could not be enriched.`
    );
    return data;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function calculateOnChainExpRewards(lastTickedHeight?: number) {
  let cache: any = {};
  if (lastTickedHeight) {
    const cacheFilePath = path.join(
      __dirname,
      "..",
      "data",
      `ar-io-state-${lastTickedHeight}.json`
    );
    cache = await loadJsonFile(cacheFilePath);
  } else {
    console.log("Fetching and saving the latest ar.io cache");
    cache = await fetchAndSaveCache();
  }

  let scores = {};
  if (cache) {
    console.log("Analyzing ArNS data and calculating EXP");
    const scores = calculateArNSExp(cache.state.records);
    const fileName = "exp-arns-" + cache.state.lastTickedHeight + ".json";
    saveJsonToFile(scores, fileName);
    console.log(`Saved to disk at ${fileName}`);
  }
  return { scores, cache };
}
