import { scoringRules } from "./constants";
import { fetchMirrorUsers, writeScoresToCSV } from "./helpers";

// Define the interfaces
interface ScoreEntry {
  totalScore: number;
  mirrorUser: number;
}

interface Scores {
  [address: string]: ScoreEntry;
}

// Utility function to truncate or select specific tags
function truncateTags(tags: any[]) {
  return JSON.stringify(
    tags.map((tag) => ({
      name: tag.name,
      value:
        tag.value.length > 100
          ? tag.value.substring(0, 100) + "..."
          : tag.value, // Truncate values longer than 100 characters
    }))
  );
}

async function main() {
  console.log("Fetching Mirror users...");
  const { allUsersData, uniqueContributors } = await fetchMirrorUsers();

  // Process all transactions for CSV
  const allDataForCSV = allUsersData.map((data) => ({
    address: data.address,
    tags: truncateTags(data.tags), // Utility function to manage tag size
  }));

  // Prepare data for the all transactions CSV
  // await writeScoresToCSV(allDataForCSV, `allMirrorTransactions.csv`);
  if (allDataForCSV) {
    console.log("All Mirror transactions written to allMirrorTransactions.csv");
  }

  // Initialize scores for unique contributors
  const scores: Scores = {}; // Use the Scores interface here

  // Assign scores to each unique contributor
  uniqueContributors.forEach((contributor) => {
    scores[contributor] = {
      totalScore: scoringRules.mirrorUser, // Assign 300 points
      mirrorUser: scoringRules.mirrorUser, // Specific category score
    };
  });

  // Prepare data for unique contributors CSV
  const formattedScores = Object.entries(scores).map(([address, data]) => ({
    address,
    totalScore: data.totalScore,
    mirrorUser: data.mirrorUser,
  }));

  await writeScoresToCSV(formattedScores, `uniqueMirrorContributorsScores.csv`);
  console.log(
    "Unique Mirror contributors scores written to uniqueMirrorContributorsScores.csv"
  );
}

main().catch((err) => console.error(err));
