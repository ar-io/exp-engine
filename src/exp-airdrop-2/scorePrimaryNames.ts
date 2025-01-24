import { scoringRules } from "./constants";
import { fetchPrimaryNames, writeScoresToCSV } from "./helpers";

async function main() {
  console.log("Fetching primary names...");
  const primaryNames = await fetchPrimaryNames();

  // Initialize scores
  const scores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  for (const [owner, primaryName] of Object.entries(primaryNames)) {
    if (primaryName) {
      console.log(`- Adding score for setPrimaryName for owner: ${owner}`);

      // Initialize the owner's entry if not already present
      if (!scores[owner]) {
        scores[owner] = {
          totalScore: 0,
          categories: {},
        };
      }

      // Add the score for setting a primary name
      const categoryName = "setPrimaryName";
      if (!scores[owner].categories[categoryName]) {
        scores[owner].categories[categoryName] = scoringRules.setPrimaryName;
        scores[owner].totalScore += scoringRules.setPrimaryName;
      }
    }
  }

  // Ensure all possible categories are included
  const allCategories = ["setPrimaryName"];

  // Prepare data for CSV
  const formattedScores = Object.entries(scores).map(([address, data]) => {
    const row: Record<string, number | string> = {
      address,
      totalScore: data.totalScore,
    };

    // Add all category columns dynamically, defaulting to 0
    for (const category of allCategories) {
      row[category] = data.categories[category] || 0;
    }

    return row;
  });

  await writeScoresToCSV(formattedScores, "primaryNameScores.csv");
  console.log("Primary name scores written to primaryNameScores.csv");
}

main().catch((err) => console.error(err));
