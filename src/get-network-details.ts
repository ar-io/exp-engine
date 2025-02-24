import { ARIO } from "@ar.io/sdk";
import axios from "axios";
import countryList from "country-list";
import * as csvWriter from "csv-writer";
import * as dns from "dns/promises";
import { lookup } from "geoip-lite";
import * as math from "mathjs";
import path from "path";
import { performance } from "perf_hooks";

let leavingGateways = 0;
let totalGatewaysFound = 0;

interface GatewayInfo {
  fqdn: string;
  ipAddress: string;
  ping: number;
  release: string;
  processId: string;
  ans104UnbundleFilter: any;
  ans104IndexFilter: any;
  supportedManifestVersions: any;
  operatorStake: number;
  totalDelegatedStake: number;
  delegatesCount: number;
  status: string;
  prescribedEpochCount: number;
  observedEpochCount: number;
  totalEpochCount: number;
  passedEpochCount: number;
  failedEpochCount: number;
  failedConsecutiveEpochs: number;
  passedConsecutiveEpochs: number;
  isp?: string;
  geoLocation?: string;
  delegates?: string[];
  errorMessage?: string;
}

(async () => {
  try {
    const io = ARIO.init();
    const gateways: GatewayInfo[] = [];
    let cursor = undefined;
    let hasMore = true;

    console.log("Starting to fetch gateways from AR.IO registry...");

    // Fetch all gateways from AR.IO registry
    while (hasMore) {
      console.log("Fetching gateways with cursor:", cursor);
      const response: any = await io.getGateways({
        cursor,
        limit: 1000,
        sortOrder: "desc",
        sortBy: "operatorStake",
      });

      console.log(`Fetched ${response.items.length} gateways`);

      for (const gateway of response.items) {
        totalGatewaysFound++;
        if (gateway.status !== "joined") {
          // Skip gateways that are not joined
          leavingGateways++;
          continue;
        }
        const fqdn = gateway.settings.fqdn;
        const port = gateway.settings.port;
        const protocol = gateway.settings.protocol;
        const operatorStake = gateway.operatorStake;
        const totalDelegatedStake = gateway.totalDelegatedStake || 0;
        const delegates = gateway.delegates
          ? Object.keys(gateway.delegates)
          : [];
        const delegatesCount = delegates.length;
        const status = gateway.status;
        const prescribedEpochCount = gateway.stats.prescribedEpochCount;
        const observedEpochCount = gateway.stats.observedEpochCount;
        const totalEpochCount = gateway.stats.totalEpochCount;
        const passedEpochCount = gateway.stats.passedEpochCount;
        const failedEpochCount = gateway.stats.failedEpochCount;
        const failedConsecutiveEpochs = gateway.stats.failedConsecutiveEpochs;
        const passedConsecutiveEpochs = gateway.stats.passedConsecutiveEpochs;

        const url = `${protocol}://${fqdn}:${port}/ar-io/info`;
        console.log(`Fetching info from gateway: ${url}`);

        try {
          const startTime = performance.now();
          const result = await axios.get(url);
          const endTime = performance.now();

          const ping = endTime - startTime;
          const release = result.data.release;
          const processId = result.data.processId;
          const ans104UnbundleFilter = result.data.ans104UnbundleFilter;
          const ans104IndexFilter = result.data.ans104IndexFilter;
          const supportedManifestVersions =
            result.data.supportedManifestVerions;
          const ipAddress = result.request.socket.remoteAddress;

          let isp = "N/A";
          let geoLocation = "N/A";
          try {
            const resolvedAddresses = await dns.lookup(fqdn);
            const geo = lookup(resolvedAddresses.address);
            geoLocation = geo ? `${geo.city}, ${geo.country}` : "N/A";
          } catch (geoErr) {
            console.error(
              `Failed to fetch geo info for ${fqdn}:`,
              geoErr.message
            );
          }

          gateways.push({
            fqdn,
            ipAddress,
            ping,
            release,
            processId,
            ans104UnbundleFilter,
            ans104IndexFilter,
            supportedManifestVersions,
            operatorStake,
            totalDelegatedStake,
            delegatesCount,
            status,
            prescribedEpochCount,
            observedEpochCount,
            totalEpochCount,
            passedEpochCount,
            failedEpochCount,
            failedConsecutiveEpochs,
            passedConsecutiveEpochs,
            isp,
            geoLocation,
            delegates,
          });
          console.log(
            `Successfully fetched info from ${fqdn} (Release: ${release}, Ping: ${ping} ms)`
          );
        } catch (err) {
          console.error(`Failed to fetch info from ${fqdn}:`, err.message);
          gateways.push({
            fqdn,
            ipAddress: "N/A",
            ping: -1,
            release: "N/A",
            processId: "N/A",
            ans104UnbundleFilter: {},
            ans104IndexFilter: {},
            supportedManifestVersions: {},
            operatorStake,
            totalDelegatedStake,
            delegatesCount,
            status,
            prescribedEpochCount,
            observedEpochCount,
            totalEpochCount,
            passedEpochCount,
            failedEpochCount,
            failedConsecutiveEpochs,
            passedConsecutiveEpochs,
            isp: "N/A",
            geoLocation: "N/A",
            delegates,
            errorMessage: err.message,
          });
        }
      }

      cursor = response.nextCursor;
      hasMore = response.hasMore;
    }

    console.log(`Finished fetching all ${totalGatewaysFound} gateways.`);

    // FQDN Analytics (only for "Joined" gateways)
    const fqdnStats = gateways.reduce(
      (stats, gateway) => {
        const fqdn = gateway.fqdn;
        const tld = fqdn.split(".").pop() || "unknown";
        const domainName = fqdn.split(".").slice(0, -1).join(".");
        stats.totalDomainNameLength += domainName.length;
        stats.totalFQDNCount++;
        stats.tlds[tld] = (stats.tlds[tld] || 0) + 1;
        stats.fqdnLengths.push(domainName.length);
        return stats;
      },
      {
        totalFQDNCount: 0,
        totalDomainNameLength: 0,
        tlds: {} as Record<string, number>,
        fqdnLengths: [] as number[],
      }
    );

    // Sort TLDs by frequency (highest count first)
    const sortedTLDs = Object.entries(fqdnStats.tlds)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .map(([tld, count]) => ({ tld, count }));

    // Calcualte unique tlds
    const uniqueTLDCount = Object.keys(fqdnStats.tlds).length;

    // Calculate average domain name length
    const averageDomainNameLength =
      fqdnStats.totalDomainNameLength / fqdnStats.totalFQDNCount;

    console.log("\n===== FQDN Analytics =====");
    console.log(`Total FQDNs (Joined): ${fqdnStats.totalFQDNCount}`);
    console.log(`Unique TLDs: ${uniqueTLDCount}`);
    console.log(
      `Average Domain Name Length: ${averageDomainNameLength.toFixed(2)}`
    );
    console.log("\nTLD Frequency (Sorted):");
    sortedTLDs.forEach(({ tld, count }) => {
      console.log(`  ${tld}: ${count}`);
    });

    const fqdnLengthDistribution = fqdnStats.fqdnLengths.reduce(
      (distribution, length) => {
        distribution[length] = (distribution[length] || 0) + 1;
        return distribution;
      },
      {} as Record<number, number>
    );

    console.log("\nDomain Name Length Distribution:");
    Object.entries(fqdnLengthDistribution).forEach(([length, count]) => {
      console.log(`  Length ${length}: ${count}`);
    });

    // Write results to a CSV file
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    // Resolve the path to the directory where the JSON file will be saved
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const fileName = `gateways_info_${currentTimestamp}.csv`;
    const dataPath = path.join(__dirname, "..", "data", fileName);
    const csvWriterInstance = createCsvWriter({
      path: dataPath,
      header: [
        { id: "fqdn", title: "FQDN" },
        { id: "ipAddress", title: "IP Address" },
        { id: "ping", title: "Ping (ms)" },
        { id: "release", title: "Release" },
        { id: "operatorStake", title: "Operator Stake" },
        { id: "totalDelegatedStake", title: "Total Delegated Stake" },
        { id: "delegatesCount", title: "Delegates Count" },
        { id: "status", title: "Status" },
        { id: "prescribedEpochCount", title: "Prescribed Epoch Count" },
        { id: "observedEpochCount", title: "Observed Epoch Count" },
        { id: "totalEpochCount", title: "Total Epoch Count" },
        { id: "passedEpochCount", title: "Passed Epoch Count" },
        { id: "failedEpochCount", title: "Failed Epoch Count" },
        { id: "failedConsecutiveEpochs", title: "Failed Consecutive Epochs" },
        { id: "passedConsecutiveEpochs", title: "Passed Consecutive Epochs" },
        { id: "isp", title: "ISP" },
        { id: "geoLocation", title: "Geo Location" },
        { id: "errorMessage", title: "Error Message" },
        { id: "processId", title: "Process Id" },
        { id: "ans104UnbundleFilter", title: "ANS-104 Unbundle Filter" },
        { id: "ans104IndexFilter", title: "ANS-104 Index Filter" },
        {
          id: "supportedManifestVersions",
          title: "Supported Manifest Versions",
        },
      ],
    });

    await csvWriterInstance.writeRecords(gateways);
    console.log(`Gateways information exported successfully to ${fileName}`);

    // Provide summary of results
    const totalGateways = gateways.length + leavingGateways;
    const joinedGateways = gateways.filter((g) => g.status === "joined").length;
    const onlineGateways = gateways.filter((g) => g.ping > 0).length;
    const releaseCounts: { [key: string]: number } = {};
    gateways.forEach((g) => {
      if (g.release !== "N/A") {
        releaseCounts[g.release] = (releaseCounts[g.release] || 0) + 1;
      }
    });
    const totalOperatorStake = gateways.reduce(
      (sum, g) => sum + g.operatorStake,
      0
    );
    const totalDelegatedStake = gateways.reduce(
      (sum, g) => sum + g.totalDelegatedStake,
      0
    );
    const totalDelegates = gateways.reduce(
      (sum, g) => sum + g.delegatesCount,
      0
    );
    const uniqueDelegates = new Set<string>();
    gateways.forEach((g) => {
      if (g.delegates) {
        g.delegates.forEach((delegate) => uniqueDelegates.add(delegate));
      }
    });

    console.log("\n===== Summary of Results =====");
    console.log(`Total Gateways: ${totalGateways}`);
    console.log(`Gateways Joined: ${joinedGateways}`);
    console.log(`Gateways Online: ${onlineGateways}`);
    console.log(`Gateways Leaving: ${leavingGateways}`);
    console.log("\nRelease Counts:");
    Object.entries(releaseCounts).forEach(([release, count]) => {
      console.log(`  Release ${release}: ${count} gateways`);
    });
    console.log(`\nTotal Operator Stake: ${totalOperatorStake}`);
    console.log(`Total Delegated Stake: ${totalDelegatedStake}`);
    console.log(`Total Delegates: ${totalDelegates}`);
    console.log(`Unique Delegates: ${uniqueDelegates.size}`);

    // Advanced Analytics
    console.log("\n===== Advanced Analytics =====");

    // Regional Analysis
    const regionalAnalysis: {
      [key: string]: { count: number; totalPing: number };
    } = {};
    const countryAnalysis: {
      [key: string]: { count: number; totalPing: number };
    } = {};
    gateways.forEach((g) => {
      if (g.geoLocation && g.geoLocation !== "N/A" && g.ping > 0) {
        // Regional Analysis
        if (!regionalAnalysis[g.geoLocation]) {
          regionalAnalysis[g.geoLocation] = { count: 0, totalPing: 0 };
        }
        regionalAnalysis[g.geoLocation].count += 1;
        regionalAnalysis[g.geoLocation].totalPing += g.ping;

        // Country Analysis
        const countryCode = g.geoLocation.split(",").pop()?.trim();
        if (countryCode && countryCode !== "N/A") {
          const countryName = countryList.getName(countryCode) || countryCode;
          if (!countryAnalysis[countryName]) {
            countryAnalysis[countryName] = { count: 0, totalPing: 0 };
          }
          countryAnalysis[countryName].count += 1;
          countryAnalysis[countryName].totalPing += g.ping;
        }
      }
    });

    console.log("\nRegional Analysis:");
    Object.entries(regionalAnalysis).forEach(([region, data]) => {
      const avgPing = data.totalPing / data.count;
      console.log(
        `  ${region}: Average Ping = ${avgPing.toFixed(2)} ms, Gateways = ${
          data.count
        }`
      );
    });

    console.log("\nCountry Analysis:");
    Object.entries(countryAnalysis).forEach(([country, data]) => {
      const avgPing = data.totalPing / data.count;
      console.log(
        `  ${country}: Average Ping = ${avgPing.toFixed(2)} ms, Gateways = ${
          data.count
        }`
      );
    });

    // Stake vs Performance Analysis
    const stakeVsPerformance: {
      highStakePoorPerf: GatewayInfo[];
      lowStakeGoodPerf: GatewayInfo[];
    } = {
      highStakePoorPerf: [],
      lowStakeGoodPerf: [],
    };
    const medianPing = math.median(
      gateways.filter((g) => g.ping > 0).map((g) => g.ping)
    );
    const medianStake = math.median(gateways.map((g) => g.operatorStake));
    const highLatencyThreshold = medianPing * 1.5; // Adjust latency expectations
    gateways.forEach((g) => {
      if (g.ping > medianPing && g.operatorStake > medianStake) {
        stakeVsPerformance.highStakePoorPerf.push(g);
      } else if (g.ping <= medianPing && g.operatorStake <= medianStake) {
        stakeVsPerformance.lowStakeGoodPerf.push(g);
      }
    });
    console.log("\nStake vs Performance Analysis:");
    console.log(
      `  High Stake Poor Performance Gateways: ${stakeVsPerformance.highStakePoorPerf.length}`
    );
    console.log(
      `  Low Stake Good Performance Gateways: ${stakeVsPerformance.lowStakeGoodPerf.length}`
    );

    // Clustering Analysis
    const clusters: {
      lowLatencyHighStake: GatewayInfo[];
      highLatencyLowStake: GatewayInfo[];
    } = {
      lowLatencyHighStake: [],
      highLatencyLowStake: [],
    };
    gateways.forEach((g) => {
      if (g.ping <= medianPing && g.operatorStake >= medianStake) {
        clusters.lowLatencyHighStake.push(g);
      } else if (
        g.ping > highLatencyThreshold &&
        g.operatorStake < medianStake
      ) {
        clusters.highLatencyLowStake.push(g);
      }
    });
    console.log("\nClustering Analysis:");
    console.log(
      `  Low Latency High Stake Gateways: ${clusters.lowLatencyHighStake.length}`
    );
    console.log(
      `  High Latency Low Stake Gateways: ${clusters.highLatencyLowStake.length}`
    );
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
})();
