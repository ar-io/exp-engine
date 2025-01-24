import { scoringRules } from "./constants";
import { fetchVouchedUsers, writeScoresToCSV } from "./helpers";

async function main() {
  console.log("[INFO] Fetching vouched users...");

  const processId = "ZTTO02BL2P-lseTLUgiIPD9d0CF1sc4LbMA2AQ7e9jo";

  try {
    // Fetch vouched user addresses
    const vouchedUsers = await fetchVouchedUsers(processId);

    if (!vouchedUsers || vouchedUsers.size === 0) {
      console.warn("[WARN] No vouched users found.");
      return;
    }

    console.log(`[INFO] Found ${vouchedUsers.size} vouched users.`);

    // Prepare scores
    const scores = Array.from(vouchedUsers).map((address) => ({
      Address: address,
      TotalScore: scoringRules.vouchedUser,
      VouchedUserScore: scoringRules.vouchedUser,
    }));

    // Write to CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `vouchedUserScores_${timestamp}.csv`;

    await writeScoresToCSV(scores, outputFileName);
    console.log(`[INFO] Vouched user scores written to ${outputFileName}`);
  } catch (error) {
    console.error("[ERROR] Failed to fetch or process vouched users:", error);
  }
}

main().catch((err) => console.error("[FATAL] Unexpected error:", err));
