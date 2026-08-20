import { apiFetch } from "../basefetch";

export async function fetchSessionsServer(startKey, accessToken, updateAccessToken) {
  const qs = startKey
    ? `?limit=25&startKey=${encodeURIComponent(JSON.stringify(startKey))}`
    : `?limit=25`;

  try {
    const res = await apiFetch(
      `/sessions/list${qs}`,
      { method: 'GET' },
      accessToken,
      updateAccessToken);
    const data = await res.json();
    return data || {};
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}