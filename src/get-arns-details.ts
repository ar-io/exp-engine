import { fetchArNSRecords, fetchPrimaryNames } from "./exp-airdrop-2/helpers";
import { AOProcess, ANT } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import axios, { AxiosResponse } from "axios";
import fs from "fs";
import pLimit from "p-limit";
import path from "path";

const CU_URL = "https://cu.ardrive.io";
const PLACEHOLDER_TXS = new Set([
  "-k7t8xMoB8hW482609Z9F4bTFMC3MnuW8bTvTyT8pFI",
  "UyC5P5qKPZaltMmmZAWdakhlDXsBF6qmyrbWYFchRTk",
]);
const CONCURRENCY = 5;
const OUTPUT_DIR = "arns-output";

interface ArnsRecordAnalysis {
  name: string;
  owner: string;
  recordKey: string;
  transactionId: string;
  isDefaultRecord: boolean;
  isActive: boolean;
  contentType: string;
  isArweaveManifest: boolean;
  isPrimaryName: boolean;
}

interface SummaryTally {
  totalRegisteredNames: number;
  totalPrimaryNames: number;
  totalRecords: number;
  activeRecords: number;
  inactiveRecords: number;
  manifestsFound: number;
  totalUndernamesRegistered: number;
  totalUndernamesUsed: number;
  arns: Set<string>;
  owners: Set<string>;
  contentTypes: Record<string, number>;
}

async function safeHeadRequest(
  url: string,
  retries = 3
): Promise<AxiosResponse | null> {
  try {
    return await axios.head(url, { timeout: 10000 });
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 500));
      return safeHeadRequest(url, retries - 1);
    }
    return null;
  }
}

async function analyzeRecord(
  name: string,
  processId: string,
  writeRow: (r: ArnsRecordAnalysis) => void,
  tally: SummaryTally,
  primaryNames: Set<string>
): Promise<void> {
  try {
    const ant = ANT.init({
      process: new AOProcess({
        processId,
        ao: connect({ CU_URL }),
      }),
    });

    let state: any = null;
    let owner: string | undefined;
    let records: Record<string, { transactionId: string }> | undefined;

    try {
      state = await ant.getState();
      owner = state?.Owner;
      records = state?.Records;
    } catch (err) {
      console.warn(
        `[WARN] getState() failed for ${name}. Trying getRecords()...`
      );
    }

    if (!owner || !records) {
      try {
        records = await ant.getRecords();
      } catch (fallbackErr) {
        console.warn(
          `[FAIL] Could not get records for ${name}: ${fallbackErr.message}`
        );
        return;
      }
    }

    if (!records) return;

    tally.totalUndernamesRegistered += Object.keys(records).length;

    for (const key of Object.keys(records)) {
      const txId = records[key]?.transactionId;
      if (!txId || PLACEHOLDER_TXS.has(txId)) continue;

      tally.totalUndernamesUsed++;

      const isDefault = key === "@";
      let isActive = false;
      let contentType = "unknown";
      let isManifest = false;

      const head = await safeHeadRequest(`https://arweave.net/raw/${txId}`);
      if (head) {
        contentType = head.headers["content-type"] || "unknown"; // FIXED
        isActive = true;
        isManifest = contentType === "application/x.arweave-manifest+json";

        tally.contentTypes[contentType] =
          (tally.contentTypes[contentType] || 0) + 1;
        tally.activeRecords++;
      } else {
        tally.inactiveRecords++;
      }

      const result: ArnsRecordAnalysis = {
        name,
        owner: owner || "unknown",
        recordKey: key,
        transactionId: txId,
        isDefaultRecord: isDefault,
        isActive,
        contentType,
        isArweaveManifest: isManifest,
        isPrimaryName: primaryNames.has(name),
      };

      writeRow(result);
      tally.totalRecords++;
      if (owner) tally.owners.add(owner);
      tally.arns.add(name);
      if (isManifest) tally.manifestsFound++;
    }
  } catch (err) {
    console.warn(`[WARN] Failed to analyze ${name}: ${err.message}`);
  }
}

function createCSVStream(filePath: string): {
  writeRow: (r: ArnsRecordAnalysis) => void;
  close: () => void;
} {
  const headers = [
    "name",
    "owner",
    "recordKey",
    "transactionId",
    "isDefaultRecord",
    "isActive",
    "contentType",
    "isArweaveManifest",
    "isPrimaryName",
  ];

  const stream = fs.createWriteStream(filePath, { flags: "w" });
  stream.write(headers.join(",") + "\n");

  const writeRow = (r: ArnsRecordAnalysis) => {
    stream.write(
      headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",") + "\n"
    );
  };

  const close = () => {
    stream.end();
  };

  return { writeRow, close };
}

function generateSummary(tally: SummaryTally) {
  return {
    totalRegisteredNames: tally.totalRegisteredNames,
    totalPrimaryNames: tally.totalPrimaryNames,
    totalRecords: tally.totalRecords,
    totalArNSNames: tally.arns.size,
    manifestsFound: tally.manifestsFound,
    activeRecords: tally.activeRecords,
    inactiveRecords: tally.inactiveRecords,
    uniqueOwners: tally.owners.size,
    totalUndernamesRegistered: tally.totalUndernamesRegistered,
    totalUndernamesUsed: tally.totalUndernamesUsed,
    averageUndernamesPerName:
      tally.arns.size > 0
        ? +(tally.totalUndernamesUsed / tally.arns.size).toFixed(2)
        : 0,
    contentTypeBreakdown: tally.contentTypes,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(process.cwd(), `${OUTPUT_DIR}-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const csvFilePath = path.join(outputDir, "arns-records.csv");
  const { writeRow, close } = createCSVStream(csvFilePath);

  const tally: SummaryTally = {
    totalRegisteredNames: 0,
    totalPrimaryNames: 0,
    totalRecords: 0,
    activeRecords: 0,
    inactiveRecords: 0,
    manifestsFound: 0,
    totalUndernamesRegistered: 0,
    totalUndernamesUsed: 0,
    arns: new Set(),
    owners: new Set(),
    contentTypes: {},
  };

  console.log("[INFO] Fetching primary names...");
  const primaryNames = await fetchPrimaryNames();
  tally.totalPrimaryNames = primaryNames.size;
  console.log(`[INFO] Found ${tally.totalPrimaryNames} primary names.`);

  const records = await fetchArNSRecords();
  tally.totalRegisteredNames = records.length;

  const limit = pLimit(CONCURRENCY);
  let processed = 0;

  // Create an array of thunks (functions that return promises)
  const tasks = records.map((record) =>
    limit(async () => {
      await analyzeRecord(
        record.name,
        record.processId,
        writeRow,
        tally,
        primaryNames
      );
      processed++;
      if (processed % 25 === 0) {
        console.log(`[🔄] Processed ${processed}/${records.length}`);
      }
    })
  );

  // Await all tasks concurrently with the concurrency limit
  await Promise.allSettled(tasks);

  close();

  const summary = generateSummary(tally);
  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("\n📊 Summary:");
  const { contentTypeBreakdown, ...mainSummary } = summary;
  console.table(mainSummary);

  console.log("\n📦 Content Type Breakdown:");
  const sortedContentTypes = Object.entries(contentTypeBreakdown).sort(
    ([, a], [, b]) => b - a
  );
  sortedContentTypes.forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });

  console.log(`📁 Summary saved to: ${summaryPath}`);
  console.log(`📂 Output directory: ${outputDir}`);
}

main().catch((err) => console.error(`[FATAL] ${err.message}`));
