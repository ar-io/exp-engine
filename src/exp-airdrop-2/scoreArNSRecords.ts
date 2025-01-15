import { scoringRules, VILENARIOS_CU } from "./constants";
import { fetchArNSRecords } from "./helpers";
import { ANT, AOProcess } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import fs from "fs";
import pLimit from "p-limit";

const ARNS_CONCURRENCY = 20; // Limit to 20 concurrent requests
const processedOwners: { [owner: string]: Set<string> } = {}; // Track credited categories for each owner

async function main() {
  console.log("[INFO] Fetching ArNS records...");
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const records = await fetchArNSRecords();

  const outputFileName = `arNSScores_${currentTimestamp}.csv`;
  const errorFileName = `erroredArNSRecords_${currentTimestamp}.json`;

  console.log(`[INFO] Writing results to ${outputFileName}`);
  console.log(`[INFO] Writing errors to ${errorFileName}`);

  // Create a write stream for the CSV
  const csvStream = fs.createWriteStream(outputFileName);
  csvStream.write(
    "Address,TotalScore,HasArNSName,HasActiveArNSName,HasUndernames,SetCustomLogo,SetANTController,SetDescription,SetKeywords\n"
  );

  const erroredNames: { name: string; processId: string; error: string }[] = [];

  console.log(
    `[INFO] Processing ${records.length} ArNS records with a limit of ${ARNS_CONCURRENCY} concurrent requests...`
  );

  const limit = pLimit(ARNS_CONCURRENCY);

  // Process records with concurrency control
  const results = await Promise.all(
    records.map((record) =>
      limit(() => processRecord(record, scoringRules, erroredNames))
    )
  );

  // Write results to CSV
  results.forEach((result) => {
    if (result) {
      const {
        owner,
        totalScore,
        categories: {
          hasArNSName = 0,
          hasActiveArNSName = 0,
          hasUndernames = 0,
          setCustomLogo = 0,
          setANTController = 0,
          setDescription = 0,
          setKeywords = 0,
        },
      } = result;

      const row = [
        owner,
        totalScore,
        hasArNSName,
        hasActiveArNSName,
        hasUndernames,
        setCustomLogo,
        setANTController,
        setDescription,
        setKeywords,
      ];
      csvStream.write(`${row.join(",")}\n`);
    }
  });

  csvStream.end();
  console.log(`[INFO] Scores written incrementally to ${outputFileName}`);

  // Save errored names to a JSON file
  if (erroredNames.length > 0) {
    fs.writeFileSync(errorFileName, JSON.stringify(erroredNames, null, 2));
    console.log(
      `[WARN] Saved ${erroredNames.length} errored ArNS records to ${errorFileName}`
    );
  } else {
    console.log("[INFO] No errors encountered during processing.");
  }
}

async function processRecord(
  record: any,
  scoringRules: any,
  erroredNames: any[]
): Promise<{
  owner: string;
  totalScore: number;
  categories: { [key: string]: number };
} | null> {
  const { name, processId } = record;

  console.log(`[INFO] Processing record: ${name} (Process ID: ${processId})`);

  try {
    const ant = ANT.init({
      process: new AOProcess({
        processId,
        ao: connect({
          CU_URL: VILENARIOS_CU,
        }),
      }),
    });

    const antState = await ant.getState();
    // console.log(`[DEBUG] Fetched state for ${name}`);

    if (antState?.Owner) {
      const owner = antState.Owner;

      // Ensure the owner has a tracking set
      if (!processedOwners[owner]) {
        processedOwners[owner] = new Set();
      }

      const categories: { [key: string]: number } = {};

      const addScoreIfNotCredited = (category: string, score: number) => {
        if (!processedOwners[owner].has(category)) {
          processedOwners[owner].add(category);
          categories[category] = score;
        }
      };

      addScoreIfNotCredited("hasArNSName", name ? scoringRules.hasArNSName : 0);
      if (
        antState?.Records?.["@"] &&
        antState?.Records?.["@"].transactionId !==
          "-k7t8xMoB8hW482609Z9F4bTFMC3MnuW8bTvTyT8pFI"
      ) {
        addScoreIfNotCredited(
          "hasActiveArNSName",
          scoringRules.hasActiveArNSName
        );
      }
      if (antState?.Records && Object.keys(antState.Records).length > 1) {
        addScoreIfNotCredited("hasUndernames", scoringRules.hasUndernames);
      }
      if (
        antState?.Logo &&
        antState.Logo !== "Sie_26dvgyok0PZD_-iQAFOhOd5YxDTkczOLoqTTL_A"
      ) {
        addScoreIfNotCredited("setCustomLogo", scoringRules.setCustomLogo);
      }
      if (antState?.Controllers?.length > 0) {
        addScoreIfNotCredited(
          "setANTController",
          scoringRules.setANTController
        );
      }
      if (antState?.Description) {
        addScoreIfNotCredited("setDescription", scoringRules.setDescription);
      }
      if (antState?.Keywords?.length > 0) {
        addScoreIfNotCredited("setKeywords", scoringRules.setKeywords);
      }

      const totalScore = Object.values(categories).reduce(
        (sum, value) => sum + value,
        0
      );

      console.log(
        `[SUCCESS] Processed record for ${owner}. Total Score: ${totalScore}`
      );

      return {
        owner,
        totalScore,
        categories,
      };
    }
  } catch (err) {
    console.error(
      `[ERROR] Error processing record for ${name} (Process ID: ${processId}):`,
      err
    );
    erroredNames.push({
      name,
      processId,
      error: err.message || "Unknown error",
    });
  }

  return null;
}

main().catch((err) => console.error(`[FATAL] Unexpected error:`, err));
