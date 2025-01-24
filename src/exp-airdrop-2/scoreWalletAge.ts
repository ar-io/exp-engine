import {
  fetchFirstTransactionTimestamp,
  parseCSV,
  writeScoresToCSV,
} from "./helpers";
import fs from "fs";
import pLimit from "p-limit";

// Calculate wallet age multiplier based on the first transaction timestamp
function calculateAgeMultiplier(firstTransactionTimestamp: number): number {
  const ageInYears =
    (Date.now() / 1000 - firstTransactionTimestamp) / (365 * 24 * 60 * 60);

  if (ageInYears >= 7) return 1.5; // Max multiplier for 7+ years
  return 1 + (0.5 / 7) * Math.min(ageInYears, 7); // Linear scaling from 1 to 1.5
}

async function main() {
  const CONCURRENCY_LIMIT = 10;
  const limit = pLimit(CONCURRENCY_LIMIT);

  console.log("[INFO] Reading merged scores...");
  const files = fs
    .readdirSync(".")
    .filter((file) => file.startsWith("mergedScores_") && file.endsWith(".csv"))
    .sort();

  if (files.length === 0) {
    console.error("[ERROR] No mergedScores CSV file found.");
    return;
  }

  const latestMergedScoresFile = files[files.length - 1];
  console.log(
    `[INFO] Using latest merged scores file: ${latestMergedScoresFile}`
  );

  const mergedScores = await parseCSV(latestMergedScoresFile);

  if (!mergedScores || mergedScores.length === 0) {
    console.error("[ERROR] No valid data found in mergedScores CSV.");
    return;
  }

  console.log(`[INFO] Processing ${mergedScores.length} addresses...`);

  let completed = 0;
  const total = mergedScores.length;

  const results = await Promise.all(
    mergedScores.map((score: any) =>
      limit(async () => {
        const firstTransactionTimestamp = await fetchFirstTransactionTimestamp(
          score.Address
        );

        if (firstTransactionTimestamp) {
          const ageMultiplier = calculateAgeMultiplier(
            firstTransactionTimestamp
          );
          if (ageMultiplier > 0) {
            score.baseScore = score.TotalScore;
            score.TotalScore = Math.ceil(score.baseScore * ageMultiplier);
            score.walletAgePoints = ageMultiplier;
          }
        } else {
          console.warn(
            `[WARN] (${
              completed + 1
            }/${total}) No first transaction found for address: ${
              score.Address
            }`
          );
        }

        completed++;
        if (completed % 10 === 0 || completed === total) {
          console.log(
            `[INFO] Progress: ${completed}/${total} addresses processed (${Math.round(
              (completed / total) * 100
            )}%)`
          );
        }

        return score;
      })
    )
  );

  // Sort the results by TotalScore in descending order
  const sortedResults = results.sort((a, b) => b.TotalScore - a.TotalScore);

  // Write the updated scores to a new CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileName = `finalScores_${timestamp}.csv`;
  await writeScoresToCSV(sortedResults, outputFileName);

  console.log(
    `[INFO] Final scores with wallet age bonus written to ${outputFileName}`
  );
}

main().catch((err) => console.error("[FATAL] Unexpected error:", err));
