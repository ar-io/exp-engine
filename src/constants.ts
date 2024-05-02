export const keyfile = process.env.WALLET_FILE_PATH || "key.json";

export const MIN_FAUCET_XP = 1000; // The minimum amount of XP a Zealy user must have to qualify for tIO faucet

// HISTORICAL ARNS REWARDS
export const HISTORICAL_BASIC_NAME_REWARD = 200;
export const HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD = 200;
export const HISTORICAL_OG_NAME_REWARD = 200;
export const HISTORICAL_ROOT_DATA_POINTER_SET_REWARD = 200;
export const HISTORICAL_BASIC_UNDERNAME_REWARD = 200;
export const HISTORICAL_MANY_UNDERNAMES_REWARD = 200;
export const HISTORICAL_CONTROLLER_REWARD = 200;

// HISTORICAL GATEWAY REWARDS
export const HISTORICAL_JOINED_GATEWAY_REWARD = 200;

export const BASIC_NAME_REWARD = 100;
export const BASIC_UNDERNAME_REWARD = 100;
export const ROOT_DATA_POINTER_SET_REWARD = 100;
export const UNDERNAME_DATA_POINTER_SET_REWARD = 100;
export const DEFAULT_ARNS_DATA_POINTER =
  "UyC5P5qKPZaltMmmZAWdakhlDXsBF6qmyrbWYFchRTk";
export const ZEALY_START_TIMESTAMP = 1711954647;

// ZEALY
export const ZEALY_URL = "https://api-v2.zealy.io/public/communities/";
export const FAUCET_QUANTITY = 1000;

// export const ZEALY_PROD_COMMUNITY = zealy + 'ar-io'
// export const ZEALY_TEST_COMMUNITY = zealy + 'theawesomecommunity'
export const ZEALY_DEV_COMMUNITY = ZEALY_URL + "theblackfox";

// AR.IO NETWORK
export const GATEWAY_URL = "https://arweave.net/";
export const CACHE_URL = "https://api.arns.app/v1/contract";
export const CONTRACT_ID = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";
