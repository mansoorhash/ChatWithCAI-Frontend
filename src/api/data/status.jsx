import {apiFetch} from '../basefetch'

export async function getStatus({ signal } = {}) {
  const res = await apiFetch('/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    }, 
  );
  return res.json();
}