import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { retreiveAccessToken } from '../api/basefetch/refresh'
import { API_BASE } from '../config'
import { USAGE_KEY, LOCKED_KEY, ENABLED_KEY, CHAT_TOTALCOUNT, CHAT_EXPIRATION } from "./constants";

const Ctx = createContext({
  authenticated: false,
  userID: null,
  accessToken: null,
  loading: true,
  error: null,
  checkStatus: async () => {},
  refresh: async () => {},
  handleLogout: async () => {},
  getAccessToken: () => {},
  updateAccessToken: () => {}
});

export function UserIdProvider({ children }) {
  const [authenticated, setAuthed] = useState(false);
  const [userID, setUserID] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState(null);
  const accessTokenRef = useRef(null);

  const reqIdRef = useRef(0);

  const doWhoAmI = async (signal) => {
    const res = await fetch(`${API_BASE}/whoami`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(`/whoami ${res.status}`);
    return res.json();
  };

  const checkStatus = async () => {
    const logged = localStorage.getItem("user_state") === "true";

    if (!logged) {
      setAuthed(false);
      setUserID(null);
      updateAccessToken(null);
      setLoading(false);
      return;
    }

    await refresh();
  };

  const refresh = async () => {
    
    setLoading(true);
    setErr(null);
    const myReq = ++reqIdRef.current;
    const ac = new AbortController();
    let userState = false;
    try {
      const whoamiData = await doWhoAmI(ac.signal);
      if (myReq !== reqIdRef.current) return;
      setAuthed(whoamiData?.authenticated);
      setUserID(whoamiData?.userID || null);
      if (whoamiData?.authenticated) {
        userState = true;
        await handleTokenRefresh();
      }
      
    } catch (e) {
      if (myReq !== reqIdRef.current) return;
      setAuthed(false);
      setUserID(null);
      setErr(e?.message || String(e));
    } finally {
      localStorage.setItem('user_state', userState)
      if (myReq === reqIdRef.current) setLoading(false);
    }
  };

  const updateAccessToken = useCallback((token) => {
    const nextToken = token || null;

    accessTokenRef.current = nextToken;
    setAccessToken(nextToken);
  }, []);

  const getAccessToken = useCallback(() => {
    return accessTokenRef.current;
  }, []);

  const clearStorage = useCallback(() => {
    sessionStorage.removeItem(USAGE_KEY);
    sessionStorage.removeItem(LOCKED_KEY);
    sessionStorage.removeItem(ENABLED_KEY);

    localStorage.removeItem(CHAT_TOTALCOUNT);
    localStorage.removeItem(CHAT_EXPIRATION);
  }, []);

  const handleTokenRefresh = useCallback(async () => {
    try {
      const data = await retreiveAccessToken();
      if (data.accessToken) {
        updateAccessToken(data.accessToken);
      }
    } catch (err) {
      console.error("Token refresh failed in context:", err);
    }
  }, [updateAccessToken]);

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogout = useCallback(async ({ delete: deleteSession = false } = {}) => {
    if (!deleteSession) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Failed to delete server session:', error);
      }
    }

    setAuthed(false);
    setUserID(null);
    updateAccessToken(null);
    setErr(null);
    clearStorage();
    localStorage.setItem('user_state', 'false');
  }, [clearStorage, updateAccessToken]);

  return (
    <Ctx.Provider
      value={{
        authenticated,
        userID,
        accessToken,
        loading,
        error,
        checkStatus,
        refresh,
        handleLogout,
        getAccessToken,
        updateAccessToken,
      }}
    >  
    {children}
    </Ctx.Provider>
  );
}

export function useUserID() {
  return useContext(Ctx);
}
