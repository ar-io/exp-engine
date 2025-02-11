import { connect } from "@permaweb/aoconnect";

async function main() {
  const { dryrun } = connect({
    // CU_URL: "https://cu.ardrive.io",
    CU_URL: "https://vilenarios.com/ao/cu",
  });
  const userWalletAddress = "ysuonk5asXwMweCjbKBWIjMLlvhgZP94sDlHDxGDzJo"; // The wallet to be checked
  const dryRead = await dryrun({
    process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc", // This is the AO Token Process ID
    tags: [
      { name: "Action", value: "Balance" },
      { name: "Target", value: userWalletAddress },
    ],
  });

  // Ensure the Messages array exists and contains at least one message
  if (!dryRead.Messages || dryRead.Messages.length === 0) {
    throw new Error("No messages returned from dryrun.");
  }

  // Ensure the first message contains data
  if (!dryRead.Messages[0].Data) {
    throw new Error("No data found in the first message.");
  }

  console.log(
    `AO Balance for ${userWalletAddress} is: ${dryRead.Messages[0].Data}`
  );
  console.log(`Message tags are: ${JSON.parse(dryRead.Messages[0].Tags)}`);
}

main();
