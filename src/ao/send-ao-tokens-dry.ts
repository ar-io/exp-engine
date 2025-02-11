import { dryrun } from "@permaweb/aoconnect";

async function main() {
  const sendingWalletAddress = "ysuonk5asXwMweCjbKBWIjMLlvhgZP94sDlHDxGDzJo" // The wallet sending the tokens
  const recipientWalletAddress = "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g"; // The wallet receiving the tokens
  const quantity = 100; // AO Has a denomination of 12, meaning 1 AO = 1,000,000,000,000,000,000 sub units of AO.

  const dryRead: any = await dryrun({
    process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // This is the AO Token Process ID
    tags: [
      { name: "Action", value: "Transfer" },
      { name: "Recipient", value: recipientWalletAddress },
      { name: "Quantity", value: quantity.toString() },
    ],
    Owner: sendingWalletAddress
  });

  // Ensure the Messages array exists
  if (!dryRead.Messages ) {
    throw new Error("No messages returned from dryrun.");
  }

  console.log(`Message tags are: ${JSON.stringify(dryRead.Messages[0].Tags, null, 2)}`);
  console.log(`Gas used is: ${dryRead.GasUsed}`)
}

main();
