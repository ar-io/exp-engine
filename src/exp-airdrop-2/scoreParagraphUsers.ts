import { scoringRules } from "./constants";
import { fetchParagraphUsers, writeScoresToCSV } from "./helpers";

// Define the interfaces
interface ScoreEntry {
  totalScore: number;
  paragraphUser: number;
}

interface Scores {
  [address: string]: ScoreEntry;
}

async function main() {
  console.log("Fetching Paragraph users...");
  const { allUsersData, uniqueContributors } = await fetchParagraphUsers();

  // Process all transactions for CSV
  const allDataForCSV = allUsersData.map((data) => ({
    address: data.address,
    tags: JSON.stringify(data.tags),
  }));

  // Prepare data for the all transactions CSV
  await writeScoresToCSV(allDataForCSV, `allParagraphTransactions.csv`);
  console.log(
    "All Paragraph transactions written to allParagraphTransactions.csv"
  );

  // Initialize scores for unique contributors
  const scores: Scores = {}; // Use the Scores interface here

  // Assign scores to each unique contributor
  uniqueContributors.forEach((contributor) => {
    scores[contributor] = {
      totalScore: scoringRules.paragraphUser, // Assign 300 points
      paragraphUser: scoringRules.paragraphUser, // Specific category score
    };
  });

  // Prepare data for unique contributors CSV
  const formattedScores = Object.entries(scores).map(([address, data]) => ({
    address,
    totalScore: data.totalScore,
    paragraphUser: data.paragraphUser,
  }));

  await writeScoresToCSV(
    formattedScores,
    `uniqueParagraphContributorsScores.csv`
  );
  console.log(
    "Unique Paragraph contributors scores written to uniqueParagraphContributorsScores.csv"
  );
}

main().catch((err) => console.error(err));
