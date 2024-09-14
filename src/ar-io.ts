import { chunkAndLoadBalances } from "./aoconnect";
import {
  AO_CU_URL,
  CACHE_URL,
  DEFAULT_ARNS_DATA_POINTER,
  FAUCET_MTIO_QUANTITY,
  ZEALY_START_TIMESTAMP,
  testnetProcessId,
} from "./constants";
import { CachedRecords, FaucetRecipient, JWKInterface } from "./types";
import {
  isArweaveAddress,
  loadJsonFile,
  loadWallet,
  retryFetch,
  saveJsonToFile,
} from "./utilities";
import { IO, ArweaveSigner, ANT, AOProcess } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import path from "path";

// Get the key file used for the distribution
const wallet: JWKInterface = loadWallet("faucet");
const nodeSigner = new ArweaveSigner(wallet);
// read and write client that has access to all APIs
// set up client
const arIOWriteable = IO.init({
  processId: testnetProcessId,
  signer: nodeSigner,
});

export const io = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: AO_CU_URL,
    }),
  }),
  signer: new ArweaveSigner(wallet),
});

export async function transferTestTokens(
  target: string,
  qty: number,
  dryRun?: boolean
): Promise<string> {
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

// The following will distribute test IO tokens
export async function airdropTestTokens(
  dryRun: boolean = true,
  fileName: string,
  allowDoubleDip: boolean = true
) {
  let faucetRecipients: { [key: string]: FaucetRecipient } = {};
  try {
    const faucetRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      "faucet-recipients.json"
    );
    faucetRecipients = await loadJsonFile(faucetRecipientsFilePath);
  } catch {
    console.log(
      "Faucet Recipients data is missing.  Ensure faucet-recipients.json exists in the data directory"
    );
    return {};
  }

  let completedAirDropRecipients: { [key: string]: FaucetRecipient } = {};
  let airDropRecipients: { [key: string]: number } = {};
  try {
    const airDropRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      fileName
    );
    airDropRecipients = await loadJsonFile(airDropRecipientsFilePath);
  } catch {
    console.log(
      "Airdrop Recipients data is missing.  Ensure airdrop recipients json exists in the data directory"
    );
    return {};
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  for (const arweaveAddress in airDropRecipients) {
    let receivedFaucet = false;
    if (faucetRecipients[arweaveAddress]) {
      receivedFaucet = true;
    }

    if (receivedFaucet === true && allowDoubleDip === false) {
      console.log(
        `${arweaveAddress} is not eligible for airdrop since they already received the faucet`
      );
      continue;
    }

    //console.log("- Sending Faucet reward");
    const transferTxId = await transferTestTokens(
      arweaveAddress,
      FAUCET_MTIO_QUANTITY,
      dryRun
    );
    faucetRecipients[arweaveAddress] = {
      zealyId: "airdrop",
      transferTxId,
      timestamp: Math.floor(Date.now() / 1000),
    };
    completedAirDropRecipients[arweaveAddress] =
      faucetRecipients[arweaveAddress];
  }
  saveJsonToFile(faucetRecipients, "faucet-recipients.json");
  saveJsonToFile(
    completedAirDropRecipients,
    `tio-airdrop-recipients-${currentTimestamp}.json`
  );
  console.log(
    `Airdropped tIO to ${Object.keys(completedAirDropRecipients).length} users`
  );
  return completedAirDropRecipients;
}

export async function airdropExpTokens(
  dryRun: boolean = true,
  fileName: string
) {
  let airDropRecipients: { [key: string]: number } = {};
  try {
    const airDropRecipientsFilePath = path.join(
      __dirname,
      "..",
      "data",
      fileName
    );
    airDropRecipients = await loadJsonFile(airDropRecipientsFilePath);
  } catch {
    console.log(
      "Airdrop Recipients data is missing.  Ensure airdrop recipients json exists in the data directory"
    );
    return {};
  }
  const result = await chunkAndLoadBalances(airDropRecipients, dryRun);
  return result;
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
    const arIO = IO.init({
      process: new AOProcess({
        processId: testnetProcessId,
        ao: connect({
          CU_URL: AO_CU_URL,
        }),
      }),
    });

    const records = await arIO.getArNSRecords({ limit: 100000 });
    return records.items;
  } catch (error) {
    console.error(`Error getting records:`, error.message);
    return null; // Return null to indicate a failed fetch
  }
}

export async function getGateways(): Promise<any> {
  try {
    const arIO = IO.init({
      process: new AOProcess({
        processId: testnetProcessId,
        ao: connect({
          CU_URL: AO_CU_URL,
        }),
      }),
    });

    const gateways = await arIO.getGateways({
      limit: 10000,
      sortOrder: "desc",
      sortBy: "operatorStake",
    });

    return gateways.items;
  } catch (error) {
    console.error(`Error getting records:`, error.message);
    return null; // Return null to indicate a failed fetch
  }
}

export async function getState(processId: string): Promise<any> {
  try {
    const ant = ANT.init({ processId });
    const state = await ant.getState();
    return state;
  } catch (error) {
    console.error(`Error getting state:`, error.message);
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

export async function getTxInformation(txId: String): Promise<any> {
  const query = {
    query: `query {
          transactions(
            ids: ["${txId}"]
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
  };

  try {
    const response = await fetch(`https://arweave.net/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });

    const data = await response.json();

    if (data === undefined) {
      //console.log(response.statusText);
      //console.log(response);
      console.log("Undefined data returned from Gateway");
      return {};
    }
    return data;
  } catch (err) {
    console.log(err);
    console.log("Error getting transactions");
    return {};
  }
}
