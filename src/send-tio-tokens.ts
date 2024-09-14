import { testnetProcessId } from "./constants";
import { IOToken, JWKInterface } from "./types";
import { loadJsonFile, loadWallet } from "./utilities";
import { AOProcess, ArweaveSigner, IO } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";
import { createObjectCsvWriter } from "csv-writer";
import path from "path";
import { pLimit } from "plimit-lit";

// const AO_CU_URL = "https://cu.ar-io.dev";
const AO_CU_URL = "https://vilenarios.com/ao/cu";

// Get the key file used for the distribution
const wallet: JWKInterface = loadWallet("tio");

const recipientsFilePath = path.join(
  __dirname,
  "..",
  "data",
  "tIO_ardrive_under_100KiB_airdrop_targets-5.json"
);

const io = IO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: AO_CU_URL,
    }),
  }),
  signer: new ArweaveSigner(wallet),
});

async function distributeTokens(dryRun = true) {
  let distributionCount = 0;
  let totalTokenAmount = 0;
  const outputData: Array<{
    address: string;
    amount: number;
    status: string;
    transactionId: string;
  }> = [];

  const recipientsData = await loadJsonFile(recipientsFilePath);
  const limit = pLimit(10); // Control the concurrency, adjust the limit as needed

  const transferPromises = Object.entries(recipientsData).map(
    ([address, amount]) =>
      limit(async () => {
        const tokenAmount = amount as number;
        const token = new IOToken(tokenAmount);
        let status = "success";
        let transactionId = "DRY-RUN";

        if (!dryRun) {
          try {
            const { id: txId } = await io.transfer(
              {
                target: address,
                qty: token.valueOf(),
              },
              {
                tags: [
                  {
                    name: "App-Name",
                    value: "ArDrive-ArNS-Integration-Reward",
                  },
                ],
              }
            );
            transactionId = txId;
            console.log(
              `Transaction successful! Sent ${tokenAmount} tokens to ${address}. Transaction ID: ${txId}`
            );
          } catch (error) {
            console.error(
              `Failed to send tokens to ${address}. Error: ${error}`
            );
            status = "failed"; // Mark the status as failed
            transactionId = ""; // No transaction ID for failed transactions
          }
        } else {
          console.log(
            `Dry-run: Would send ${tokenAmount} tokens to ${address}.`
          );
        }

        // Update count and total token amount regardless of dry run
        distributionCount++;
        totalTokenAmount += tokenAmount;

        // Add this record to output data for CSV
        outputData.push({
          address,
          amount: tokenAmount,
          status,
          transactionId,
        });
      })
  );

  // Execute all token transfers with the defined concurrency limit
  await Promise.all(transferPromises);

  // Log the final result after all transfers are done
  console.log(
    `Distributed ${totalTokenAmount} tokens to ${distributionCount} users`
  );

  // Save output data to a CSV file
  await saveOutputToCSV(outputData, dryRun);
}

async function saveOutputToCSV(
  data: Array<{
    address: string;
    amount: number;
    status: string;
    transactionId: string;
  }>,
  dryRun: boolean
) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const filePath = dryRun
    ? `data/distribution_dryrun-${currentTimestamp}.csv`
    : `data/distribution_report-${currentTimestamp}.csv`;

  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "address", title: "Address" },
      { id: "amount", title: "Amount" },
      { id: "status", title: "Status" },
      { id: "transactionId", title: "Transaction ID" },
    ],
  });

  // Write data to CSV
  await csvWriter.writeRecords(data);
  console.log(`Output saved to ${filePath}`);
}

distributeTokens(false) // set to `true` to dry run
  .then(() => {
    console.log("Token distribution completed.");
  })
  .catch((error) => {
    console.error("An error occurred during the distribution:", error);
  });
