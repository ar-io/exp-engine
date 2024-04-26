import { JWKInterface } from "./types";
import { loadWallet } from "./utilities";

const expProcessId = "gAC5hpUPh1v-oPJLnK3Km6-atrYlvI271bI-q0yZOnw";
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
    console.log(result);
    return result;
  }
}
