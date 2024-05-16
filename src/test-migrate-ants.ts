import { delay, retryFetch } from "./utilities";
import { createDataItemSigner, connect, spawn } from "@permaweb/aoconnect";
import fs from "fs";

const antContractSourceTxId = "mr-4hFu4qAHwbO2Mids2reISTy5lf3oEQFJegGqTCgk";
const gatewayUrl = "https://arweave.net/";
const wallet = "key.json";
const recipient = "iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA";
const jwk = JSON.parse(fs.readFileSync(wallet).toString());
const baseModule = "SBNb1qPQ1TDwpD_mboxm2YllmMLXpWw4U8P9Ff8W9vk";
const scheduler = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
const name = "ANT-MIGRATION-TEST-1";

async function main() {
  try {
    // spawn ant
    const processId = await spawn({
      // The Arweave TXID of the ao Module
      module: baseModule,
      // The Arweave wallet address of a Scheduler Unit
      scheduler: scheduler,
      // A signer function containing your wallet
      signer: createDataItemSigner(jwk),
      /*
        Refer to a Processes' source code or documentation
        for tags that may effect its computation.
      */
      tags: [
        { name: "App-Name", value: "ANT-Migration-Script" },
        { name: "Name", value: name },
      ],
    });
    await delay(5000);

    console.log(`Spawned a new process ${processId}`);
    const { message } = await connect(jwk);

    // Get the source code
    const response = await retryFetch(`${gatewayUrl}${antContractSourceTxId}`);
    const antSourceCode = await response.data.toString();

    // add code with eval
    const loadSourceCodeMessageTxId = await message({
      process: processId,
      tags: [{ name: "Action", value: "Eval" }],
      data: antSourceCode,
      signer: createDataItemSigner(jwk),
    });
    console.log(`Added ANT Source Code ${loadSourceCodeMessageTxId}`);

    // configure ant with eval
    const configureAntMessageTxId = await message({
      process: processId,
      tags: [{ name: "Action", value: "Eval" }],
      data: `Ticker = "MIGRATED"`,
      signer: createDataItemSigner(jwk),
    });
    console.log(`Configured ANT Ticker ${configureAntMessageTxId}`);

    // transfer to new owner
    console.log(`Transferring ANT Process to new owner`);
    const transferMessageTxId = await message({
      process: processId,
      tags: [
        { name: "ProcessId", value: processId },
        { name: "Action", value: "Transfer" },
        { name: "Recipient", value: recipient },
      ],
      signer: createDataItemSigner(jwk),
    });

    console.log(
      `Transferred ANT to ${recipient} with tx id ${transferMessageTxId}`
    );

    // update arns registry with new process id
  } catch (error: any) {
    console.log(
      `Deployment failed!: ${error?.message ?? "Failed to deploy contract!"}\n`
    );
  }
}

main();
