import { MINT_DELAY, expProcessId, testExpProcessId } from "./constants";
import { Balances, JWKInterface } from "./types";
import { delay, loadWallet } from "./utilities";

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
  try {
    if (dryRun) {
      await delay(MINT_DELAY);
      return "dry run";
    } else {
      const { message } = await connect();
      const result = await message({
        process: testExpProcessId,
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
