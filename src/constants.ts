export const expAirdropKeyfile =
  process.env.EXP_AIRDROP_WALLET_FILE_PATH || "exp-key.json";
export const tIOfaucetKeyfile =
  process.env.TIO_FAUCET_WALLET_FILE_PATH || "tio-key.json";
export const MINT_DELAY = 50; // 100 ms delay for minting
export const testExpProcessId = "mbGcJfiMXhHAX2-TBYGjonztCdGY1GEuQ66Wt3AINZI"; // testnet
export const expProcessId = "aYrCboXVSl1AXL9gPFe3tfRxRf0ZmkOXH65mKT0HHZw"; // mainnet
export const testnetProcessId = "agYcCFJtrMG6cqMuZfskIkFTGvUPddICmtQSBIoPdiA";
export const AO_CU_URL = "https://cu.ar-io.dev";
export const honeyPotQuestId = "5cdb7119-5407-460c-baa6-c37f225147ea";
export const faucetQuestId = "3e77d5ef-f34d-4d4d-963d-4569a1a28511"; //
// export const faucetQuestId = "39c0c984-e325-40d6-bec6-7e3a6646fd92"; testnet
// export const ardriveUploadQuestId = "395b24b1-05ad-429b-9b86-4c69fea8a50f"; // devnet
export const ardriveUploadQuestId = "f2c619de-f24c-4005-866f-204158f2e323"; // mainnet
// export const arnsNameQuestId = "fd9b7af0-33ff-4e22-9c1b-a5b30098a9b6"; // devnet
export const arnsNameQuestId = "9fd3daa7-434f-4579-8178-cd88e6cb3d17"; // mainnet
export const delegatedStakeQuestId = "a83630bb-d6a4-4c89-bbe6-611945b0960e"; // mainnet
export const bazarQuestId = "055b6f9f-448b-4259-aac1-8d1ecf96d4b9"; //mainnet
export const undernameQuestId = "93e82e42-2d97-4a79-a9d6-e4c812fe2bdb"; //mainnet
export const arDriveArNSQuestId = "117d5915-f7a3-45db-8b68-168b7d627323"; //mainnet

// ECOSYSTEM REWARDS
export const HISTORICAL_TEST_TOKEN_HOLDER_REWARD = 50;
export const HISTORICAL_U_REWARD = 50;
export const HISTORICAL_EVENT_ATTENDEE_REWARD = 200;

// ARWEAVE REWARDS
export const HISTORICAL_MAX_ARWEAVE_UPLOAD_REWARD = 400;
export const HISTORICAL_LARGE_ARWEAVE_UPLOAD_REWARD = 200;
export const HISTORICAL_MEDIUM_ARWEAVE_UPLOAD_REWARD = 100;
export const HISTORICAL_SMALL_ARWEAVE_UPLOAD_REWARD = 50;
export const HISTORICAL_MANIFEST_UPLOAD_REWARD = 300;

// ARDRIVE REWARDS
export const HISTORICAL_ARDRIVE_TOKEN_REWARD = 200;
export const HISTORICAL_TURBO_TOP_UP_REWARD = 100;
export const HISTORICAL_TURBO_1GB_REWARD = 200;
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
export const HISTORICAL_GNAT_REWARD = 500;

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
export const ZEALY_START_TIMESTAMP = 1715779982;

// ZEALY
export const ZEALY_URL = "https://api-v2.zealy.io/public/communities/";
export const FAUCET_MTIO_QUANTITY = 600_000_000;
export const ZEALY_PROD_URL = ZEALY_URL + "ar-io";
export const ZEALY_TEST_URL = ZEALY_URL + "theawesomecommunity";
export const ZEALY_DEV_URL = ZEALY_URL + "theblackfox";
export const MIN_XP_TO_QUALIFY = 500; // The minimum amount of XP a Zealy user must have to qualify for EXP airdrop
export const MIN_FAUCET_XP = 5000; // The minimum amount of XP a Zealy user must have to qualify for tIO faucet
export const EXP_DENOMINATION = 1000000; // Matching a denomination of 6
export const PERMAWEB_MODULE_ARDRIVE_START_TIME = 1721793600; // 7/24/2024
export const PERMAWEB_MODULE_ARNS_START_TIME =
  PERMAWEB_MODULE_ARDRIVE_START_TIME * 1000;

// AR.IO NETWORK
export const GATEWAY_URL = "https://arweave.net/";
export const CACHE_URL = "https://api.arns.app/v1/contract";
export const CONTRACT_ID = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U";
export const GNAT_PARTICIPANTS = [
  "kaYP9bJtpqON8Kyy3RbqnqdtDBDUsPTQTNUCvZtKiFI",
  "MOUmMfpXf8IN4CjiJBcwc3vh-qQS1KXHZnXSXI66JWA",
  "36Ar8VmyC7YS7JGaep9ca2ANjLABETTpxSeA7WOV45Y",
  "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI",
  "fmTpIBFrCbAyUjV-f3VOq7Szs5RaMovb1Pf9MlUnjVk",
  "KHhMxxTURSr12EK5kOlvkBSWo7WPVAG5yBxMcv8_cE8",
];

export const EXEMPT_WALLETS = [
  "JNC6vBhjHY1EPwV3pEeNmrsgFMxH5d38_LHsZ7jful8",
  "8jNb-iG3a3XByFuZnZ_MWMQSZE0zvxPMaMMBNMYegY4",
  "y_UFvsDimTiE_4EGDVWezqYB-NC4OUCKAwdKWshkAZE",
  "QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ",
  "76NV2iMtr5pZg5THMAvx2OG6L1MfkoBceG_eZg1pDAM",
  "q6zIf3KQRMCW9fytR0YlKG4oqw6Cox4r_bk7mq6JZBM",
  "mlZMPE6VhJXuwvLelbnDdgTphn3jyO1KNnc68mWjMtc",
  "PGVJoj-eNKUncwSHgDzcqdBSLKcSFpJH7RrfOR8ZFGE",
  "ceN9pWPt4IdPWj6ujt_CCuOOHGLpKu0MMrpu9a0fJNM",
  "Kaajvkd2G--bS4qzKKECP1b2meEotzLwTPSoprSaQ_E",
  "KsUYFIGvpX9MCbhHvsHbPAnxLIMYpzifqNFtFSuuIHA",
  "7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk",
  "PcyrarMHubWJx5IP-jSWqsg_cNlVtjQW6_Rkf-5dwlc",
  "31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8",
  "Dq5qeSwbm4JqcXeE9SWqikz7i9tDC-ZZDidzlvLlObk",
  "rweM0QUKbLVHADi2jyAvtOYgQv7lhp61NtX2ftXpANY",
  "9jfM0uzGNc9Mkhjo1ixGoqM7ygSem9wx_EokiVgi0Bs",
  "nszYSUJvtlFXssccPaQWZaVpkXgJHcVM7XhcP5NEt7w",
  "sVF0HfFYd3dEmmmGsY_cNp5HJpSUj694-KUAaV0tefk",
  "bx8H-Ga4ZSntfZvGncU5dFQB-peF8JjddMPCYzLJ5LY",
  "ljqjL2uA_WOYkwHxH-foEQDKrC87VbDExfkJd7OIBEU",
  "iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA",
  "utfXmEX9YWo_8N498NJ9GNt_aCjOT7UF1ciyRvOwI48",
  "VQqj24--M8fONTUbAjtdxU3qmiEkpSVr5sPZEyi6tPM",
  "9ODOd-_ZT9oWoRMVmmD4G5f9Z6MjvYxO3Nen-T5OXvU",
  "e3a1dzQ1DlGBHa7hjOzTtODLLHwwRsbq0evWvJMqkkc",
  "sq1uUehnQ5abHMrw5qiHM7QbV79YAKreDK26S2uO0pg",
  "APu-o6jP4A-guGvE1UVUIYGfP1d366e07iWv4ftYhNo",
  "vE3dU4pkwwoDqB2f75TZD4bGWmpMwfzGC-rngbj9VDk",
  "mkKwVztgnnFwEiWu7hJR6JWESvG6FGb2EIbSxumRhFg",
  "4k7sv7XlPiyrHFCdvrydSsSCpCUv5Xs-qEkGaCyncq4",
  "RKCwFrXLKtXkAgGSJ_LFzYr11p83-BhKPkDQImUm9nc",
  "SXfYvANs_i6vp4yVuUwQbcm307BBqkG3GtzrTAAe9_I",
  "ik-YbBB4YxPEwW6ovwH_tSeKr1JadSCBfWIY_Np7zkc",
  "oubU0XOj_F2R0CBDD9yx4A7rVnKGGAB7PuK452No6gQ",
  "y24bTUwltrZWNOlb_wPscDnMxVJCzwPAnt9DLJzvi0c",
  "2aVFVtMd9S2o2GSuPmzk26kerr3MCCObJzBNWNdKIsE",
  "T1dWEHiRAwmdDUHhtdymrU0KswAc32DCARk0rHvLpB4",
  "y24bTUwltrZWNOlb_wPscDnMxVJCzwPAnt9DLJzvi0c",
  "rweM0QUKbLVHADi2jyAvtOYgQv7lhp61NtX2ftXpANY",
  "jOGbK8budM3cjvvPnpU4znU3Wjp3r0ILYAGrIY-hOk4",
  "vkKYFho6LcqAtJHpdgI45hrwED9gvHyv2D91LX2CpS8",
  "GtDQcrr2QRdoZ-lKto_S_SpzEwiZiHVaj3x4jAgRh4o",
  "jaxl_dxqJ00gEgQazGASFXVRvO4h-Q0_vnaLtuOUoWU",
  "Y8MBtxcZVYgkMORzOfUqIO-Z7fgpukdAJzDth3COk4E",
  "mkKwVztgnnFwEiWu7hJR6JWESvG6FGb2EIbSxumRhFg",
  "1KzC-BAGgAttTwjSiktuCwWRjKQzfPqIrzhw2GNZ7Yw",
  "uNgAE6KDNFNQkopjxZTbkfeKcxltJkyXMeNdE5tlVNo",
  "J40R1BgFSI1_7p25QW49T7P46BePJJnlDrsFGY1YWbM",
  "PPPTGngwdgtmV3kuzYSUCJSBAivt3fO5Zhk6fQfB29Y",
  "91qYihryBAzlnftrXNw4vZ7DxSSpdChfwq0Hxl71DoU",
  "6BdimRn5VG1wNrWXuMo9JUTKgDXUUtJi1vtcm5Tck64",
  "g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0",
  "NPR5pScDyGD0G9hhrhEmCcFItN-0OpPqcXZRWm-MQFo",
  "y_UFvsDimTiE_4EGDVWezqYB-NC4OUCKAwdKWshkAZE",
  "I7U0HYZIJnYgCVAvFyjh2bk6A_BkpsUIswV1vpqHSF0",
  "V0UNn5oBCtFSr59kaR5-6wRal5Xm6IGNZK-babpyDLU",
  "2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg",
  "FAxDUPlFfJrLDl6BvUlPw3EJOEEeg6WQbhiWidU7ueY",
  "cYGJt4EhmR4GAGBv2UStrkYO4zzlW_W9ZZ9Up8F2zj0",
  "vn6Z31Dy8rV8Ion7MTcPjwhLcEJnAIObHIGDHP8oGDI",
  "Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4",
  "pzH5LB20NhsrPMmvZzTrW-ahbAbIE-TeRzWBVYdArpA",
  "K9dz-eVFGK-Wk7qX5fZT9Ntl9QQaTJ2ehCTGCJ-T0YQ",
  "-OtTqVqAGqTBzhviZptnUTys7rWenNrnQcjGtvDBDdo",
  "Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4",
  "G32jEVROIfAIarMA-D9yo5N1ISymafvRaTJiBvFNsdM",
  "zQM416fEk0j0htoETjsrgc3c9T2vwkbiEU5FADNHGwY",
  "-XFIRpip8W2AzO5tjgwHEAK80oBdsLXyDXCin0tDjqc",
  "EUbaTqbkBSp6l-FoyrVZo3S9T_QiAisxjk5qfn62x2s",
  "eZx2LB65fCZWBvp45N81lgoc1FYk47Z6ZgKfBwbzaqY",
  "xmxpYiyMHggMIVRgwq89bq2RxrxqSBqvNEG_mbvxVSo",
  "-F-AA9wLpQjVKwajfRXfZAquxJoeLoeUWPhua8iq4aU",
  "AzRNtshNsvOVvMRn4Y0fZe6kJk-n-MhDNnfHVF15fI8",
  "FGjcSvXTvF1McJoOZ7e72wB-nKiYGAOgZoRyW0FK4UM",
  "ePMgom7YSAiTS1cTZPjW-qxFwUgyPKGPWyP4TxaT-XU",
  "yVsGFBrc_IaRcELZJKnEF5ZO_Dj-BvmxqQwaL5zcxYE",
  "HVr4uqyYMRcxrKCheZ7v2eYWJutelBF1x9WwFY6kHWo",
];
