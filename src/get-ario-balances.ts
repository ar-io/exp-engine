import { mainnetArioProcessId } from "./constants";
import { ARDRIVE_CU } from "./exp-airdrop-2/constants";
import { connect } from "@permaweb/aoconnect";
import { createObjectCsvWriter } from "csv-writer";

const { dryrun } = connect({
  CU_URL: ARDRIVE_CU,
});

async function writeBalancesToCSV(data: Record<string, number>) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const csvWriter = createObjectCsvWriter({
    path: `ario_balances_${currentTimestamp}.csv`,
    header: [
      { id: "address", title: "Address" },
      { id: "balance", title: "Balance" },
    ],
  });

  const records = Object.entries(data).map(([address, balance]) => ({
    address,
    balance,
  }));

  await csvWriter.writeRecords(records);
  console.log(`Balances written to ario_balances_${currentTimestamp}.csv`);
}

async function main() {
  const dryRead = await dryrun({
    process: mainnetArioProcessId,
    tags: [{ name: "Action", value: "Balances" }],
  });

  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (!dryRead.Messages || dryRead.Messages.length === 0) {
    throw new Error("No messages returned from dryrun.");
  }

  if (!dryRead.Messages[0].Data) {
    throw new Error("No data found in the first message.");
  }

  let data: Record<string, number>;
  try {
    data = JSON.parse(dryRead.Messages[0].Data);
  } catch (error) {
    throw new Error("Failed to parse JSON data: " + error.message);
  }

  const items: [string, number][] = Object.entries(data);
  items.sort((a, b) => b[1] - a[1]);
  const sortedData: Record<string, number> = Object.fromEntries(items);

  await writeBalancesToCSV(sortedData);

  const balances = Object.values(sortedData);
  const totalBalance = balances.reduce((sum, balance) => sum + balance, 0);
  const averageBalance = totalBalance / balances.length;
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const totalBalanceHolders = balances.length;
  const nonZeroBalanceHolders = balances.filter(
    (balance) => balance > 0
  ).length;

  const report = `
Timestamp: ${currentTimestamp}
Balance Report:
---------------
Total Balance Holders: ${totalBalanceHolders}
Non-Zero Balance Holders: ${nonZeroBalanceHolders}
Total Balance: ${totalBalance}
Average Balance: ${averageBalance / 1_000_000 || 0}
Minimum Balance: ${minBalance / 1_000_000 || 0}
Maximum Balance: ${maxBalance / 1_000_000 || 0}
`;

  console.log(report);
}

main();
