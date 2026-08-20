import { apiFetch } from "../basefetch";

export async function apiPostJSON(path, payload, { signal } = {}, accessToken, updateAccessToken) {
  const res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload ?? {}),
      signal,
    }, 
    accessToken,
    updateAccessToken
  );
  return res.json();
}
