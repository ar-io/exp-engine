import { scoringRules } from "./constants";
import { fetchPermawebDeployUsers, writeScoresToCSV } from "./helpers";

async function main() {
  console.log("Fetching Permaweb Deploy users...");
  const permawebDeployUsers = await fetchPermawebDeployUsers();

  // Initialize scores
  const scores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  // Process users
  for (const user of permawebDeployUsers) {
    if (!scores[user]) {
      scores[user] = {
        totalScore: 0,
        categories: {},
      };
    }

    // Add score for the category
    const categoryName = "permawebDeployUser";
    console.log(`- Adding score for ${categoryName} for ${user}`);
    scores[user].totalScore += scoringRules.permawebDeployUser;
    scores[user].categories[categoryName] = scoringRules.permawebDeployUser;
  }

  // Ensure all possible categories are included
  const allCategories = ["permawebDeployUser"];

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

  await writeScoresToCSV(formattedScores, `permawebDeployScores.csv`);
  console.log("Permaweb Deploy scores written to permawebDeployScores.csv");
}

main().catch((err) => console.error(err));
