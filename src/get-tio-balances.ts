import { Balances, Gateways } from "./types";
import { saveJsonToFile } from "./utilities";
import { dryrun } from "@permaweb/aoconnect";

async function main() {
  // console.log(`dry run results:`);
  // console.dir(balancesDryRead.Messages[0], { depth: 30 });
  const balancesDryRead = await dryrun({
    process: "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
    tags: [{ name: "Action", value: "Balances" }],
  });

  // Parse the JSON string into a JavaScript object
  const balancesData: Record<string, number> = JSON.parse(
    balancesDryRead.Messages[0].Data
  );

  const gatewaysDryRead = await dryrun({
    process: "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
    tags: [{ name: "Action", value: "Gateways" }],
  });

  // Parse the JSON string into a JavaScript object
  const gatewaysData: Gateways = JSON.parse(gatewaysDryRead.Messages[0].Data);

  const totalBalances = analyzeBalances(balancesData);
  const { totalDelegatedStake, totalOperatorStake } =
    analyzeGateways(gatewaysData);
  const totalSupply = totalBalances + totalDelegatedStake + totalOperatorStake;
  console.log(`Total Tokens in supply: ${totalSupply / 1000000}`);
}

main();

function analyzeBalances(balances: Balances) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Convert the object to an array of key-value pairs
  const balancesItems: [string, number][] = Object.entries(balances);

  // Sort the array by the values in descending order
  balancesItems.sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  // Convert the sorted array back to an object
  const sortedData: Record<string, number> = Object.fromEntries(balancesItems);

  // Convert the sorted object back to a JSON string
  saveJsonToFile(sortedData, `dio-balances-${currentTimestamp}.json`);

  // Extract values into an array
  const balancesArray: number[] = Object.values(balances);

  // Calculate total balance
  const totalBalance = balancesArray.reduce((sum, balance) => sum + balance, 0);

  // Calculate average balance
  const averageBalance = totalBalance / balances.length;

  // Find minimum and maximum balances
  const minBalance = Math.min(...balancesArray);
  const maxBalance = Math.max(...balancesArray);

  // Count total balance holders
  const totalBalanceHolders = balancesArray.length;

  // Count non-zero balance holders
  const nonZeroBalanceHolders = balancesArray.filter(
    (balance) => balance > 0
  ).length;

  // Categorize balances into ranges
  const ranges = {
    "0": 0,
    "1-750M": 0,
    "750M-1500M": 0,
    "1500M-2500M": 0,
    "2500M+": 0,
  };

  balancesArray.forEach((balance) => {
    if (balance === 0) {
      ranges["0"]++;
    } else if (balance <= 750000000) {
      ranges["1-750M"]++;
    } else if (balance <= 1500000000) {
      ranges["750M-1500M"]++;
    } else if (balance <= 2500000000) {
      ranges["1500M-2500M"]++;
    } else ranges["2500M+"]++;
  });

  // Generate the reports
  const balancesReport = `
  Timestamp: ${currentTimestamp}
  (Unlocked) Balance Report:
    ---------------
    Total Balance Holders: ${totalBalanceHolders}
    Non-Zero Balance Holders: ${nonZeroBalanceHolders}
    Total Balance: ${totalBalance / 1_000_000 || 0}
    Average Balance: ${averageBalance / 1_000_000 || 0}
    Minimum Balance: ${minBalance / 1_000_000 || 0}
    Maximum Balance: ${maxBalance / 1_000_000 || 0}
    
    Balance Distribution:
      0: ${ranges["0"]}
      1-750M: ${ranges["1-750M"]}
      750M-1500M: ${ranges["750M-1500M"]}
      1500M-2500M: ${ranges["1500M-2500M"]}
      2500M+: ${ranges["2500M+"]}
      `;

  console.log(balancesReport);
  return totalBalance;
}

function analyzeGateways(gateways: Gateways) {
  const summary = {
    totalGateways: 0,
    totalOperatorStake: 0,
    totalDelegatedStake: 0,
    allowDelegatedStaking: 0,
    autoStake: 0,
    protocolCounts: {} as Record<string, number>,
    minDelegatedStake: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      total: 0,
    },
    delegateRewardShareRatio: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      total: 0,
    },
    stats: {
      totalEpochParticipationCount: 0,
      totalFailedConsecutiveEpochs: 0,
      totalPassedEpochs: 0,
      totalSubmittedEpochs: 0,
      totalEpochsPrescribed: 0,
      maxFailedConsecutiveEpochs: 0,
      maxPassedEpochCount: 0,
      avgFailedConsecutiveEpochs: 0,
      avgPassedEpochCount: 0,
      gatewayStats: [] as {
        id: string;
        successRate: number;
        failureRate: number;
      }[],
    },
    delegatedStaking: {
      totalAllowed: 0,
      totalDisallowed: 0,
      minStake: Infinity,
      maxStake: -Infinity,
      avgStake: 0,
      totalStake: 0,
      rewardShareRatios: [] as number[],
      uniqueStakers: new Set<string>(),
      nonUniqueStakers: 0,
    },
  };

  for (const key in gateways) {
    const gateway = gateways[key];
    summary.totalGateways++;
    summary.totalOperatorStake += gateway.operatorStake;
    summary.totalDelegatedStake += gateway.totalDelegatedStake;
    if (gateway.settings.allowDelegatedStaking) summary.allowDelegatedStaking++;
    if (gateway.settings.autoStake) summary.autoStake++;

    const protocol = gateway.settings.protocol;
    if (!summary.protocolCounts[protocol]) {
      summary.protocolCounts[protocol] = 0;
    }
    summary.protocolCounts[protocol]++;

    const minDelegatedStake = gateway.settings.minDelegatedStake;
    summary.minDelegatedStake.total += minDelegatedStake;
    if (minDelegatedStake < summary.minDelegatedStake.min) {
      summary.minDelegatedStake.min = minDelegatedStake;
    }
    if (minDelegatedStake > summary.minDelegatedStake.max) {
      summary.minDelegatedStake.max = minDelegatedStake;
    }

    const delegateRewardShareRatio = gateway.settings.delegateRewardShareRatio;
    summary.delegateRewardShareRatio.total += delegateRewardShareRatio;
    if (delegateRewardShareRatio < summary.delegateRewardShareRatio.min) {
      summary.delegateRewardShareRatio.min = delegateRewardShareRatio;
    }
    if (delegateRewardShareRatio > summary.delegateRewardShareRatio.max) {
      summary.delegateRewardShareRatio.max = delegateRewardShareRatio;
    }

    const stats = gateway.stats;
    summary.stats.totalEpochParticipationCount +=
      stats.totalEpochParticipationCount;
    summary.stats.totalFailedConsecutiveEpochs += stats.failedConsecutiveEpochs;
    summary.stats.totalPassedEpochs += stats.passedEpochCount;
    summary.stats.totalSubmittedEpochs += stats.submittedEpochCount;
    summary.stats.totalEpochsPrescribed += stats.totalEpochsPrescribedCount;
    summary.stats.avgFailedConsecutiveEpochs += stats.failedConsecutiveEpochs;
    summary.stats.avgPassedEpochCount += stats.passedEpochCount;
    if (
      stats.failedConsecutiveEpochs > summary.stats.maxFailedConsecutiveEpochs
    ) {
      summary.stats.maxFailedConsecutiveEpochs = stats.failedConsecutiveEpochs;
    }
    if (stats.passedEpochCount > summary.stats.maxPassedEpochCount) {
      summary.stats.maxPassedEpochCount = stats.passedEpochCount;
    }

    const successRate =
      stats.totalEpochParticipationCount > 0
        ? (stats.passedEpochCount / stats.totalEpochParticipationCount) * 100
        : 0;
    const failureRate =
      stats.totalEpochParticipationCount > 0
        ? (stats.failedConsecutiveEpochs / stats.totalEpochParticipationCount) *
          100
        : 0;
    summary.stats.gatewayStats.push({
      id: key,
      successRate,
      failureRate,
    });

    // Delegated staking analysis
    if (gateway.settings.allowDelegatedStaking) {
      summary.delegatedStaking.totalAllowed++;
      for (const delegateKey in gateway.delegates) {
        const delegate = gateway.delegates[delegateKey];
        summary.delegatedStaking.totalStake += delegate.delegatedStake;
        summary.delegatedStaking.nonUniqueStakers++;
        summary.delegatedStaking.uniqueStakers.add(delegateKey);
        if (delegate.delegatedStake < summary.delegatedStaking.minStake) {
          summary.delegatedStaking.minStake = delegate.delegatedStake;
        }
        if (delegate.delegatedStake > summary.delegatedStaking.maxStake) {
          summary.delegatedStaking.maxStake = delegate.delegatedStake;
        }
      }
      summary.delegatedStaking.rewardShareRatios.push(
        gateway.settings.delegateRewardShareRatio
      );
    } else {
      summary.delegatedStaking.totalDisallowed++;
    }
  }

  // Calculate averages
  summary.minDelegatedStake.avg =
    summary.minDelegatedStake.total / summary.totalGateways;
  summary.delegateRewardShareRatio.avg =
    summary.delegateRewardShareRatio.total / summary.totalGateways;
  summary.stats.avgFailedConsecutiveEpochs /= summary.totalGateways;
  summary.stats.avgPassedEpochCount /= summary.totalGateways;
  summary.delegatedStaking.avgStake =
    summary.delegatedStaking.totalStake /
    summary.delegatedStaking.nonUniqueStakers;

  console.log("Gateway Summary Report:");
  console.log(`  ---------------`);
  console.log(`  Total Gateways: ${summary.totalGateways}`);
  console.log(
    `  Total Operator Stake: ${summary.totalOperatorStake / 1000000}`
  );
  console.log(
    `  Total Delegated Stake: ${summary.totalDelegatedStake / 1000000}`
  );
  console.log(
    `  Gateways Allowing Delegated Staking: ${summary.allowDelegatedStaking}`
  );
  console.log(`  Gateways with Auto-Stake Enabled: ${summary.autoStake}`);
  console.log("  Minimum Delegated Stake:");
  console.log(`    Min: ${summary.minDelegatedStake.min / 1000000}`);
  console.log(`    Max: ${summary.minDelegatedStake.max / 1000000}`);
  console.log(`    Avg: ${summary.minDelegatedStake.avg / 1000000}`);
  console.log("  Delegate Reward Share Ratio:");
  console.log(`    Min: ${summary.delegateRewardShareRatio.min}`);
  console.log(`    Max: ${summary.delegateRewardShareRatio.max}`);
  console.log(`    Avg: ${summary.delegateRewardShareRatio.avg}`);
  console.log(
    `  Total Epoch Participation Count: ${summary.stats.totalEpochParticipationCount}`
  );
  console.log(
    `  Total Failed Consecutive Epochs: ${summary.stats.totalFailedConsecutiveEpochs}`
  );
  console.log(`  Total Passed Epoch Count: ${summary.stats.totalPassedEpochs}`);
  console.log(
    `  Total Submitted Epoch Count: ${summary.stats.totalSubmittedEpochs}`
  );
  console.log(
    `  Total Epochs Prescribed Count: ${summary.stats.totalEpochsPrescribed}`
  );
  console.log(
    `  Max Failed Consecutive Epochs: ${summary.stats.maxFailedConsecutiveEpochs}`
  );
  console.log(`  Max Passed Epoch Count: ${summary.stats.maxPassedEpochCount}`);
  console.log(
    `  Avg Failed Consecutive Epochs: ${summary.stats.avgFailedConsecutiveEpochs}`
  );
  console.log(`  Avg Passed Epoch Count: ${summary.stats.avgPassedEpochCount}`);
  console.log("");
  console.log("Delegated Staking Report:");
  console.log(`  ---------------`);
  console.log(`  Total Allowed: ${summary.delegatedStaking.totalAllowed}`);
  console.log(
    `  Total Disallowed: ${summary.delegatedStaking.totalDisallowed}`
  );
  console.log(
    `  Unique Delegated Stakers: ${summary.delegatedStaking.uniqueStakers.size}`
  );
  console.log(
    `  Non-Unique Delegated Stakers: ${summary.delegatedStaking.nonUniqueStakers}`
  );
  console.log(
    `  Min Stake: ${summary.delegatedStaking.minStake / 1000000 || 0}`
  );
  console.log(
    `  Max Stake: ${summary.delegatedStaking.maxStake / 1000000 || 0}`
  );
  console.log(
    `  Avg Stake: ${summary.delegatedStaking.avgStake / 1000000 || 0}`
  );

  return {
    totalDelegatedStake: summary.totalDelegatedStake,
    totalOperatorStake: summary.totalOperatorStake,
  };
}
