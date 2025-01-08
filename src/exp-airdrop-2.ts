import { IO, ANT } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import { createObjectCsvWriter } from "csv-writer";

const { dryrun } = connect({
  CU_URL: "https://cu.ardrive.io",
});

type UserScore = {
  address: string;
  score: number;
};

const ario = IO.init();

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
    process: "m3PawlzK4PTG9lAaqYQPaPDcXdO8hYqi5Fe9NWqXd0w",
    minimum: 1,
    ticker: "AO",
  }, // AO
  {
    process: "DM3FoZUq_yebASPhdg8pEIRIzDW6muXEhxz5-JwbZwo",
    minimum: 1,
    ticker: "PIXL",
  }, // PIXL
  {
    process: "wOrb8b_V8QixWyXZub48Ki5B6OIDyF_p1ngoonsaRpQ",
    minimum: 1,
    ticker: "TRUNK",
  }, // TRUNK
  {
    process: "xU9zFkq3X2ZQ6o1wNVvr1vUWljc3kXTWr7xKQD6dh10",
    minimum: 1,
    ticker: "wAR",
  }, // wAR
  {
    process: "NG-01VX882MG5hnARrSzyprEKejeonHpdUmaaMPsHE8",
    minimum: 1,
    ticker: "qAR",
  }, // qAR
  {
    process: "rH_-7vT_IgFfWDiSrcTghIhb9aRclz7lXcK7RCOV2h8",
    minimum: 1,
    ticker: "CBC",
  }, // Cyberbeaver CBC
  {
    process: "pazXumQI-HPH7iFGfTC-4_7biSnqz_U67oFAGry5zUY",
    minimum: 1,
    ticker: "LLAMA",
  }, // Llama Land LLAMA
];

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
        process,
        tags: [{ name: "Action", value: "Balances" }],
      });

      console.log(balancesDryRead);

      const balancesData: Record<string, number> = JSON.parse(
        balancesDryRead.Messages[0].Data
      );

      for (const [address, balance] of Object.entries(balancesData)) {
        if (balance >= minimum) {
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
  tokenHolders: Set<string>
): Promise<UserScore[]> {
  const userScores: { [address: string]: number } = {};
  const userDelegations: { [address: string]: Set<string> } = {};

  for (const holder of tokenHolders) {
    console.log(`- Adding score for holdsToken for address: ${holder}`);
    userScores[holder] = (userScores[holder] || 0) + scoringRules.holdsToken;
  }
  const primaryNames = await fetchPrimaryNames();
  const gateways = await fetchGateways();

  // Process gateway and delegate data
  for (const gateway of gateways) {
    const { performance, delegates, note, gatewayAddress } = gateway;

    console.log(`Processing gateway for owner: ${gatewayAddress}`);

    if (gateway) {
      console.log(`- Adding score for hasNetworkedGateway`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) + scoringRules.hasNetworkedGateway;
    }

    if (performance?.highEpochs > 100) {
      console.log(`- Adding score for participatedHighPerformance`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) +
        scoringRules.participatedHighPerformance;
    }

    if (performance?.mediumEpochs > 50) {
      console.log(`- Adding score for participatedMediumPerformance`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) +
        scoringRules.participatedMediumPerformance;
    }

    if (note) {
      console.log(note);
      console.log(`- Adding score for customizedGatewayNote`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) + scoringRules.customizedGatewayNote;
    }

    if (delegates?.length > 0) {
      console.log(`- Adding score for gatewayHasDelegates`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) + scoringRules.gatewayHasDelegates;
    }

    if (delegates?.length >= 10) {
      console.log(`- Adding score for gatewayHasManyDelegates`);
      userScores[gatewayAddress] =
        (userScores[gatewayAddress] || 0) +
        scoringRules.gatewayHasManyDelegates;
    }

    const delegations = await fetchDelegations(gatewayAddress);
    for (const delegation of delegations) {
      const { delegatedStake, address } = delegation;

      console.log(
        `Processing delegation for ${address} to gateway: ${gatewayAddress}`
      );

      if (delegatedStake > 0) {
        console.log(`- Adding score for delegatedStakeToOne`);
        userScores[address] =
          (userScores[address] || 0) + scoringRules.delegatedStakeToOne;

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
    if (gatewaySet.size > 1) {
      console.log(
        `- Adding score for delegatedStakeToMany for user: ${address}`
      );
      userScores[address] =
        (userScores[address] || 0) + scoringRules.delegatedStakeToMany;
    }
  }

  // Calculate scores for primary names
  for (const [owner, primaryName] of Object.entries(primaryNames)) {
    if (primaryName) {
      console.log(`- Adding score for setPrimaryName for owner: ${owner}`);
      userScores[owner] =
        (userScores[owner] || 0) + scoringRules.setPrimaryName;
    }
  }

  // Process ArNS records
  for (const record of records) {
    const { name, processId } = record;

    console.log(`Processing record for ${name} with process ID: ${processId}`);

    const ant = ANT.init({ processId });
    const antState = await ant.getState();

    if (antState?.Owner) {
      const owner = antState.Owner;

      if (name) {
        console.log(`- Adding score for hasArNSName for owner: ${owner}`);
        userScores[owner] = (userScores[owner] || 0) + scoringRules.hasArNSName;
      }

      if (
        antState?.Records?.["@"] &&
        antState?.Records?.["@"].transactionId !==
          "-k7t8xMoB8hW482609Z9F4bTFMC3MnuW8bTvTyT8pFI"
      ) {
        console.log(`- Adding score for hasActiveArNSName for owner: ${owner}`);
        userScores[owner] =
          (userScores[owner] || 0) + scoringRules.hasActiveArNSName;
      }

      if (antState?.Records && Object.keys(antState.Records).length > 1) {
        console.log(`- Adding score for hasUndernames for owner: ${owner}`);
        userScores[owner] =
          (userScores[owner] || 0) + scoringRules.hasUndernames;
      }

      if (
        antState?.Logo &&
        antState.Logo !== "Sie_26dvgyok0PZD_-iQAFOhOd5YxDTkczOLoqTTL_A"
      ) {
        console.log(`- Adding score for setCustomLogo for owner: ${owner}`);
        userScores[owner] =
          (userScores[owner] || 0) + scoringRules.setCustomLogo;
      }

      if (antState?.Controllers?.length > 0) {
        console.log(`- Adding score for setANTController for owner: ${owner}`);
        userScores[owner] =
          (userScores[owner] || 0) + scoringRules.setANTController;
      }

      if (antState?.Description) {
        console.log(`- Adding score for setDescription for owner: ${owner}`);
        userScores[owner] =
          (userScores[owner] || 0) + scoringRules.setDescription;
      }

      if (antState?.Keywords?.length > 0) {
        console.log(`- Adding score for setKeywords for owner: ${owner}`);
        userScores[owner] = (userScores[owner] || 0) + scoringRules.setKeywords;
      }
    }
  }

  return Object.entries(userScores).map(([address, score]) => ({
    address,
    score,
  }));
}

// Write scores to a CSV file
async function writeScoresToCSV(userScores: UserScore[]) {
  const csvWriter = createObjectCsvWriter({
    path: "exp_airdrop_2_scores.csv",
    header: [
      { id: "address", title: "Address" },
      { id: "score", title: "Score" },
    ],
  });

  await csvWriter.writeRecords(userScores);
  console.log("Scores written to airdrop_scores.csv");
}

// Main function
async function main() {
  // Check token holders
  console.log("Fetching Token holders...");
  const tokenHolders = await fetchTokenBalances();

  console.log("Fetching ArNS records...");
  const records = await fetchArNSRecords();

  console.log("Calculating scores...");
  const userScores = await tallyScores(records, tokenHolders);

  console.log("Writing scores to CSV...");
  await writeScoresToCSV(userScores);

  console.log("Airdrop scoring completed!");
}

main().catch((err) => console.error(err));
