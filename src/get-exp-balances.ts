import { expProcessId } from "./constants";
import { ARDRIVE_CU } from "./exp-airdrop-2/constants";
import { saveJsonToFile } from "./utilities";
import { connect } from "@permaweb/aoconnect";

const { dryrun } = connect({
  CU_URL: ARDRIVE_CU,
});

async function main() {
  const dryRead = await dryrun({
    process: expProcessId,
    tags: [{ name: "Action", value: "Balances" }],
  });

  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Ensure the Messages array exists and contains at least one message
  if (!dryRead.Messages || dryRead.Messages.length === 0) {
    throw new Error("No messages returned from dryrun.");
  }

  // Ensure the first message contains data
  if (!dryRead.Messages[0].Data) {
    throw new Error("No data found in the first message.");
  }

  // Parse the JSON string into a JavaScript object
  let data: Record<string, number>;
  try {
    data = JSON.parse(dryRead.Messages[0].Data);
  } catch (error) {
    throw new Error("Failed to parse JSON data: " + error.message);
  }

  // Convert the object to an array of key-value pairs
  const items: [string, number][] = Object.entries(data);

  // Sort the array by the values in descending order
  items.sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  // Convert the sorted array back to an object
  const sortedData: Record<string, number> = Object.fromEntries(items);

  // Convert the sorted object back to a JSON string and save it
  saveJsonToFile(sortedData, `exp-balances-${currentTimestamp}.json`);

  // Extract values into an array
  const balances: number[] = Object.values(data);

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
    "1-10M": 0,
    "10-25M": 0,
    "25M-50M": 0,
    "50M-100M": 0,
    "100M-150M": 0,
    "150M-200M": 0,
    "200M-1B": 0,
    "1B+": 0,
  };

  balances.forEach((balance) => {
    if (balance === 0) {
      ranges["0"]++;
    } else if (balance <= 10000000) {
      ranges["1-10M"]++;
    } else if (balance <= 25000000) {
      ranges["10-25M"]++;
    } else if (balance <= 50000000) {
      ranges["25M-50M"]++;
    } else if (balance <= 100000000) {
      ranges["50M-100M"]++;
    } else if (balance <= 150000000) {
      ranges["100M-150M"]++;
    } else if (balance <= 200000000) {
      ranges["150M-200M"]++;
    } else if (balance <= 1000000000) {
      ranges["200M-1B"]++;
    } else {
      ranges["1B+"]++;
    }
  });

  console.log("Total Supply: ", totalBalance);
  // Generate the report
  const report = `
Timestamp: ${currentTimestamp}
Balance Report:
---------------
Total Balance Holders: ${totalBalanceHolders}
Non-Zero Balance Holders: ${nonZeroBalanceHolders}
Total Balance: ${totalBalance || 0}
Average Balance: ${averageBalance / 1_000_000 || 0}
Minimum Balance: ${minBalance / 1_000_000 || 0}
Maximum Balance: ${maxBalance / 1_000_000 || 0}

Balance Distribution:
0: ${ranges["0"]}
1-10M: ${ranges["1-10M"]}
10-25M: ${ranges["10-25M"]}
25-50M: ${ranges["25M-50M"]}
50M-100M: ${ranges["50M-100M"]}
100M-150M: ${ranges["100M-150M"]}
150M-200M: ${ranges["150M-200M"]}
200M+: ${ranges["200M-1B"]}
1B+: ${ranges["1B+"]}
`;

  console.log(report);
}

main();
