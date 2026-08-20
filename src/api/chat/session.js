import { apiFetch } from "../basefetch";

export async function fetchSessionServer(id, startKey, accessToken, updateAccessToken) {
  const qs =
    startKey != null
      ? `?limit=10&startKey=${encodeURIComponent(JSON.stringify(startKey))}`
      : `?limit=10`;

  try {
    const res = await apiFetch(
      `/sessions/${encodeURIComponent(id)}${qs}`,
      { method: 'GET' },
      accessToken,
      updateAccessToken
    );
    const data = await res.json();
    return data || [];
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}

export async function fetchBranchServer(id, branch, role, accessToken, updateAccessToken) {
  try {
    const res = await apiFetch(
      `/sessions/branch/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}&role=${encodeURIComponent(role)}`,
      { method: 'GET' }, 
      accessToken,
      updateAccessToken
    );

    const data = await res.json();
    return data || [];
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}

export async function deleteSessionServer(id, accessToken, updateAccessToken) {
  const res = await apiFetch(`/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    },
    accessToken,
    updateAccessToken
  );

  return res.json();
}

export async function editSessionServer(id, title, accessToken, updateAccessToken) {
  const res = await apiFetch(`/sessions/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          title,
        }),
    },
    accessToken,
    updateAccessToken
  );

  return res.json();
}