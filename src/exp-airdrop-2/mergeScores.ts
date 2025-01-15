import { EXCLUSIONS_FILE } from "./constants";
import { mergeCSVs, parseCSV, writeScoresToCSV } from "./helpers";

// Process ArDrive uploaders and write scores to a CSV
export async function processArDriveUploaders() {
  const inputFileName = "ardrive_upload_totals_for_airdrop_1588899.csv";
  const outputFileName = `ardriveUploaderScores_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.csv`;

  const uploaders = await parseCSV(inputFileName);

  const scores = uploaders.map((uploader) => {
    const address = uploader.owner_address;
    const totalScore =
      (uploader.is_greater_than_100KB === "TRUE" ? 50 : 0) +
      (uploader.is_greater_than_100MB === "TRUE" ? 100 : 0) +
      (uploader.is_greater_than_1GB === "TRUE" ? 200 : 0) +
      (uploader.is_greater_than_10GB === "TRUE" ? 400 : 0);

    return {
      Address: address,
      TotalScore: totalScore,
      ArDriveUploadedMoreThan100KB:
        uploader.is_greater_than_100KB === "TRUE" ? 50 : 0,
      ArDriveUploadedMoreThan100MB:
        uploader.is_greater_than_100MB === "TRUE" ? 100 : 0,
      ArDriveUploadedMoreThan1GB:
        uploader.is_greater_than_1GB === "TRUE" ? 200 : 0,
      ArDriveUploadedMoreThan10GB:
        uploader.is_greater_than_10GB === "TRUE" ? 400 : 0,
    };
  });

  // Write the scores to a new CSV file
  await writeScoresToCSV(scores, outputFileName);
  console.log(`[INFO] ArDrive uploader scores written to ${outputFileName}`);
}

export async function processCommunityUploaders() {
  const inputFileName = "community_upload_totals_for_airdrop_1588899.csv";
  const outputFileName = `communityUploaderScores_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.csv`;

  console.log(`[INFO] Processing Community Uploaders from ${inputFileName}`);
  // Read the input CSV file
  const uploaders = await parseCSV(inputFileName);

  // Map uploaders to scores
  const scores = uploaders.map((uploader) => {
    const address = uploader.owner_address;
    const totalScore =
      (uploader.is_greater_than_5MB === "true" ? 100 : 0) +
      (uploader.is_greater_than_500MB === "true" ? 150 : 0) +
      (uploader.is_greater_than_5GB === "true" ? 200 : 0) +
      (uploader.is_greater_than_50GB === "true" ? 400 : 0);

    return {
      Address: address,
      TotalScore: totalScore,
      UploadedMoreThan5MB: uploader.is_greater_than_5MB === "true" ? 100 : 0,
      UploadedMoreThan500MB:
        uploader.is_greater_than_500MB === "true" ? 150 : 0,
      UploadedMoreThan5GB: uploader.is_greater_than_5GB === "true" ? 200 : 0,
      UploadedMoreThan50GB: uploader.is_greater_than_50GB === "true" ? 400 : 0,
    };
  });

  // Write the results to a CSV
  await writeScoresToCSV(scores, outputFileName);

  console.log(`[INFO] Community uploader scores written to ${outputFileName}`);
}

async function main() {
  const filePatterns = [
    "holdsTokenScores_*.csv",
    "arNSScores_*.csv",
    "gatewayScores_*.csv",
    "delegateScores_*.csv",
    "primaryNameScores_*.csv",
    "permawebDeployScores_*.csv",
    "permaverseScores_*.csv",
    "protocolLandScores_*.csv",
    "vouchedUserScores_*.csv",
    "fullstackHackAddresses.csv",
    "weaversPermahackAddresses.csv",
    "ambassadorWallets.csv",
    "turboTopup.csv",
    "botegaUsers.csv",
    "community_manifest_uploaders_for_airdrop_1588899.csv",
    "communityUploaderScores_*.csv",
    "ardriveUploaderScores_*.csv", // Add ArDrive Uploaders
  ];
  // await processArDriveUploaders();
  await processCommunityUploaders();

  console.log("[INFO] Merging CSVs...");
  await mergeCSVs(filePatterns, "mergedScores.csv", EXCLUSIONS_FILE);
  console.log("[INFO] Merged scores written to mergedScores.csv");
}

main().catch((err) => console.error("[FATAL] Unexpected error:", err));
