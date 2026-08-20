import {apiFetch} from '../basefetch'

export async function apiGetJSON(path, { signal } = {}, accessToken, updateAccessToken) {
  const res = await apiFetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    }, 
    accessToken,
    updateAccessToken
  );
  return res.json();
}