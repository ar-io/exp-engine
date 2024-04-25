import { CachedRecords, JWKInterface } from "./types";
import { loadWallet, retryFetch, saveJsonToFile } from "./utilities";
import { ArIO, ArweaveSigner, DENOMINATIONS } from "@ar.io/sdk";

const cacheUrl = "https://api.arns.app/v1/contract";
const contractId = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";
const faucetAmount = 1000;

export async function airdropTestTokens(
  arweaveWallet: string
): Promise<string> {
  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();
  const nodeSigner = new ArweaveSigner(wallet);

  // read and write client that has access to all APIs
  const arIOWriteable = ArIO.init({
    signer: nodeSigner,
    contractTxId: contractId,
  });

  const transfer = await arIOWriteable.transfer({
    target: arweaveWallet,
    qty: faucetAmount,
    denomination: DENOMINATIONS.IO,
  });

  console.log(
    `Airdropped ${faucetAmount} tIO to ${arweaveWallet} with txId ${transfer.id}`
  );
  return transfer.id;
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

export async function fetchAndSaveCache() {
  try {
    const data: CacheResponse = await fetchCache(`${cacheUrl}/${contractId}`);
    const enrichedRecords = await enrichRecords(cacheUrl, data.state.records);
    data.state.records = enrichedRecords;

    const fileName = "ar-io-" + data.state.lastTickedHeight + ".json";
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
