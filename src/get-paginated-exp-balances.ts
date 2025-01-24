import { expProcessId } from "./constants";
import { VILENARIOS_CU } from "./exp-airdrop-2/constants";
import { connect } from "@permaweb/aoconnect";

const { dryrun } = connect({
  CU_URL: VILENARIOS_CU,
});

async function main() {
  let cursor: string = "";
  const allBalances: any[] = [];

  do {
    const dryRead = await dryrun({
      process: expProcessId,
      tags: [
        { name: "Action", value: "Paginated-Balances" },
        { name: "Cursor", value: cursor },
        { name: "Limit", value: "10000" },
        { name: "Sort-By", value: "balance" },
        { name: "Sort-Order", value: "asc" },
      ],
    });

    console.log(dryRead);
    // Ensure the Messages array exists and contains at least one message
    if (!dryRead.Messages || dryRead.Messages.length === 0) {
      throw new Error("No messages returned from dryrun.");
    }

    // Ensure the first message contains data
    if (!dryRead.Messages[0].Data) {
      throw new Error("No data found in the first message.");
    }
    console.log(dryRead.Messages[0].Data);
    allBalances.push(dryRead.Messages[0].Data);
    cursor = "whatever";
  } while (cursor);
}

main();
