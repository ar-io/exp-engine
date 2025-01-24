import { scoringRules } from "./constants";
import { fetchProtocolLandUsers, writeScoresToCSV } from "./helpers";

async function main() {
  console.log("Fetching Protocol Land users...");
  const protocolLandUsers = await fetchProtocolLandUsers();

  if (!protocolLandUsers || protocolLandUsers.size === 0) {
    console.warn("No Protocol Land users found.");
    return;
  }

  // Initialize scores
  const scores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  // Process each Protocol Land user
  for (const user of protocolLandUsers) {
    console.log(`- Adding score for Protocol Land user: ${user}`);

    // Initialize the user's entry if not already present
    if (!scores[user]) {
      scores[user] = {
        totalScore: 0,
        categories: {},
      };
    }

    // Add the score for Protocol Land user
    const categoryName = "protocolLandUser";
    const scoreValue = scoringRules.protocolLandUser || 0; // Default to 0 if undefined
    scores[user].categories[categoryName] = scoreValue;
    scores[user].totalScore += scoreValue;
  }

  // Ensure all possible categories are included
  const allCategories = ["protocolLandUser"];

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

  await writeScoresToCSV(formattedScores, "protocolLandScores.csv");
  console.log("Protocol Land user scores written to protocolLandScores.csv");
}

main().catch((err) => console.error(err));
