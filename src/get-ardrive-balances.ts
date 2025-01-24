import axios from "axios";
import fs from "fs";

async function fetchArDriveBalances() {
  console.log("[INFO] Fetching ARDRIVE token balances...");
  let totalArDriveSupply = 0;

  const ardriveApiUrl =
    "https://api.arns.app/v1/contract/-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ";

  try {
    // Fetch data from the API
    const response = await axios.get(ardriveApiUrl);
    const ardriveData = response.data.state;

    if (!ardriveData || !ardriveData.balances || !ardriveData.vault) {
      console.error("[ERROR] ARDRIVE data is missing balances or vaults.");
      return;
    }

    // Prepare a map to store total balances
    const userBalances: Record<string, number> = {};

    // Process balances
    for (const [address, balance] of Object.entries(ardriveData.balances)) {
      totalArDriveSupply += Number(balance);
      userBalances[address] = (userBalances[address] || 0) + Number(balance);
    }

    // Process vaults
    for (const [address, vaults] of Object.entries(ardriveData.vault)) {
      const vaultBalance = (vaults as { balance: number }[]).reduce(
        (sum, vault) => sum + (vault.balance || 0),
        0
      );
      totalArDriveSupply += Number(vaultBalance);
      userBalances[address] = (userBalances[address] || 0) + vaultBalance;
    }

    // Sort the userBalances by balance in descending order
    const sortedBalances = Object.entries(userBalances)
      .sort(([, a], [, b]) => b - a) // Sort by balance (value) descending
      .reduce<Record<string, number>>((acc, [address, balance]) => {
        acc[address] = balance;
        return acc;
      }, {});

    // Output the sorted user balances to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `ardriveUserBalances_${timestamp}.json`;

    fs.writeFileSync(outputFileName, JSON.stringify(sortedBalances, null, 2));
    console.log(`[INFO] ARDRIVE user balances written to ${outputFileName}`);
    console.log(`[INFO] ARDRIVE total supply ${totalArDriveSupply}`);
  } catch (error) {
    console.error("[ERROR] Failed to fetch ARDRIVE token balances:", error);
  }
}

fetchArDriveBalances().catch((err) =>
  console.error("[FATAL] Unexpected error:", err)
);
