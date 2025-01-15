import { scoringRules } from "./constants";
import { fetchGateways, writeScoresToCSV } from "./helpers";

async function main() {
  console.log("Fetching gateways...");
  const gateways = await fetchGateways();

  const gatewayScores: {
    [address: string]: {
      totalScore: number;
      categories: { [key: string]: number };
    };
  } = {};

  for (const gateway of gateways) {
    const { stats, settings, gatewayAddress, totalDelegatedStake, status } =
      gateway;

    if (!gatewayAddress) continue;

    // Initialize gateway score entry if it doesn't exist
    if (!gatewayScores[gatewayAddress]) {
      gatewayScores[gatewayAddress] = {
        totalScore: 0,
        categories: {},
      };
    }

    // 1. Scoring for active gateways
    if (status === "joined") {
      console.log(`- Adding score for hasActiveGateway for ${gatewayAddress}`);
      gatewayScores[gatewayAddress].totalScore += scoringRules.hasActiveGateway;
      gatewayScores[gatewayAddress].categories.hasActiveGateway =
        scoringRules.hasActiveGateway;
    }

    if (stats?.passedConsecutiveEpochs > 100) {
      console.log(
        `- Adding score for passedConsecutiveEpochs for ${gatewayAddress}`
      );
      gatewayScores[gatewayAddress].totalScore +=
        scoringRules.hundredPassedConsecutiveEpochs;
      gatewayScores[gatewayAddress].categories.hundredPassedConsecutiveEpochs =
        scoringRules.hundredPassedConsecutiveEpochs;
    }

    // 2. Scoring for prescribed observer performance
    if (stats?.prescribedEpochCount > 10) {
      const observerPerformance =
        (stats.observedEpochCount / stats.prescribedEpochCount) * 100;

      if (observerPerformance >= 50) {
        console.log(
          `- Adding score for prescribedObserverPerformance for ${gatewayAddress}`
        );
        gatewayScores[gatewayAddress].totalScore +=
          scoringRules.prescribedObserverPerformance;
        gatewayScores[gatewayAddress].categories.prescribedObserverPerformance =
          scoringRules.prescribedObserverPerformance;
      }
    }

    // 3. Scoring for high performance epochs (90% or greater performance)
    if (stats?.passedConsecutiveEpochs > 100) {
      console.log(
        `- Adding score for participatedHighPerformance for ${gatewayAddress}`
      );
      gatewayScores[gatewayAddress].totalScore +=
        scoringRules.participatedHighPerformance;
      gatewayScores[gatewayAddress].categories.participatedHighPerformance =
        scoringRules.participatedHighPerformance;
    }

    // 4. Scoring for medium performance epochs (75% or greater performance)
    if (stats?.totalEpochCount > 50) {
      console.log(
        `- Adding score for participatedMediumPerformance for ${gatewayAddress}`
      );
      gatewayScores[gatewayAddress].totalScore +=
        scoringRules.participatedMediumPerformance;
      gatewayScores[gatewayAddress].categories.participatedMediumPerformance =
        scoringRules.participatedMediumPerformance;
    }

    // 5. Scoring for gateways with a note set
    if (settings?.note) {
      console.log(
        `- Adding score for customizedGatewayNote for ${gatewayAddress}`
      );
      gatewayScores[gatewayAddress].totalScore +=
        scoringRules.customizedGatewayNote;
      gatewayScores[gatewayAddress].categories.customizedGatewayNote =
        scoringRules.customizedGatewayNote;
    }

    // 6. Scoring for gateways with delegated staking enabled
    if (settings?.allowDelegatedStaking && totalDelegatedStake > 0) {
      console.log(
        `- Adding score for gatewayHasDelegates for ${gatewayAddress}`
      );
      gatewayScores[gatewayAddress].totalScore +=
        scoringRules.gatewayHasDelegates;
      gatewayScores[gatewayAddress].categories.gatewayHasDelegates =
        scoringRules.gatewayHasDelegates;

      // Additional score for gateways with many delegates (threshold 10)
      if (totalDelegatedStake >= 10 * settings.minDelegatedStake) {
        console.log(
          `- Adding score for gatewayHasManyDelegates for ${gatewayAddress}`
        );
        gatewayScores[gatewayAddress].totalScore +=
          scoringRules.gatewayHasManyDelegates;
        gatewayScores[gatewayAddress].categories.gatewayHasManyDelegates =
          scoringRules.gatewayHasManyDelegates;
      }
    }
  }

  // Prepare data for CSV
  const scores = Object.entries(gatewayScores).map(([address, data]) => ({
    address,
    totalScore: data.totalScore,
    hasActiveGateway: data.categories.hasActiveGateway || 0,
    prescribedObserverPerformance:
      data.categories.prescribedObserverPerformance || 0,
    participatedHighPerformance:
      data.categories.participatedHighPerformance || 0,
    participatedMediumPerformance:
      data.categories.participatedMediumPerformance || 0,
    hundredPassedConsecutiveEpochs:
      data.categories.hundredPassedConsecutiveEpochs || 0,
    customizedGatewayNote: data.categories.customizedGatewayNote || 0,
    gatewayHasDelegates: data.categories.gatewayHasDelegates || 0,
    gatewayHasManyDelegates: data.categories.gatewayHasManyDelegates || 0,
  }));

  await writeScoresToCSV(scores, "gatewayScores.csv");
  console.log("Gateway scores written to gatewayScores.csv");
}

main().catch((err) => console.error(err));
