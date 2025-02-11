import { dryrun } from "@permaweb/aoconnect";

async function main() {
  const userWalletAddress = "ysuonk5asXwMweCjbKBWIjMLlvhgZP94sDlHDxGDzJo"
  const dryRead = await dryrun({
    process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // This is the AO Token Process ID
    tags: [
      { name: "Action", value: "Balance" },
      { name: "Recipient", value: userWalletAddress },
    ],
  });

  if (!dryRead.Messages || dryRead.Messages.length === 0) {
    throw new Error("No messages returned from dryrun.");
  }

  if (!dryRead.Messages[0].Data) {
    throw new Error("No balance data found in the first message.");
  }

  console.log(`Balance is: ${dryRead.Messages[0].Data}`);
  console.log(`Message tags are: ${JSON.stringify(dryRead.Messages[0].Tags, null, 2)}`);
}
main();