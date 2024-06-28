import { saveJsonToFile } from "./utilities";
import { ArIO } from "@ar.io/sdk";

async function main() {
  const arIO = ArIO.init();
  const tIObalances = await arIO.getBalances();

  // console.log(`dry run results:`);
  // console.dir(dryRead.Messages[0], { depth: 30 });
  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Convert the object to an array of key-value pairs
  const items: [string, number][] = Object.entries(tIObalances);

  // Sort the array by the values in descending order
  items.sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  // Convert the sorted array back to an object
  const sortedData: Record<string, number> = Object.fromEntries(items);

  // Convert the sorted object back to a JSON string
  saveJsonToFile(sortedData, `tio-balances-${currentTimestamp}.json`);

  // Extract values into an array
  const balances: number[] = Object.values(tIObalances);

  // Calculate total balance
  const totalBalance = balances.reduce((sum, balance) => sum + balance, 0);

  // Calculate average balance
  const averageBalance = totalBalance / balances.length;

  // Find minimum and maximum balances
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);

  // Count total balance holders
  const totalBalanceHolders = balances.length;

  // Count non-zero balance holders
  const nonZeroBalanceHolders = balances.filter(
    (balance) => balance > 0
  ).length;

  // Categorize balances into ranges
  const ranges = {
    "0": 0,
    "1-25M": 0,
    "25M-50M": 0,
    "50M-100M": 0,
    "100M-150M": 0,
    "150M-200M": 0,
    "200M+": 0,
  };

  balances.forEach((balance) => {
    if (balance === 0) {
      ranges["0"]++;
    } else if (balance <= 25000000) {
      ranges["1-25M"]++;
    } else if (balance <= 50000000) {
      ranges["25M-50M"]++;
    } else if (balance <= 100000000) {
      ranges["50M-100M"]++;
    } else if (balance <= 150000000) {
      ranges["100M-150M"]++;
    } else if (balance <= 200000000) {
      ranges["150M-200M"]++;
    } else {
      ranges["200M+"]++;
    }
  });

  // Generate the report
  const report = `
Timestamp: ${currentTimestamp}
Balance Report:
---------------
Total Balance Holders: ${totalBalanceHolders}
Non-Zero Balance Holders: ${nonZeroBalanceHolders}
Total Balance: ${totalBalance / 1_000_000 || 0}
Average Balance: ${averageBalance / 1_000_000 || 0}
Minimum Balance: ${minBalance / 1_000_000 || 0}
Maximum Balance: ${maxBalance / 1_000_000 || 0}

Balance Distribution:
0: ${ranges["0"]}
1-25M: ${ranges["1-25M"]}
25-50M: ${ranges["25M-50M"]}
50M-100M: ${ranges["50M-100M"]}
100M-150M: ${ranges["100M-150M"]}
150M-200M: ${ranges["150M-200M"]}
200M+: ${ranges["200M+"]}
`;

  console.log(report);
}

main();
