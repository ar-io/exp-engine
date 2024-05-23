import { expProcessId } from "./constants";
import { saveJsonToFile } from "./utilities";
import { dryrun } from "@permaweb/aoconnect";

async function main() {
  const dryRead = await dryrun({
    process: expProcessId,
    tags: [{ name: "Action", value: "Balances" }],
  });
  // console.log(`dry run results:`);
  // console.dir(dryRead.Messages[0], { depth: 30 });
  const currentTimestamp = Math.floor(Date.now() / 1000);
  saveJsonToFile(
    JSON.parse(dryRead.Messages[0].Data),
    `exp-balances-${currentTimestamp}.json`
  );
}

main();
