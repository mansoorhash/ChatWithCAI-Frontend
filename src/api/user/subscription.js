import { apiFetch } from '../basefetch'

export async function fetchSubscription(signal, accessToken, updateAccessToken) {
  try { 
        const res = await apiFetch(
            '/data/subscription',
            { signal },
            accessToken,
            updateAccessToken
        );
        const data = await res.json();
        return data || {};
    } catch (err) {
        // Preserve your old behavior for "unauthorized"
        if (err?.status === 401) return { unauthorized: true };
        throw err;
    }
}
