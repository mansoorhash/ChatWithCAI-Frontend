import { apiFetch } from '../basefetch'

export async function fetchYearUsage(year, accessToken, updateAccessToken) {
  try {
    const res = await apiFetch(
      `/data/usage/${encodeURIComponent(year)}`,
      { method: 'GET' },
      accessToken,
      updateAccessToken
    );
    return res.json();
  } catch (err) {
    console.error('fetchYearUsage error:', err);
    return { id: year, months: [] };
  }
}