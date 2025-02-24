import { testnetProcessId } from "./constants";
import { JWKInterface } from "./types";
import { loadWallet } from "./utilities";
import { AOProcess, ArweaveSigner, ARIO } from "@ar.io/sdk";
import { connect } from "@permaweb/aoconnect";

// const AO_CU_URL = "https://cu.ar-io.dev";
const AO_CU_URL = "https://vilenarios.com/ao/cu";

// Get the key file used for the distribution
const wallet: JWKInterface = loadWallet("tio");

const io = ARIO.init({
  process: new AOProcess({
    processId: testnetProcessId,
    ao: connect({
      CU_URL: AO_CU_URL,
    }),
  }),
  signer: new ArweaveSigner(wallet),
});

async function distributeTokens(dryRun = true) {
  const target = "sGN2j5J5jgKEkF1vvjYdOnMKid71MMhZrh4OS1b85N8";
  const qty = 750000000; // Always use MIO, eg. 500 IO would be 500000000 MIO

  if (!dryRun) {
    try {
      const { id: txId } = await io.transfer(
        {
          target,
          qty,
        },
        {
          tags: [
            {
              name: "App-Name",
              value: "tIO-Token-Script",
            },
          ],
        }
      );
      console.log(
        `Transaction successful! Sent ${qty} mIO tokens to ${target}. Transaction ID: ${txId}`
      );
    } catch (error) {
      console.error(`Failed to send tokens to ${target}. Error: ${error}`);
    }
  } else {
    console.log(`Dry-run: Would send ${qty} mIO tokens to ${target}.`);
  }
}

distributeTokens(false) // set to `true` to dry run
  .then(() => {
    console.log("Token distribution completed.");
  })
  .catch((error) => {
    console.error("An error occurred during the distribution:", error);
  });
