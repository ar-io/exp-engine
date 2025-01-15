import { scoringRules, tokenRequirements } from "./constants";
import { fetchTokenBalances, writeScoresToCSV } from "./helpers";
import axios from "axios";

async function main() {
  console.log("Fetching Token holders...");

  // Initialize scores
  const scores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  // Ensure all token categories are present as columns
  const allCategories = [
    ...tokenRequirements.map(({ ticker }) => `holdsToken${ticker}`),
    "holdsTokenARDRIVE",
  ];

  // Add ARDRIVE token holders
  console.log("Fetching ARDRIVE token balances...");
  const ardriveApiUrl =
    "https://api.arns.app/v1/contract/-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ";

  try {
    const response = await axios.get(ardriveApiUrl);
    const ardriveData = response.data.state;

    if (!ardriveData || !ardriveData.balances || !ardriveData.vault) {
      console.error("[ERROR] ARDRIVE data is missing balances or vaults.");
      return;
    }

    for (const [address, balance] of Object.entries(ardriveData.balances)) {
      const vaultBalance = (ardriveData.vault[address] || []).reduce(
        (sum: number, vault: { balance: number }) => sum + (vault.balance || 0),
        0
      );

      const totalBalance = (balance || 0) + vaultBalance;

      if (totalBalance > 0) {
        if (!scores[address]) {
          scores[address] = {
            totalScore: 0,
            categories: {},
          };
        }

        const categoryName = "holdsTokenARDRIVE";
        if (!scores[address].categories[categoryName]) {
          console.log(`- Adding score for ARDRIVE token holder: ${address}`);
          scores[address].totalScore += scoringRules.holdsToken;
          scores[address].categories[categoryName] = scoringRules.holdsToken;
        }
      }
    }
  } catch (error) {
    console.error("[ERROR] Failed to fetch ARDRIVE token balances:", error);
  }

  // Process other token requirements
  for (const { ticker, process } of tokenRequirements) {
    console.log(`Fetching balances for token: ${ticker}`);

    const tokenBalances = await fetchTokenBalances(process);

    for (const [holder, balance] of Object.entries(tokenBalances)) {
      if (balance > 0) {
        if (!scores[holder]) {
          scores[holder] = {
            totalScore: 0,
            categories: {},
          };
        }

        const categoryName = `holdsToken${ticker}`;
        if (!scores[holder].categories[categoryName]) {
          console.log(`- Adding score for ${categoryName} for ${holder}`);
          if (ticker !== "wAREXP" && ticker !== "wARtARIO") {
            scores[holder].totalScore += scoringRules.holdsToken;
            scores[holder].categories[categoryName] = scoringRules.holdsToken;
          } else {
            scores[holder].totalScore += scoringRules.permaSwapEXPTARIOLP;
            scores[holder].categories[categoryName] =
              scoringRules.permaSwapEXPTARIOLP;
          }
        }
      }
    }
  }

  // Prepare data for CSV
  const formattedScores = Object.entries(scores).map(([address, data]) => {
    const row: Record<string, number | string> = {
      address,
      totalScore: data.totalScore,
    };

    for (const category of allCategories) {
      row[category] = data.categories[category] || 0;
    }

    return row;
  });

  // Sort the formatted scores by totalScore in descending order
  const sortedScores = formattedScores.sort(
    (a, b) => Number(b.totalScore) - Number(a.totalScore)
  );

  // Append a timestamp to the filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileName = `holdsTokenScores_${timestamp}.csv`;

  await writeScoresToCSV(sortedScores, outputFileName);
  console.log(`Token holder scores written to ${outputFileName}`);
}

main().catch((err) => console.error(err));
