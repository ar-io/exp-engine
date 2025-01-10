import { testnetProcessId } from "./constants";
import { IO, ANT, AOProcess } from "@ar.io/sdk";
import { connect, dryrun } from "@permaweb/aoconnect";
import { createObjectCsvWriter } from "csv-writer";

type UserScore = {
  address: string;
  score: number;
  categories: string[];
};

export const ario = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: "https://cu.ardrive.io",
    }),
  }),
});

const NAMES_TO_PROCESS = 5000;
// Define scoring rules
const scoringRules: { [key: string]: number } = {
  hasArNSName: 100,
  hasActiveArNSName: 100,
  hasUndernames: 50,
  setPrimaryName: 100,
  setCustomLogo: 50,
  setANTController: 50,
  setDescription: 50,
  setKeywords: 50,
  hasNetworkedGateway: 200,
  participatedHighPerformance: 200,
  participatedMediumPerformance: 100,
  observerPerformance: 200,
  customizedGatewayNote: 50,
  gatewayHasDelegates: 100,
  gatewayHasManyDelegates: 200,
  delegatedStakeToOne: 100,
  delegatedStakeToMany: 100,
  holdsToken: 50,
};

const tokenRequirements: {
  process: string;
  minimum: number;
  ticker: string;
}[] = [
  {
    process: "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
    minimum: 1,
    ticker: "tARIO",
  }, // tARIO
  {
    process: "m3PaWzK4PTG9lAaqYQPaPdOcXdO8hYqi5Fe9NWqXd0w",
    minimum: 1,
    ticker: "AO",
  }, // AO - DOESNT WORK
  //{
  //  process: "DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo",
  //  minimum: 1,
  //  ticker: "PIXL",
  //}, // PIXL
  {
    process: "wOrb8b_V8QixWyXZub48Ki5B6OIDyf_p1ngoonsaRpQ",
    minimum: 1,
    ticker: "TRUNK",
  }, // TRUNK
  {
    process: "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
    minimum: 1,
    ticker: "wAR",
  }, // wAR
  {
    process: "NG-0lVX882MG5nhARrSzyprEK6ejonHpdUmaaMPsHE8",
    minimum: 1,
    ticker: "qAR",
  }, // qAR
  {
    process: "rH_-7vT_IgfFWiDsrcTghIhb9aRclz7lXcK7RCOV2h8",
    minimum: 1,
    ticker: "CBC",
  }, // Cyberbeaver CBC
  {
    process: "pazXumQI-HPH7iFGfTC-4_7biSnqz_U67oFAGry5zUY",
    minimum: 1,
    ticker: "LLAMA",
  }, // Llama Land LLAMA
];

// Function to calculate points based on wallet age
function calculateAgePoints(firstTransactionTimestamp: number): number {
  const currentTime = Date.now() / 1000; // Current time in seconds
  const walletAgeInYears =
    (currentTime - firstTransactionTimestamp) / (365 * 24 * 60 * 60);
  const maxPoints = 1500; // Maximum points for the oldest wallets
  return Math.min(maxPoints, Math.floor(300 * Math.log2(walletAgeInYears + 1))); // Scaled log2 growth
}

// Fetch first transaction timestamp using GraphQL
async function fetchFirstTransactionTimestamp(
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
    // const response = await fetch("https://arweave-search.goldsky.com/graphql", {
    const response = await fetch("https://arweave.net/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result: any = await response.json();

    const timestamp =
      result?.data?.transactions?.edges[0]?.node?.block?.timestamp;
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error(`Error fetching first transaction for ${address}:`, error);
    return null;
  }
}

// Fetch all ArNS records
async function fetchArNSRecords() {
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

  return allRecords;
}

// Fetch primary names
async function fetchPrimaryNames() {
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

// Fetch gateway data
async function fetchGateways() {
  let cursor: string | undefined;
  const gateways: any[] = [];

  do {
    const { items, nextCursor } = await ario.getGateways({
      cursor,
      limit: 1000,
      sortBy: "gatewayAddress",
      sortOrder: "desc",
    });

    gateways.push(...items);
    cursor = nextCursor;
  } while (cursor);

  return gateways;
}

// Fetch delegated staking data
async function fetchDelegations(gatewayAddress: string) {
  let cursor: string | undefined;
  const delegations: any[] = [];

  do {
    const { items, nextCursor } = await ario.getGatewayDelegates({
      address: gatewayAddress,
      cursor,
      limit: 1000,
      sortBy: "startTimestamp",
      sortOrder: "asc",
    });

    delegations.push(...items);
    cursor = nextCursor;
  } while (cursor);

  return delegations;
}

// Check token balances with minimum thresholds
async function fetchTokenBalances(): Promise<Set<string>> {
  const holders = new Set<string>();

  for (const { process, minimum, ticker } of tokenRequirements) {
    console.log(
      `- Fetching balances for token ticker ${ticker} with process: ${process}`
    );

    try {
      const balancesDryRead = await dryrun({
        process: process,
        tags: [{ name: "Action", value: "Balances" }],
      });

      const balancesData: Record<string, number | string> = JSON.parse(
        balancesDryRead.Messages[0].Data
      );

      for (const [address, balance] of Object.entries(balancesData)) {
        const numericBalance =
          typeof balance === "string" ? parseFloat(balance) : balance;
        if (numericBalance >= minimum) {
          holders.add(address);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  return holders;
}

// Process records and tally scores
async function tallyScores(
  records: any[],
  tokenHolders: Set<string>,
  gateways: any[],
  primaryNames: Record<string, string>
): Promise<UserScore[]> {
  const userScores: {
    [address: string]: { score: number; categories: Set<string> };
  } = {};
  const userDelegations: { [address: string]: Set<string> } = {};

  // Process gateway and delegate data
  for (const gateway of gateways) {
    const { performance, delegates, note, gatewayAddress } = gateway;

    console.log(`Processing gateway for owner: ${gatewayAddress}`);

    if (gateway) {
      if (!userScores[gatewayAddress]) {
        userScores[gatewayAddress] = { score: 0, categories: new Set() };
      }
      if (!userScores[gatewayAddress].categories.has("hasNetworkedGateway")) {
        console.log(`- Adding score for hasNetworkedGateway`);
        userScores[gatewayAddress].score += scoringRules.hasNetworkedGateway;
        userScores[gatewayAddress].categories.add("hasNetworkedGateway");
      }
    }

    if (performance?.highEpochs > 100) {
      if (
        !userScores[gatewayAddress].categories.has(
          "participatedHighPerformance"
        )
      ) {
        console.log(`- Adding score for participatedHighPerformance`);
        userScores[gatewayAddress].score +=
          scoringRules.participatedHighPerformance;
        userScores[gatewayAddress].categories.add(
          "participatedHighPerformance"
        );
      }
    }

    if (performance?.mediumEpochs > 50) {
      if (
        !userScores[gatewayAddress].categories.has(
          "participatedMediumPerformance"
        )
      ) {
        console.log(`- Adding score for participatedMediumPerformance`);
        userScores[gatewayAddress].score +=
          scoringRules.participatedMediumPerformance;
        userScores[gatewayAddress].categories.add(
          "participatedMediumPerformance"
        );
      }
    }

    if (note) {
      if (!userScores[gatewayAddress].categories.has("customizedGatewayNote")) {
        console.log(`- Adding score for customizedGatewayNote`);
        userScores[gatewayAddress].score += scoringRules.customizedGatewayNote;
        userScores[gatewayAddress].categories.add("customizedGatewayNote");
      }
    }

    if (delegates?.length > 0) {
      if (!userScores[gatewayAddress].categories.has("gatewayHasDelegates")) {
        console.log(`- Adding score for gatewayHasDelegates`);
        userScores[gatewayAddress].score += scoringRules.gatewayHasDelegates;
        userScores[gatewayAddress].categories.add("gatewayHasDelegates");
      }
    }

    if (delegates?.length >= 10) {
      if (
        !userScores[gatewayAddress].categories.has("gatewayHasManyDelegates")
      ) {
        console.log(`- Adding score for gatewayHasManyDelegates`);
        userScores[gatewayAddress].score +=
          scoringRules.gatewayHasManyDelegates;
        userScores[gatewayAddress].categories.add("gatewayHasManyDelegates");
      }
    }

    const delegations = await fetchDelegations(gatewayAddress);
    for (const delegation of delegations) {
      const { delegatedStake, address } = delegation;

      console.log(
        `Processing delegation for ${address} to gateway: ${gatewayAddress}`
      );

      if (delegatedStake > 0) {
        if (!userScores[address]) {
          userScores[address] = { score: 0, categories: new Set() };
        }
        if (!userScores[address].categories.has("delegatedStakeToOne")) {
          console.log(`- Adding score for delegatedStakeToOne`);
          userScores[address].score += scoringRules.delegatedStakeToOne;
          userScores[address].categories.add("delegatedStakeToOne");
        }

        // Track delegations for the user
        if (!userDelegations[address]) {
          userDelegations[address] = new Set<string>();
        }
        userDelegations[address].add(gatewayAddress);
      }
    }
  }

  // Add scores for delegating to multiple gateways
  for (const [address, gatewaySet] of Object.entries(userDelegations)) {
    if (gatewaySet.size > 5) {
      if (!userScores[address].categories.has("delegatedStakeToMany")) {
        console.log(
          `- Adding score for delegatedStakeToMany for user: ${address}`
        );
        userScores[address].score += scoringRules.delegatedStakeToMany;
        userScores[address].categories.add("delegatedStakeToMany");
      }
    }
  }

  for (const holder of tokenHolders) {
    console.log(`- Adding score for holdsToken for address: ${holder}`);
    if (!userScores[holder]) {
      userScores[holder] = { score: 0, categories: new Set() };
    }
    if (!userScores[holder].categories.has("holdsToken")) {
      userScores[holder].score += scoringRules.holdsToken;
      userScores[holder].categories.add("holdsToken");
    }
  }

  // Calculate scores for primary names
  for (const [owner, primaryName] of Object.entries(primaryNames)) {
    if (primaryName) {
      if (!userScores[owner]) {
        userScores[owner] = { score: 0, categories: new Set() };
      }
      if (!userScores[owner].categories.has("setPrimaryName")) {
        console.log(`- Adding score for setPrimaryName for owner: ${owner}`);
        userScores[owner].score += scoringRules.setPrimaryName;
        userScores[owner].categories.add("setPrimaryName");
      }
    }
  }

  // Process ArNS records
  let i = 0;
  for (const record of records) {
    const { name, processId } = record;

    console.log(`Processing record for ${name} with process ID: ${processId}`);

    try {
      const ant = ANT.init({
        process: new AOProcess({
          processId,
          ao: connect({
            CU_URL: "https://cu.ardrive.io",
          }),
        }),
      });

      const antState = await ant.getState();

      if (antState?.Owner) {
        const owner = antState.Owner;

        if (name) {
          if (!userScores[owner]) {
            userScores[owner] = { score: 0, categories: new Set() };
          }
          if (!userScores[owner].categories.has("hasArNSName")) {
            console.log(`- Adding score for hasArNSName for owner: ${owner}`);
            userScores[owner].score += scoringRules.hasArNSName;
            userScores[owner].categories.add("hasArNSName");
          }
        }

        if (
          antState?.Records?.["@"] &&
          antState?.Records?.["@"].transactionId !==
            "-k7t8xMoB8hW482609Z9F4bTFMC3MnuW8bTvTyT8pFI"
        ) {
          if (!userScores[owner].categories.has("hasActiveArNSName")) {
            console.log(
              `- Adding score for hasActiveArNSName for owner: ${owner}`
            );
            userScores[owner].score += scoringRules.hasActiveArNSName;
            userScores[owner].categories.add("hasActiveArNSName");
          }
        }

        if (antState?.Records && Object.keys(antState.Records).length > 1) {
          if (!userScores[owner].categories.has("hasUndernames")) {
            console.log(`- Adding score for hasUndernames for owner: ${owner}`);
            userScores[owner].score += scoringRules.hasUndernames;
            userScores[owner].categories.add("hasUndernames");
          }
        }

        if (
          antState?.Logo &&
          antState.Logo !== "Sie_26dvgyok0PZD_-iQAFOhOd5YxDTkczOLoqTTL_A"
        ) {
          if (!userScores[owner].categories.has("setCustomLogo")) {
            console.log(`- Adding score for setCustomLogo for owner: ${owner}`);
            userScores[owner].score += scoringRules.setCustomLogo;
            userScores[owner].categories.add("setCustomLogo");
          }
        }

        if (antState?.Controllers?.length > 0) {
          if (!userScores[owner].categories.has("setANTController")) {
            console.log(
              `- Adding score for setANTController for owner: ${owner}`
            );
            userScores[owner].score += scoringRules.setANTController;
            userScores[owner].categories.add("setANTController");
          }
        }

        if (antState?.Description) {
          if (!userScores[owner].categories.has("setDescription")) {
            console.log(
              `- Adding score for setDescription for owner: ${owner}`
            );
            userScores[owner].score += scoringRules.setDescription;
            userScores[owner].categories.add("setDescription");
          }
        }

        if (antState?.Keywords?.length > 0) {
          if (!userScores[owner].categories.has("setKeywords")) {
            console.log(`- Adding score for setKeywords for owner: ${owner}`);
            userScores[owner].score += scoringRules.setKeywords;
            userScores[owner].categories.add("setKeywords");
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
    i++;
    if (i > NAMES_TO_PROCESS) {
      break;
    }
  }

  // Provide bonus for older wallets
  for (const address of Object.keys(userScores)) {
    const firstTransactionTimestamp = await fetchFirstTransactionTimestamp(
      address
    );

    if (firstTransactionTimestamp) {
      const agePoints = calculateAgePoints(firstTransactionTimestamp);
      if (agePoints > 0) {
        console.log(
          `- Adding ${agePoints} score for wallet age to address: ${address}`
        );
        userScores[address].score += agePoints;
        userScores[address].categories.add("walletAge");
      }
    }
  }

  return Object.entries(userScores).map(([address, data]) => ({
    address,
    score: data.score,
    categories: Array.from(data.categories),
  }));
}

// Write scores to a CSV file
async function writeScoresToCSV(userScores: UserScore[]) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const csvWriter = createObjectCsvWriter({
    path: `exp_airdrop_2_scores_${currentTimestamp}.csv`,
    header: [
      { id: "address", title: "Address" },
      { id: "score", title: "Score" },
      { id: "categories", title: "Categories" },
    ],
  });

  await csvWriter.writeRecords(
    userScores.map((user) => ({
      address: user.address,
      score: user.score,
      categories: user.categories.join(", "),
    }))
  );
  console.log("Scores written to airdrop_scores.csv");
}

// Main function
async function main() {
  // Check token holders
  console.log("Fetching Token holders...");
  const tokenHolders = await fetchTokenBalances();

  console.log("Fetching ArNS records...");
  const records = await fetchArNSRecords();

  console.log("Fetching Primary ArNS names...");
  const primaryNames = await fetchPrimaryNames();

  console.log("Fetching gateways and delegates");
  const gateways = await fetchGateways();

  console.log("Calculating scores...");
  const userScores = await tallyScores(
    records,
    tokenHolders,
    gateways,
    primaryNames
  );

  console.log("Writing scores to CSV...");
  await writeScoresToCSV(userScores);

  console.log("Airdrop scoring completed!");
}

main().catch((err) => console.error(err));
