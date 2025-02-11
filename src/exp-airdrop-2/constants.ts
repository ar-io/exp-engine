export type UserScore = {
  address: string;
  score: number;
  categories: string[];
};

export const testnetProcessId = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA";
export const ARDRIVE_CU = "https://cu.ardrive.io";
export const VILENARIOS_CU = "https://vilenarios.com/ao/cu";
export const TESTNET_CU = "https://cu.ao-testnet.xyz";

export const EXCLUSIONS_FILE = "exclusions.csv";

export const NAMES_TO_PROCESS = 5000;
// Define scoring rules
export const scoringRules: { [key: string]: number } = {
  hasArNSName: 100,
  hasActiveArNSName: 100,
  hasUndernames: 50,
  setPrimaryName: 100,
  setCustomLogo: 50,
  setANTController: 50,
  setDescription: 50,
  setKeywords: 50,
  hasActiveGateway: 200,
  participatedHighPerformance: 200,
  participatedMediumPerformance: 100,
  prescribedObserverPerformance: 200,
  observerPerformance: 200,
  customizedGatewayNote: 50,
  gatewayHasDelegates: 100,
  gatewayHasManyDelegates: 200,
  delegatedStakeToOne: 100,
  delegatedStakeToMany: 100,
  holdsToken: 50,
  protocolLandUser: 300,
  permawebDeployUser: 200,
  permaverseLow: 100,
  permaverseMedium: 200,
  permaverseHigh: 300,
  vouchedUser: 200,
  permaSwapEXPTARIOLP: 250,
  hundredPassedConsecutiveEpochs: 200,
  paragraphUser: 300,
  mirrorUser: 300,
};

export const tokenRequirements: {
  process: string;
  minimum: number;
  ticker: string;
}[] = [
  {
    process: "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA",
    minimum: 1,
    ticker: "tARIO",
  }, // tARIO
  //{
  //  process: "m3PaWzK4PTG9lAaqYQPaPdOcXdO8hYqi5Fe9NWqXd0w",
  //  minimum: 1,
  //  ticker: "AO",
  //}, // AO - DOESNT WORK
  {
    process: "DM3FoZUq_yebASPhgd8pEIRIzDW6muXEhxz5-JwbZwo",
    minimum: 1,
    ticker: "PIXL",
  }, // PIXL
  {
    process: "wOrb8b_V8QixWyXZub48Ki5B6OIDyf_p1ngoonsaRpQ",
    minimum: 1,
    ticker: "TRUNK",
  }, // TRUNK
  {
    process: "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10",
    minimum: 1,
    ticker: "wAR",
  }, // wAR
  {
    process: "NG-0lVX882MG5nhARrSzyprEK6ejonHpdUmaaMPsHE8",
    minimum: 1,
    ticker: "qAR",
  }, // qAR
  {
    process: "rH_-7vT_IgfFWiDsrcTghIhb9aRclz7lXcK7RCOV2h8",
    minimum: 1,
    ticker: "CBC",
  }, // Cyberbeaver CBC
  {
    process: "pazXumQI-HPH7iFGfTC-4_7biSnqz_U67oFAGry5zUY",
    minimum: 1,
    ticker: "LLAMA",
  }, // Llama Land LLAMA
  {
    process: "7zH9dlMNoxprab9loshv3Y7WG45DOny_Vrq9KrXObdQ",
    minimum: 1,
    ticker: "wUSDC",
  }, // wUSDC
  {
    process: "-9lYCEgMbASuQMr76ddhnaT3H996UFjMPc5jOs3kiAk",
    minimum: 1,
    ticker: "wARtARIO",
  }, // wAR-tARIO LP
  {
    process: "SMKH5JnFE7c0MjsURMVRZn7kUerg1yMwcnVbWJJBEDU",
    minimum: 1,
    ticker: "wAREXP",
  }, // wAR-EXP LP
];

// CSV output file paths
export const outputFiles = {
  holdsTokenScores: "holdsTokenScores.csv",
  arNSScores: "arNSScores.csv",
  gatewayScores: "gatewayScores.csv",
  delegateScores: "delegateScores.csv",
  mergedScores: "mergedScores.csv",
  finalScores: "finalScores.csv",
};

export const protocolLandProcessId =
  "yJZ3_Yrc-qYRt1zHmY7YeNvpmQwuqyK3dT0-gxWftew";
