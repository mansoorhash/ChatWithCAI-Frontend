import { API_BASE } from "../config"
import { retreiveAccessToken } from "./basefetch/refresh"

let refreshPromise = null

export async function apiFetch(
  path, 
  options={}, 
  accessToken=null, 
  updateAccessToken=null,
){
  const bearer = Boolean(accessToken);
  const retry = Boolean(updateAccessToken);

  const res = await fetch(`${API_BASE}${path}`,{
    credentials: 'include',
    ...options,
    headers: {
      ...options?.headers,
      ...(bearer
        ? { Authorization: `Bearer ${accessToken}` } 
        : {}
      )
    }
  });

  if (res.ok) return res;
  const body = await res.json();

  if (res.status === 401 && body?.detail?.code === 'REQUIRES_LOGIN') {
    const err = new Error('Reauthentication required');
    err.code = 'REQUIRES_LOGIN';
    err.status = 401;
    err.body = body;
    window.location.href("/");
    throw err;
  }
  const tokenCanBeRefreshed =
    body?.detail?.code === 'EXPIRED_TOKEN' ||
    body?.detail?.code === 'INVALID_TOKEN';

  if (res.status === 401 && tokenCanBeRefreshed && retry) {
    try {

      if (!refreshPromise) {
        refreshPromise = retreiveAccessToken(new AbortController().signal)
      }
      
      const refreshData = await refreshPromise;
      if (refreshData?.accessToken) {
          
          const token = refreshData.accessToken
          updateAccessToken(token);

          const newRes = await apiFetch(
            path,
            options, 
            token,
            null,
          );
          return newRes;
      }
    } finally {
      refreshPromise = null
    }

    const err = new Error('Reauthentication required');
    err.code = 'REQUIRES_LOGIN';
    err.status = 401;
    err.body = body;
    window.location.href("/");
    throw err;
  }

  const msg = body?.error || `${options.method || 'GET'} ${path} failed (${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  err.body = body;
  throw err;
}
