import { JWKInterface } from "./types";
import { loadWallet } from "./utilities";

const expProcessId = "aYrCboXVSl1AXL9gPFe3tfRxRf0ZmkOXH65mKT0HHZw";
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
  if (dryRun) {
    console.log(`Minted ${quantity} EXP to ${airdropRecipient} as dry run`);
    return "dry run";
  } else {
    const { message } = await connect();
    const result = await message({
      process: expProcessId,
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
    return result;
  }
}
