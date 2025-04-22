import { parseCSV } from "./exp-airdrop-2/helpers";
import { JWKInterface } from "./types";
import { loadWallet } from "./utilities";
import { createDataItemSigner, message } from "@permaweb/aoconnect";
import fs from "fs";
import path from "path";

// Set to true for testing (no transactions will be sent)
const dryRun = false;

const csvFilePath = path.join(__dirname, "..", "data", "permabrawl.csv");
const logFilePath = path.join(
  __dirname,
  "..",
  "logs",
  "successful-transfers.json"
);

async function main() {
  const wallet: JWKInterface = loadWallet("exp");

  // Parse CSV to get recipient addresses
  const records = await parseCSV(csvFilePath);
  const recipientAddresses = records.map((record) => record.wallet); // Ensure 'wallet' is the column name in CSV

  if (recipientAddresses.length === 0) {
    throw new Error("No recipient addresses found in CSV.");
  }

  // Load existing log file (if it exists)
  let successfulTransfers: { [key: string]: string } = {};
  if (fs.existsSync(logFilePath)) {
    successfulTransfers = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
  }

  // Filter out already processed addresses
  const newRecipients = recipientAddresses.filter(
    (addr) => !successfulTransfers[addr]
  );

  if (newRecipients.length === 0) {
    console.log("All recipients have already received their tokens. Exiting.");
    return;
  }

  const totalRecipients = 3045;
  const totalAO = 843; // AO in whole units
  const decimals = BigInt(1_000_000_000_000); // 1 AO = 10^12 sub-units
  const amountPerRecipient =
    (BigInt(totalAO) * decimals) / BigInt(totalRecipients);

  if (amountPerRecipient < BigInt(1)) {
    throw new Error("Too many recipients for the given AO amount.");
  }

  // Convert BigInt to human-readable AO format (12 decimal places) for logs
  const amountPerRecipientAO = (
    Number(amountPerRecipient) / Number(decimals)
  ).toFixed(12);

  console.log(
    `Dry Run Mode: ${
      dryRun
        ? "Enabled (No transactions will be sent)"
        : "Disabled (Transactions will be executed)"
    }`
  );
  console.log(
    `Distributing ${totalAO} AO evenly among ${recipientAddresses.length} recipients.`
  );
  console.log(`Each recipient gets ${amountPerRecipientAO} AO.`);
  console.log(
    `Skipping ${
      recipientAddresses.length - newRecipients.length
    } already processed recipients.`
  );

  for (const recipient of newRecipients) {
    if (dryRun) {
      console.log(
        `[DRY RUN] Would send ${amountPerRecipientAO} AO (${amountPerRecipient.toString()} armstrongs) to ${recipient}`
      );
    } else {
      try {
        const messageId = await message({
          process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // AO Token Process ID
          signer: createDataItemSigner(wallet),
          tags: [
            { name: "Action", value: "Transfer" },
            { name: "Recipient", value: recipient },
            { name: "Quantity", value: amountPerRecipient.toString() }, // Use raw BigInt value (sub-units)
          ],
          data: "",
        });

        console.log(
          `Sent ${amountPerRecipientAO} AO (${amountPerRecipient.toString()} sub-units) to ${recipient} (Message ID: ${messageId})`
        );

        // Log successful transfer
        successfulTransfers[recipient] = messageId;
        fs.writeFileSync(
          logFilePath,
          JSON.stringify(successfulTransfers, null, 2)
        );
      } catch (error) {
        console.error(`Failed to send AO to ${recipient}:`, error);
      }
    }
  }

  console.log("Bulk transfer process completed.");
  console.log(
    `Distributed ${totalAO} AO evenly among ${newRecipients.length} new recipients.`
  );
}

main();
