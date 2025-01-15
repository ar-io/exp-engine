import { writeScoresToCSV } from "./helpers";
import csv from "csv-parser";
import fs from "fs";

// Define types
type MergedScore = {
  Address: string;
  TotalScore: number;
  [key: string]: any; // Other columns dynamically included
};

type FinalScore = MergedScore & {
  expBalance: number;
  finalEXPBalance: number;
};

async function main() {
  console.log("[INFO] Loading EXP balances from JSON...");

  const expBalancesFile = "finalEXPBalances-1736972098.json"; // Replace with your actual JSON filename
  let expBalances: Record<string, number>;

  try {
    const rawBalances = fs.readFileSync(expBalancesFile, "utf-8");
    expBalances = JSON.parse(rawBalances);
    console.log(
      `[INFO] Loaded ${Object.keys(expBalances).length} EXP balances.`
    );
  } catch (err) {
    console.error("[ERROR] Failed to load EXP balances JSON:", err);
    return;
  }

  // Load the latest mergedScores file
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

  const mergedScores: { [address: string]: MergedScore } = {};

  // Read the mergedScores CSV into a map
  await new Promise((resolve, reject) => {
    fs.createReadStream(latestMergedScoresFile)
      .pipe(csv())
      .on("data", (data) => {
        const address = data.Address || data.address;
        const totalScore = parseFloat(data.TotalScore || data.totalScore) || 0;

        if (address) {
          mergedScores[address] = {
            Address: address,
            TotalScore: totalScore,
            ...data,
          };
        } else {
          console.warn("[WARN] Skipping row with missing address:", data);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Combine mergedScores with expBalances
  const finalScores: FinalScore[] = [];

  // Include all addresses from expBalances
  for (const [address, expBalance] of Object.entries(expBalances)) {
    const existingScore = mergedScores[address];

    if (existingScore) {
      // Update existing merged score
      finalScores.push({
        ...existingScore,
        expBalance,
        finalEXPBalance: Number(existingScore.TotalScore) + expBalance,
      });
    } else {
      // Add new entry for EXP holders not in mergedScores
      finalScores.push({
        Address: address,
        TotalScore: 0,
        expBalance,
        finalEXPBalance: expBalance,
      });
    }
  }

  // Include any remaining entries from mergedScores not in expBalances
  for (const [address, score] of Object.entries(mergedScores)) {
    if (!expBalances[address]) {
      finalScores.push({
        ...score,
        expBalance: 0,
        finalEXPBalance: score.TotalScore,
      });
    }
  }

  // Sort by finalEXPBalance in descending order
  const sortedScores = finalScores.sort(
    (a, b) => b.finalEXPBalance - a.finalEXPBalance
  );

  // Format the scores for CSV output
  const formattedScores = sortedScores.map((row) => {
    const { Address, finalEXPBalance, expBalance, TotalScore, ...rest } = row;

    return {
      Address,
      FinalEXPBalance: finalEXPBalance,
      ExpBalance: expBalance,
      TotalScore,
      ...rest,
    };
  });

  // Write the results to a new CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileName = `finalEXPBalances_${timestamp}.csv`;

  await writeScoresToCSV(formattedScores, outputFileName);
  console.log(`[INFO] Final EXP balances written to ${outputFileName}`);
}

main().catch((err) => console.error(`[FATAL] Unexpected error:`, err));
