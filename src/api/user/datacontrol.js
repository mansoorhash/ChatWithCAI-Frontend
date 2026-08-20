import { apiFetch } from '../basefetch'

export async function fetchModelTraining(signal, accessToken, updateAccessToken) {
    const res = await apiFetch(
        '/data/controls/training',
        {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal,
        },
        accessToken,
        updateAccessToken
    );
    return res.json();
}

export async function updateModelTraining(signal, accessToken, updateAccessToken, payload) {
    const res = await apiFetch(
        '/data/controls/training',
        {
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
