import {
  CACHE_URL,
  DEFAULT_ARNS_DATA_POINTER,
  ZEALY_START_TIMESTAMP,
  testnetProcessId,
} from "./constants";
import { CachedRecords, JWKInterface } from "./types";
import {
  isArweaveAddress,
  loadWallet,
  retryFetch,
  saveJsonToFile,
} from "./utilities";
import { IO, ArweaveSigner } from "@ar.io/sdk";

export async function transferTestTokens(
  target: string,
  qty: number,
  dryRun?: boolean
): Promise<string> {
  // Get the key file used for the distribution
  const wallet: JWKInterface = loadWallet();
  const nodeSigner = new ArweaveSigner(wallet);

  // read and write client that has access to all APIs
  // set up client
  const arIOWriteable = IO.init({
    processId: testnetProcessId,
    signer: nodeSigner,
  });

  if (!dryRun) {
    const transfer = await arIOWriteable.transfer({
      target,
      qty,
    });
    console.log(`Transferred ${qty} to ${target} with txId ${transfer.id}`);
    return transfer.id;
  } else {
    console.log(`Transferred ${qty} to ${target} as dry run`);
    return "dry run";
  }
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

// Function to fetch data from ARNS cache with error handling
export async function getRecords(): Promise<any> {
  try {
    const arIO = IO.init();
    const records = await arIO.getArNSRecords();
    return records;
  } catch (error) {
    console.error(`Error getting records:`, error.message);
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
        `Enriched record ${recordId} with ticker ${contractData.state.ticker}`
      );
    } else {
      console.log(
        `Skipping enrichment for record ${recordId} due to fetch error.`
      );
    }
  }
  return enrichedRecords;
}

export function verifyNameQuests(owner: string, enrichedRecords: any) {
  let basicName: string;
  let rootDataPointerSet: string;
  let multipleUndernames: string;
  let undernameDataPointerSet: string;
  for (const record in enrichedRecords) {
    if (
      enrichedRecords[record].contract.owner === owner &&
      enrichedRecords[record].startTimestamp >= ZEALY_START_TIMESTAMP &&
      enrichedRecords[record].contract.records["@"]
    ) {
      if (
        enrichedRecords[record].contract.records["@"].transactionId ===
        DEFAULT_ARNS_DATA_POINTER
      ) {
        basicName = record;
      } else if (
        isArweaveAddress(
          enrichedRecords[record].contract.records["@"].transactionId
        )
      ) {
        basicName = record;
        rootDataPointerSet =
          enrichedRecords[record].contract.records["@"].transactionId;
      }

      if (Object.keys(enrichedRecords[record].contract.records).length) {
        for (const undername in enrichedRecords[record].contract.records) {
          if (
            undername !== "@" &&
            enrichedRecords[record].contract.records[undername]
              .transactionId === DEFAULT_ARNS_DATA_POINTER
          ) {
            multipleUndernames = undername; // do not break in case we want to check if other undernames have the data pointer set
          } else if (
            undername !== "@" &&
            isArweaveAddress(
              enrichedRecords[record].contract.records[undername].transactionId
            )
          ) {
            multipleUndernames = undername;
            undernameDataPointerSet =
              enrichedRecords[record].contract.records[undername].transactionId;
            break;
          }
        }
      }
    }
  }
  return {
    basicName,
    rootDataPointerSet,
    multipleUndernames,
    undernameDataPointerSet,
  };
}

export async function fetchSaveAndEnrichIOState(blockHeight: number) {
  try {
    const records = await getRecords();
    console.log("Got state");
    const enrichedRecords = await enrichRecords(CACHE_URL, records);
    enrichedRecords;

    const fileName = "ar-io-state-enriched-records" + blockHeight + ".json";
    saveJsonToFile(enrichedRecords, fileName);
    console.log(
      `AR.IO Contract state data has been fetched and saved as ${fileName}, with skipped records where data could not be enriched.`
    );
    return records;
  } catch (err) {
    console.log(err);
    return false;
  }
}
