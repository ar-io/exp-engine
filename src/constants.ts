export const keyfile = process.env.WALLET_FILE_PATH || "key.json";
export const MINT_DELAY = 50; // 100 ms delay for minting
export const testExpProcessId = "G3vHz_3XOUAzzVciJCnDf0NLRjbL6bjwRT5mAclrLrk"; // testnet
export const expProcessId = "aYrCboXVSl1AXL9gPFe3tfRxRf0ZmkOXH65mKT0HHZw"; // mainnet
export const honeyPotQuestId = "5cdb7119-5407-460c-baa6-c37f225147ea";
// ECOSYSTEM REWARDS
export const HISTORICAL_TEST_TOKEN_HOLDER_REWARD = 50;
export const HISTORICAL_U_REWARD = 50;
export const HISTORICAL_EVENT_ATTENDEE_REWARD = 200;

// ARWEAVE REWARDS
export const HISTORICAL_MAX_ARWEAVE_UPLOAD_REWARD = 400;
export const HISTORICAL_LARGE_ARWEAVE_UPLOAD_REWARD = 200;
export const HISTORICAL_MEDIUM_ARWEAVE_UPLOAD_REWARD = 100;
export const HISTORICAL_SMALL_ARWEAVE_UPLOAD_REWARD = 50;
export const HISTORICAL_MANIFEST_UPLOAD_REWARD = 100;

// ARDRIVE REWARDS
export const HISTORICAL_ARDRIVE_TOKEN_REWARD = 200;
export const HISTORICAL_TURBO_TOP_UP_REWARD = 100;
export const HISTORICAL_TURBO_1GB_REWARD = 100;
export const HISTORICAL_MAX_ARDRIVE_UPLOAD_REWARD = 400;
export const HISTORICAL_LARGE_ARDRIVE_UPLOAD_REWARD = 200;
export const HISTORICAL_MEDIUM_ARDRIVE_UPLOAD_REWARD = 100;
export const HISTORICAL_SMALL_ARDRIVE_UPLOAD_REWARD = 50;

// HISTORICAL ARNS REWARDS
export const HISTORICAL_BASIC_NAME_REWARD = 200;
export const HISTORICAL_UNDERNAME_DATA_POINTER_SET_REWARD = 100;
export const HISTORICAL_OG_NAME_REWARD = 500;
export const HISTORICAL_ROOT_DATA_POINTER_SET_REWARD = 200;
export const HISTORICAL_MULTIPLE_UNDERNAME_REWARD = 100;
export const HISTORICAL_CONTROLLER_REWARD = 100;

// HISTORICAL GATEWAY REWARDS
export const HISTORICAL_JOINED_GATEWAY_REWARD = 200;
export const HISTORICAL_GOOD_GATEWAY_REWARD = 500;
export const HISTORICAL_GOOD_OBSERVER_REWARD = 500;
export const HISTORICAL_MANY_DELEGATES_REWARD = 200;
export const HISTORICAL_BASIC_DELEGATES_REWARD = 100;
export const HISTORICAL_CUSTOM_GATEWAY_NOTE_REWARD = 100;
export const HISTORICAL_OG_GATEWAY_REWARD = 400;
export const HISTORICAL_OG_OBSERVER_REWARD = 300;

// HISTORICAL DELEGATED STAKER REWARDS
export const HISTORICAL_BASIC_STAKED_GATEWAYS_REWARD = 100;
export const HISTORICAL_MANY_STAKED_GATEWAYS_REWARD = 100;

// ZEALY AIRDROP REWARDS
export const BASIC_NAME_REWARD = 100;
export const BASIC_UNDERNAME_REWARD = 100;
export const ROOT_DATA_POINTER_SET_REWARD = 100;
export const UNDERNAME_DATA_POINTER_SET_REWARD = 100;
export const DEFAULT_ARNS_DATA_POINTER =
  "UyC5P5qKPZaltMmmZAWdakhlDXsBF6qmyrbWYFchRTk";
export const ZEALY_START_TIMESTAMP = 1711954647;

// ZEALY
export const ZEALY_URL = "https://api-v2.zealy.io/public/communities/";
export const FAUCET_QUANTITY = 1250;
export const ZEALY_PROD_URL = ZEALY_URL + "ar-io";
export const ZEALY_TEST_URL = ZEALY_URL + "theawesomecommunity";
export const ZEALY_DEV_URL = ZEALY_URL + "theblackfox";
export const MIN_FAUCET_XP = 100; // The minimum amount of XP a Zealy user must have to qualify for tIO faucet

// AR.IO NETWORK
export const GATEWAY_URL = "https://arweave.net/";
export const CACHE_URL = "https://api.arns.app/v1/contract";
export const CONTRACT_ID = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";
