import { scoringRules } from "./constants";
import { fetchParagraphUsers, writeScoresToCSV } from "./helpers";

// Define the interfaces
interface ScoreEntry {
  totalScore: number;
  paragraphUser: number;
  transactionCount: number;
}

interface Scores {
  [address: string]: ScoreEntry;
}

async function main() {
  console.log("Fetching Paragraph users...");
  const { allUsersData, uniqueContributors, contributorTransactionCounts } =
    await fetchParagraphUsers();

  // Prepare CSV with all transaction data
  const allDataForCSV = allUsersData.map((data) => ({
    address: data.address,
    tags: JSON.stringify(data.tags),
  }));

  await writeScoresToCSV(allDataForCSV, `allParagraphTransactions.csv`);
  console.log(
    "All Paragraph transactions written to allParagraphTransactions.csv"
  );

  // Initialize scores for unique contributors
  const scores: Scores = {};

  uniqueContributors.forEach((contributor) => {
    const txCount = contributorTransactionCounts.get(contributor) || 0;

    scores[contributor] = {
      totalScore: scoringRules.paragraphUser,
      paragraphUser: scoringRules.paragraphUser,
      transactionCount: txCount,
    };
  });

  // Prepare formatted data for CSV
  const formattedScores = Object.entries(scores).map(([address, data]) => ({
    address,
    totalScore: data.totalScore,
    paragraphUser: data.paragraphUser,
    transactionCount: data.transactionCount,
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
