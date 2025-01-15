import {
  ARDRIVE_CU,
  protocolLandProcessId,
  scoringRules,
  TESTNET_CU,
  testnetProcessId,
} from "./constants";
import { AOProcess, IO } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";

export const ario = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: ARDRIVE_CU,
    }),
  }),
});

export const { dryrun } = connect({
  CU_URL: TESTNET_CU,
});

// Function to parse a CSV file into an array of objects
export async function parseCSV(fileName: string): Promise<any[]> {
  const records: any[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (data) => records.push(data))
      .on("end", () => resolve(records))
      .on("error", (err) => reject(err));
  });
}

// Function to write scores to a CSV
export async function writeScoresToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    console.warn(`No data to write for ${fileName}. Skipping.`);
    return;
  }

  // Add timestamp to file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileNameWithTimestamp = fileName.replace(".csv", `_${timestamp}.csv`);

  const headers = Object.keys(data[0]).map((key) => ({
    id: key,
    title: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  const csvWriter = createObjectCsvWriter({
    path: fileNameWithTimestamp,
    header: headers,
  });

  await csvWriter.writeRecords(data);
  console.log(`Scores written to ${fileNameWithTimestamp}`);
}

// Function to merge CSV files with exclusions
export async function mergeCSVs(
  filePatterns: string[],
  outputFileName: string,
  exclusionsFile: string
) {
  const mergedScores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};
  const allCategories = new Set<string>(); // Track all unique categories

  // Load exclusions list
  const exclusions = await loadExclusions(exclusionsFile);

  for (const pattern of filePatterns) {
    const directory = path.dirname(pattern) || ".";
    const baseName = path.basename(pattern).replace("_*.csv", "");

    const matchingFiles = fs
      .readdirSync(directory)
      .filter((file) => file.startsWith(baseName) && file.endsWith(".csv"))
      .sort(); // Sort files alphabetically (latest timestamp will be last)

    if (matchingFiles.length === 0) {
      console.warn(
        `No matching files found for pattern: ${pattern}. Skipping.`
      );
      continue;
    }

    const latestFile = path.join(
      directory,
      matchingFiles[matchingFiles.length - 1]
    );

    console.log(`Using latest file for pattern "${pattern}": ${latestFile}`);

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(latestFile)
          .pipe(csv())
          .on("data", (data) => {
            const address = data.address || data.Address;
            if (!address) {
              console.log(data);
              console.warn(
                `Missing address in file ${latestFile}. Skipping row.`
              );
              return;
            }

            if (exclusions.has(address)) {
              // console.log(`[INFO] Excluded address: ${address}`);
              return; // Skip excluded addresses
            }

            if (!mergedScores[address]) {
              mergedScores[address] = { totalScore: 0, categories: {} };
            }

            // Process category scores, excluding `address` and `totalScore`
            for (const key of Object.keys(data)) {
              if (
                key.toLowerCase() === "address" ||
                key.toLowerCase() === "totalscore"
              ) {
                continue; // Skip reserved keys
              }

              const value = parseInt(data[key], 10) || 0;
              allCategories.add(key);

              // Add to the category score
              if (!mergedScores[address].categories[key]) {
                mergedScores[address].categories[key] = 0;
              }
              mergedScores[address].categories[key] += value;
            }

            // Update the total score
            mergedScores[address].totalScore = Object.values(
              mergedScores[address].categories
            ).reduce((acc, val) => acc + val, 0);
          })
          .on("end", resolve)
          .on("error", reject);
      });
    } catch (err) {
      console.error(`Error processing file ${latestFile}:`, err);
      throw err;
    }
  }

  // Prepare data for CSV
  const formattedScores = Object.entries(mergedScores).map(
    ([address, data]) => {
      const row: Record<string, number | string> = {
        address,
        totalScore: data.totalScore * 1000000,
      };

      // Add all categories dynamically, defaulting missing ones to 0
      for (const category of allCategories) {
        row[category] = data.categories[category] || 0;
      }

      return row;
    }
  );

  // Sort rows by TotalScore in descending order
  const sortedScores = formattedScores.sort(
    (a, b) => Number(b.totalScore) - Number(a.totalScore)
  );

  // Append the current timestamp to the output file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileNameWithTimestamp = `${outputFileName.replace(
    ".csv",
    ""
  )}_${timestamp}.csv`;

  await writeScoresToCSV(sortedScores, outputFileNameWithTimestamp);
  console.log(`Merged scores written to ${outputFileNameWithTimestamp}`);
}

export async function loadExclusions(fileName: string): Promise<Set<string>> {
  const exclusions = new Set<string>();
  if (!fs.existsSync(fileName)) {
    console.warn(`[WARN] Exclusions file "${fileName}" not found. Skipping.`);
    return exclusions;
  }

  console.log(`[INFO] Loading exclusions from ${fileName}...`);

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (row) => {
        if (row.Address) {
          exclusions.add(row.Address.trim());
        } else {
          console.warn(
            `[WARN] Missing Address in exclusions row: ${JSON.stringify(row)}`
          );
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`[INFO] Loaded ${exclusions.size} exclusions.`);
  return exclusions;
}

// Function to calculate points based on wallet age
export function calculateAgePoints(firstTransactionTimestamp: number): number {
  const currentTime = Date.now() / 1000; // Current time in seconds
  const walletAgeInYears =
    (currentTime - firstTransactionTimestamp) / (365 * 24 * 60 * 60);
  const maxPoints = 1500; // Maximum points for the oldest wallets
  return Math.min(maxPoints, Math.floor(300 * Math.log2(walletAgeInYears + 1))); // Scaled log2 growth
}

// Fetch first transaction timestamp using GraphQL
export async function fetchFirstTransactionTimestamp(
  address: string
): Promise<number | null> {
  const query = `
    query {
      transactions(owners: ["${address}"], first: 1, sort: HEIGHT_ASC) {
        edges {
          node {
            block {
              timestamp
            }
          }
        }
      }
    }
  `;

  try {
    // const response = await fetch("https://arweave.net/graphql", {
    const response = await fetch("https://arweave-search.goldsky.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(
        `[ERROR] Fetching first transaction for ${address}: HTTP ${response.status}`
      );
      return null;
    }

    const textResponse = await response.text();

    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (jsonError) {
      console.error(
        `[ERROR] Failed to parse JSON for ${address}: ${jsonError.message}`
      );
      console.error(`[DEBUG] Raw response: ${textResponse}`);
      return null;
    }

    const timestamp =
      result?.data?.transactions?.edges[0]?.node?.block?.timestamp;
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error(
      `[ERROR] Fetching first transaction for ${address}: ${error.message}`
    );
    return null;
  }
}

// Fetch gateways
export async function fetchGateways() {
  const ario = IO.init({
    process: new AOProcess({
      processId: testnetProcessId,
      ao: connect({
        CU_URL: TESTNET_CU,
      }),
    }),
  });
  let cursor: string | undefined;
  const allGateways: any[] = [];

  do {
    const { items, nextCursor } = await ario.getGateways({
      cursor,
      limit: 1000,
      sortBy: "gatewayAddress",
      sortOrder: "desc",
    });

    allGateways.push(...items);
    cursor = nextCursor;
  } while (cursor);

  console.log(`Fetched ${allGateways.length} gateways`); // Add this line
  return allGateways;
}

// Fetch delegations for a gateway
export async function fetchDelegations(gatewayAddress: string) {
  const ario = IO.init({
    process: new AOProcess({
      processId: testnetProcessId,
      ao: connect({
        CU_URL: TESTNET_CU,
      }),
    }),
  });
  let cursor: string | undefined;
  const allDelegations: any[] = [];

  do {
    const { items, nextCursor } = await ario.getGatewayDelegates({
      address: gatewayAddress,
      cursor,
      limit: 1000,
      sortBy: "startTimestamp",
      sortOrder: "asc",
    });

    allDelegations.push(...items);
    cursor = nextCursor;
  } while (cursor);

  return allDelegations;
}

// Fetch all ArNS records
export async function fetchArNSRecords() {
  const ario = IO.init({
    process: new AOProcess({
      processId: testnetProcessId,
      ao: connect({
        CU_URL: TESTNET_CU,
      }),
    }),
  });

  let cursor: string | undefined;
  const allRecords: any[] = [];

  do {
    const { items, nextCursor } = await ario.getArNSRecords({
      cursor,
      limit: 1000,
      sortBy: "name",
      sortOrder: "asc",
    });

    allRecords.push(...items);
    cursor = nextCursor;
  } while (cursor);

  console.log(`- Fetched ${allRecords.length} ArNS records`);
  return allRecords;
}

// Fetch primary names
export async function fetchPrimaryNames() {
  const ario = IO.init({
    process: new AOProcess({
      processId: testnetProcessId,
      ao: connect({
        CU_URL: TESTNET_CU,
      }),
    }),
  });
  let cursor: string | undefined;
  const primaryNames: { [address: string]: string } = {};

  do {
    const { items, nextCursor } = await ario.getPrimaryNames({
      cursor,
      limit: 1000,
      sortBy: "startTimestamp",
      sortOrder: "desc",
    });

    for (const item of items) {
      primaryNames[item.owner] = item.name;
    }

    cursor = nextCursor;
  } while (cursor);

  return primaryNames;
}

// Check token balances with minimum thresholds
export async function fetchTokenBalances(
  processId: string
): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};

  try {
    const response = await dryrun({
      process: processId,
      tags: [{ name: "Action", value: "Balances" }],
    });

    const balancesData: Record<string, string | number> = JSON.parse(
      response.Messages[0].Data
    );

    for (const [address, balance] of Object.entries(balancesData)) {
      balances[address] =
        typeof balance === "string" ? parseFloat(balance) : balance;
    }
  } catch (err) {
    console.error(
      `Error fetching token balances for process ID ${processId}:`,
      err
    );
  }

  return balances;
}

// Fetch vouched users
export async function fetchVouchedUsers(
  processId: string
): Promise<Set<string>> {
  const vouchedAddresses = new Set<string>();

  try {
    const response = await dryrun({
      process: processId,
      Owner: "3Xf5GXD-kX2K1_SHAHLBoRm-pKtg8rXLcP6bfmhFnWk",
      data: `function getVouchRecords()\n  local sql = [[\n    SELECT *\n    FROM Vouched\n  ]]\n  local stmt = db:prepare(sql)\n  local records = {}\n  if stmt then\n    for record in stmt:nrows() do\n      table.insert(records, record)\n    end\n    stmt:finalize()\n  end\n  return records\nend\n\nreturn require('json').encode(getVouchRecords())`,
      tags: [{ name: "Action", value: "Eval" }],
    });

    const vouchedData = JSON.parse(response.Output.data.output);

    for (const record of vouchedData) {
      const address = record.VouchFor;
      const confidenceValue = record.ConfidenceValue || "0-USD";

      // Extract the numeric portion of ConfidenceValue
      const numericValue = parseFloat(confidenceValue.split("-")[0]) || 0;

      if (address && numericValue > 0) {
        vouchedAddresses.add(address);
      }
    }
  } catch (err) {
    console.error(
      `Error fetching vouched users for process ID ${processId}:`,
      err
    );
  }

  return vouchedAddresses;
}

export async function fetchProtocolLandUsers(): Promise<Set<string>> {
  const protocolLandUsers = new Set<string>();
  try {
    const response = await dryrun({
      process: protocolLandProcessId,
      tags: [{ name: "Action", value: "Get-Users" }],
    });

    const protocolLandUserData: Record<string, any> = JSON.parse(
      response.Messages[0].Data
    ).result;

    for (const address of Object.keys(protocolLandUserData)) {
      protocolLandUsers.add(address);
    }
  } catch (err) {
    console.log("Error fetching Protocol Land users:", err);
  }
  return protocolLandUsers;
}

export async function fetchPermawebDeployUsers(): Promise<Set<string>> {
  const permawebDeployUsers = new Set<string>();
  const query = `
      query($cursor: String) {
        transactions(
          first: 100,
          after: $cursor,
          tags: [
            { name: "App-Name", values: ["Permaweb-Deploy"] },
            { name: "Content-Type", values: ["application/x.arweave-manifest+json"] }
          ]
        ) {
          edges {
            node {
              owner {
                address
              }
            }
            cursor
          }
        }
      }
    `;

  const fetchWithRetry = async (
    cursor: string | null,
    attempts = 5,
    delay = 1000
  ): Promise<any> => {
    try {
      // const response = await fetch("https://arweave.net/graphql", {
      const response = await fetch(
        "https://arweave-search.goldsky.com/graphql",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { cursor } }),
        }
      );

      const result: any = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        throw new Error(result.errors[0]?.message || "Unknown GraphQL error");
      }

      return result;
    } catch (err) {
      if (attempts > 1) {
        console.warn(
          `Request failed: ${err.message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(cursor, attempts - 1, delay * 2); // Exponential backoff
      } else {
        console.error("Request failed after maximum retries:", err);
        throw err; // Give up after max attempts
      }
    }
  };

  try {
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
      const result = await fetchWithRetry(cursor);

      const edges = result?.data?.transactions?.edges || [];

      for (const edge of edges) {
        permawebDeployUsers.add(edge.node.owner.address);
      }

      if (edges.length < 100) {
        hasMore = false;
      } else {
        cursor = edges[edges.length - 1].cursor;
      }
    }
  } catch (err) {
    console.error("Error fetching Permaweb Deploy users:", err);
  }

  return permawebDeployUsers;
}

export async function fetchPermaverseScores() {
  const permaverseUsersPath = "./PermaverseUsers.json";

  if (!fs.existsSync(permaverseUsersPath)) {
    console.warn("PermaverseUsers.json file not found. Skipping.");
    return null;
  }

  console.log("Processing PermaverseUsers.json...");
  const permaverseUsers = JSON.parse(
    fs.readFileSync(permaverseUsersPath, "utf-8")
  );
  const permaverseScores: {
    address: string;
    totalScore: number;
    categories: { [key: string]: number };
  }[] = [];

  for (const [address, rawValue] of Object.entries(permaverseUsers)) {
    const value =
      typeof rawValue === "number"
        ? rawValue
        : parseFloat(String(rawValue) || "0");

    let category = "";
    let score = 0;

    if (value < 10000) {
      category = "permaverseLow";
      score = scoringRules.permaverseLow;
    } else if (value < 100000) {
      category = "permaverseMedium";
      score = scoringRules.permaverseMedium;
    } else {
      category = "permaverseHigh";
      score = scoringRules.permaverseHigh;
    }

    permaverseScores.push({
      address,
      totalScore: score,
      categories: { [category]: score },
    });
  }

  // Ensure all categories are included in the output
  const allCategories = ["permaverseLow", "permaverseMedium", "permaverseHigh"];

  // Prepare data for CSV

  const outputFileName = `permaverseScores.csv`;

  const formattedScores = permaverseScores.map(
    ({ address, totalScore, categories }) => {
      const row: Record<string, number | string> = {
        address,
        totalScore,
      };

      // Add category columns dynamically, defaulting missing ones to 0
      for (const category of allCategories) {
        row[category] = categories[category] || 0;
      }

      return row;
    }
  );

  await writeScoresToCSV(formattedScores, outputFileName);
  console.log(`Permaverse scores written to ${outputFileName}`);
  return outputFileName;
}
