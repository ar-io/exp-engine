import csv from "csv-parser";
import fs from "fs";

async function convertCSVToJSON() {
  // Find the latest finalScores_*.csv file
  const files = fs
    .readdirSync(".")
    .filter((file) => file.startsWith("mergedScores_") && file.endsWith(".csv"))
    .sort();

  if (files.length === 0) {
    console.error("[ERROR] No finalScores CSV file found.");
    return;
  }

  const latestFile = files[files.length - 1];
  console.log(`[INFO] Using latest finalScores file: ${latestFile}`);

  const result: { Address: string; TotalScore: number }[] = [];

  // Read the CSV file and parse the Address and TotalScore
  await new Promise((resolve, reject) => {
    fs.createReadStream(latestFile)
      .pipe(csv())
      .on("data", (data) => {
        const address = data.Address || data.address;
        const totalScore = parseFloat(data.TotalScore || data.totalScore);

        if (address && !isNaN(totalScore)) {
          result.push({ Address: address, TotalScore: totalScore });
        } else {
          console.warn(`[WARN] Skipping row due to invalid data:`, data);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  if (result.length === 0) {
    console.error("[ERROR] No valid data found in the CSV file.");
    return;
  }

  // Sort the results by TotalScore in descending order
  result.sort((a, b) => b.TotalScore - a.TotalScore);

  // Convert to key-value format
  const jsonResult: Record<string, number> = result.reduce(
    (acc: Record<string, number>, { Address, TotalScore }) => {
      acc[Address] = TotalScore;
      return acc;
    },
    {} as Record<string, number> // Explicitly initialize as Record<string, number>
  );

  // Write the JSON file
  const outputFileName = `finalScores_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  fs.writeFileSync(outputFileName, JSON.stringify(jsonResult, null, 2));
  console.log(`[INFO] Final scores JSON written to ${outputFileName}`);
}

convertCSVToJSON().catch((err) =>
  console.error("[FATAL] Unexpected error:", err)
);
