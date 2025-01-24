import { scoringRules } from "./constants";
import { fetchGateways, writeScoresToCSV, fetchDelegations } from "./helpers";

async function main() {
  console.log("Fetching gateways for delegate scoring...");
  const gateways = await fetchGateways();

  const scores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  const userDelegations: { [address: string]: Set<string> } = {};

  for (const gateway of gateways) {
    const { gatewayAddress } = gateway;

    console.log(`Fetching delegations for gateway: ${gatewayAddress}`);
    const delegations = await fetchDelegations(gatewayAddress);

    for (const delegation of delegations) {
      const { delegatedStake, address } = delegation;

      if (delegatedStake > 0) {
        // Initialize user score entry if it doesn't exist
        if (!scores[address]) {
          scores[address] = {
            totalScore: 0,
            categories: {},
          };
        }

        // Add score for delegatedStakeToOne
        if (!scores[address].categories.delegatedStakeToOne) {
          console.log(`- Adding score for delegatedStakeToOne for ${address}`);
          scores[address].totalScore += scoringRules.delegatedStakeToOne;
          scores[address].categories.delegatedStakeToOne =
            scoringRules.delegatedStakeToOne;
        }

        // Track delegations for this user
        if (!userDelegations[address]) {
          userDelegations[address] = new Set<string>();
        }
        userDelegations[address].add(gatewayAddress);
      }
    }
  }

  // Add scores for delegating to multiple gateways
  for (const [address, gateways] of Object.entries(userDelegations)) {
    if (gateways.size > 1) {
      if (!scores[address].categories.delegatedStakeToMany) {
        console.log(`- Adding score for delegatedStakeToMany for ${address}`);
        scores[address].totalScore += scoringRules.delegatedStakeToMany;
        scores[address].categories.delegatedStakeToMany =
          scoringRules.delegatedStakeToMany;
      }
    }
  }

  // Prepare data for CSV
  const allCategories = ["delegatedStakeToOne", "delegatedStakeToMany"];
  const formattedScores = Object.entries(scores).map(([address, data]) => {
    const row: Record<string, number | string> = {
      address,
      totalScore: data.totalScore,
    };

    // Add category columns dynamically
    for (const category of allCategories) {
      row[category] = data.categories[category] || 0;
    }

    return row;
  });

  await writeScoresToCSV(formattedScores, "delegateScores.csv");
  console.log("Delegate scores written to delegateScores.csv");
}

main().catch((err) => console.error(err));
