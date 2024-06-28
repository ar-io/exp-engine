import { MINT_DELAY, expProcessId, testExpProcessId } from "./constants";
import { Balances, JWKInterface } from "./types";
import { chunkObject, delay, loadWallet } from "./utilities";

const { connect, createDataItemSigner } = require("@permaweb/aoconnect");
const wallet: JWKInterface = loadWallet();

export async function transferEXP(
  airdropRecipient: string,
  quantity: number,
  dryRun?: boolean
) {
  if (dryRun) {
    return "dry run";
  } else {
    const { message } = await connect();
    const result = await message({
      process: expProcessId,
      signer: createDataItemSigner(wallet),
      tags: [
        { name: "Action", value: "Transfer" },
        { name: "Recipient", value: airdropRecipient },
        { name: "Quantity", value: quantity.toString() },
      ],
    });
    return result;
  }
}

export async function mintEXP(
  airdropRecipient: string,
  quantity: number,
  dryRun?: boolean
) {
  try {
    if (dryRun) {
      console.log(`Minted ${quantity} EXP to ${airdropRecipient} as dry run`);
      await delay(MINT_DELAY);
      return "dry run";
    } else {
      const { message } = await connect();
      const result = await message({
        process: testExpProcessId,
        signer: createDataItemSigner(wallet),
        tags: [
          { name: "Action", value: "Mint" },
          { name: "Recipient", value: airdropRecipient },
          { name: "Quantity", value: quantity.toString() },
        ],
      });

      console.log(
        `Minted ${quantity} EXP to ${airdropRecipient} with txId ${result}`
      );

      // a small delay in case of bulk mints
      await delay(MINT_DELAY);
      return result;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function loadBalances(balances: Balances, dryRun?: boolean) {
  console.log(`Loading ${Object.keys(balances).length} balances`);
  let totalDistributed = 0;
  for (const key in balances) {
    totalDistributed += balances[key];
  }
  console.log(`Distributing ${totalDistributed} EXP tokens`);
  try {
    if (dryRun) {
      await delay(MINT_DELAY);
      return "dry run";
    } else {
      const { message } = await connect();
      const result = await message({
        process: expProcessId,
        signer: createDataItemSigner(wallet),
        tags: [{ name: "Action", value: "Load-Balances" }],
        data: JSON.stringify(balances),
      });
      console.log(`Loaded balances with txId ${result}`);

      // a small delay in case of bulk mints
      await delay(MINT_DELAY);
      return result;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function chunkAndLoadBalances(
  balances: Record<string, number>,
  dryRun?: boolean
) {
  const chunkSize = 10000; // Chunk size of 10,000 items
  const chunks = chunkObject(balances, chunkSize);

  console.log(
    `Loading ${Object.keys(balances).length} balances in ${
      chunks.length
    } chunks`
  );
  let totalDistributed = 0;
  for (const key in balances) {
    totalDistributed += balances[key];
  }
  console.log(`Distributing ${totalDistributed} EXP tokens`);

  try {
    for (const chunk of chunks) {
      if (dryRun) {
        await delay(MINT_DELAY);
        console.log("Dry run completed for chunk");
      } else {
        const { message } = await connect();
        const result = await message({
          process: expProcessId,
          signer: createDataItemSigner(wallet),
          tags: [{ name: "Action", value: "Load-Balances" }],
          data: JSON.stringify(chunk),
        });
        console.log(`Loaded balances with txId ${result}`);

        // a small delay in case of bulk mints
        await delay(MINT_DELAY);
      }
    }
    return dryRun ? "dry run" : "success";
  } catch (err) {
    console.log(err);
    return "error";
  }
}
