import { createDataItemSigner, message } from "@permaweb/aoconnect";
import { readFileSync } from "fs";

async function main() {
  const wallet = JSON.parse(
    readFileSync("/path/to/arweave/wallet.json").toString()
  );

  const recipientWalletAddress = "ysuonk5asXwMweCjbKBWIjMLlvhgZP94sDlHDxGDzJo"; // The wallet to be checked
  const quantity = 1_000_000_000_000; // Has a denomination of 12, meaning 1 AO = 1,000,000,000,000 sub units of AO.
  const messageId = await message({
    process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // This is the AO Token Process ID
    signer: createDataItemSigner(wallet),
    tags: [
      { name: "Action", value: "Transfer" },
      { name: "Recipient", value: recipientWalletAddress },
      { name: "Quantity", value: quantity.toString() },
    ],
    data: "",
  });

  // Ensure the Messages array exists and contains at least one message
  if (!messageId) {
    throw new Error("No messages returned from dryrun.");
  }

  console.log(
    `${quantity} sent to ${recipientWalletAddress} with ${messageId}`
  );
}

main();
