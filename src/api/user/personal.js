import { apiFetch } from '../basefetch';

export async function fetchPersonal(signal, accessToken, updateAccessToken) {
    try {
        const res = await apiFetch(
            `/data/personal`,
            { 
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal,
            },
            accessToken,
            updateAccessToken
        );
        return res.json();
    } catch (err) {
        console.error('Failed Account Retrieval', err);
        return {ok: false};
    }
}

export async function updatePersonal(signal, payload, accessToken, updateAccessToken) {
    const res = await apiFetch('/data/personal', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload ?? {}),
            signal,
        }, 
        accessToken,
        updateAccessToken
    );
    return res.json();
}

export async function verifyPersonalEmail(signal, payload, accessToken, updateAccessToken) {
    const res = await apiFetch('/data/personal/email/verify', {
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

export async function deletePersonal(signal, accessToken, updateAccessToken) {
    try {
        const res = await apiFetch(
            `/data/personal`,
            { method: 'DELETE' },
            accessToken,
            updateAccessToken
        );
    console.log("delete Test: ", res.ok)
    return res;
    } catch (err) {
    console.error('Failed Account Deletion:', err);
    return {ok: false};
    }
}