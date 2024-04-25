import { devKey } from "./apikeys";

const zealy = "https://api-v2.zealy.io/public/communities/";

// const zealyProd = zealy + 'ar-io'
// const zealyTest = zealy + 'theawesomecommunity'
const zealyDev = zealy + "theblackfox";
export async function getLeaderboard() {
  const response = await fetch(`${zealyDev}/leaderboard`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  return await response.json();
}

export async function getUserInfo(zealyUserId: string) {
  const response = await fetch(`${zealyDev}/users/${zealyUserId}`, {
    method: "GET",
    headers: { "x-api-key": devKey },
  });
  return await response.json();
}
