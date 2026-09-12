// src/chat/chatLayout.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from './sidebar/layout';
import Chat from './chat/chat';
import './chatLayout.css';
import {v4 as uuidv4} from "uuid";
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSessionsServer } from '../api/chat/sessions';
import { fetchPersonal } from '../api/user/personal'
import { fetchSubscription } from '../api/user/subscription'
import { useUserID } from '../utils/userIdContext';
import { fetchModelTraining } from '../api/user/datacontrol';
import ErrorPopup from "../components/status/errors/error";
import SuccessPopup from "../components/status/success/success"

export default function ChatLayout() {
  const [sessionId, setSessionId] = useState(null); // Active Session
  const [sessions, setSessions] = useState([]); //Session List [{...}]
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [skipPageFetch, setSkipPageFetch] = useState(false);
  const [account, setAccount] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [fetchLastSession, setFetchLastSession] = useState(undefined);
  const [trainingState, setTrainingState] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const { authenticated, loading, updateAccessToken, getAccessToken, handleLogout } = useUserID();
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [collapsed, setCollapsed] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const params = useParams();
  const initialSessionsRequestRef = useRef(null);
  const initialSessionsAppliedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) {
      setAccount(null);
      setSubscription(null);
      setAccountLoaded(false);
      return;
    }

    const ctrl = new AbortController();
    let active = true;
    setAccountLoaded(false);

    (async () => {
      try {
        const acc = await fetchPersonal(
          ctrl.signal,
          getAccessToken(),
          updateAccessToken,
        );
        if (!acc.ok) {
          await handleLogout();
          return;
        }

        const sub = await fetchSubscription(
          ctrl.signal,
          getAccessToken(),
          updateAccessToken,
        );
        if (active) {
          setAccount(acc);
          setSubscription(sub);
          setAccountLoaded(true);
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("Account data load failed:", error);
        }
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [authenticated, getAccessToken, handleLogout, loading, updateAccessToken]);

  // Pulls public/LLMs.json sessions from server and merges into local state
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch('/LLMs.json', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Catalog HTTP ${res.status}`);
        const data = await res.json();
        setCatalog(data);
      } catch (e) {
        console.error('Failed to load catalog:', e);
        setCatalog(null);
      }
    };
    loadCatalog();
  }, []);

  const { allModels, modelLabelsById } = useMemo(() => {
    const models = Object.entries(catalog || {})
      .filter(([tier]) => tier !== "old")
      .flatMap(([, tierModels]) =>
        Array.isArray(tierModels) ? tierModels : []
      );

    const getModelLabel = (model) =>
      typeof model === "string"
        ? model
        : model?.label || model?.name || model?.id;

    const names = models
      .map(getModelLabel)
      .filter(Boolean);

    const labelsById = Object.fromEntries(
      models
        .map((model) => {
          const id =
            typeof model === "string" ? model : model?.id;

          const label = getModelLabel(model);

          return id && label ? [id, label] : null;
        })
        .filter(Boolean)
    );

    return {
      allModels: Array.from(new Set(names)).sort((a, b) =>
        a.localeCompare(b)
      ),
      modelLabelsById: labelsById,
    };
  }, [catalog]);
  
  const catalogDict = useMemo(() => {
    const dict = {};
    if (!catalog) return dict;

    Object.values(catalog).forEach((models = []) => {
      models.forEach((m) => {
        const id = m?.id;
        if (!id) return;
        dict[id] = m?.label ?? id;
      });
    });
    return dict;
  }, [catalog]);

  /**
   * fetchSessionsTracked(cursor)
   * - cursor: DynamoDB LastEvaluatedKey dict or null
   * - returns: { sessions: [], lastKey: dict|null, unauthorized: boolean }
   * - updates fetchLastSession state
   */
  const fetchSessionsTracked = useCallback(async (cursor = null) => {
    const token = getAccessToken()
    const data = await fetchSessionsServer(cursor, token, updateAccessToken);
    if (data?.unauthorized) {
      return { unauthorized: true, sessions: [], lastKey: null };
    }

    const nextKey = data?.lastKey ?? null;
    setFetchLastSession(nextKey);

    return {
      unauthorized: false,
      sessions: data?.sessions || [],
      lastKey: nextKey,
    };
  }, [getAccessToken, updateAccessToken]);

  // Sessions Sync
  useEffect(() => {
    if (loading) return;
    if (!authenticated || !accountLoaded) {
      setSessions([]);
      setFetchLastSession(undefined);
      setSessionLoaded(false);
      initialSessionsRequestRef.current = null;
      initialSessionsAppliedRef.current = false;
      return;
    }

    if (initialSessionsAppliedRef.current) return;

    const ctrl = new AbortController();
    let active = true;
    if (!initialSessionsRequestRef.current) {
      initialSessionsRequestRef.current = fetchSessionsTracked(null);
    }
    const initialRequest = initialSessionsRequestRef.current;

    (async () => {
      try {
        const result = await initialRequest;
        if (!active || result.unauthorized) return;

        setSessions(result.sessions);
        setSessionLoaded(true);
        initialSessionsAppliedRef.current = true;

        if (!result?.sessions.length || subscription?.startedAt < "2026-08-16") {
          const token = getAccessToken();
          const res = await fetchModelTraining(ctrl.signal, token, updateAccessToken);
          if (active) setTrainingState(res.status);
        } else {
          setTrainingState(false);
        }
      } catch (e) {
        if (active && e?.name !== "AbortError") {
          initialSessionsRequestRef.current = null;
          console.error('Initial sync failed:', e);
        }
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [
    accountLoaded,
    authenticated,
    fetchSessionsTracked,
    getAccessToken,
    loading,
    subscription?.startedAt,
    updateAccessToken,
  ]);

  // Route/session selection logic
  useEffect(() => {
    if (!sessionLoaded) return
    const exists = sessions.some((s) => s.id === params.id);

    if (params.id && exists) {
      setSessionId(params.id);
      setNewChat(false)
    } else {
      handleNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, sessionLoaded]);

  const handleNewChat = async () => {
    const existingDraft = sessions.find((s) => s.draft);
    if (existingDraft) {
      setSessionId(existingDraft.id);
      setNewChat(true);
      navigate("/chat", {replace:true});
      return existingDraft
    }
    const newId = uuidv4();
    const newSession = { id: newId, title: 'New Chat', lastUpdate: null, draft: true};
    setSessions((prev) => [newSession, ...prev]);
    setSessionId(newId);
    setNewChat(true);
    navigate("/chat", {replace:true});
    return newSession
  };

  const handlePromoteSession = async (draftSession) => {
    if (!draftSession?.id) return null;

    const promotedSession = {
      ...draftSession,
      title: "Untitled",
      lastUpdated: new Date().toISOString(),
      draft: false,
    };

    setSessions((prev) =>
      prev.map((storedSession) =>
        storedSession.id === promotedSession.id
          ? { ...storedSession, ...promotedSession }
          : storedSession
      )
    );
    setSessionId(promotedSession.id);
    setNewChat(false);
    navigate(`/chat/${promotedSession.id}`, { replace: true });
    return promotedSession;
  };

  const currentSession = useMemo(() => {
    if (!sessionId) return null;
    return sessions.find((s) => s.id === sessionId) || null;
  }, [sessions, sessionId]);

  const handleSelectChat = (selectedSessionId) => {
    if (!selectedSessionId) return;
    navigate(`/chat/${selectedSessionId}`, { replace: true });
  };

  return (
    <div className="chatlayout-container">
      <SuccessPopup
        open={!!successMessage}
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
      />
      <ErrorPopup
        open={!!errorMessage}
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />


      <Sidebar
        setErrorMessage={setErrorMessage}
        sessions={sessions}
        setSessions={setSessions}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentId={sessionId || null}
        account={account}
        setAccount={setAccount}
        subscription={subscription}
        authenticated={authenticated}
        fetchSessions={fetchSessionsTracked}
        fetchLastSession={fetchLastSession}
        catalog={catalog}
        allModels={allModels}
        modelLabelsById={modelLabelsById}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        trainingState={trainingState}
        setTrainingState={setTrainingState}
      />

      <Chat
        setSuccessMessage={setSuccessMessage}
        setErrorMessage={setErrorMessage}
        session={currentSession}
        setSessions={setSessions}
        skipPageFetch={skipPageFetch}
        setSkipPageFetch={setSkipPageFetch}
        newChat={newChat}
        sessionId={sessionId}
        catalogDict={catalogDict}
        trainingState={trainingState}
        setTrainingState={setTrainingState}
        modelLabelsById={modelLabelsById}
        chatReady={accountLoaded && sessionLoaded}
        onNewChat={handleNewChat}
        onPromoteSession={handlePromoteSession}
      />
    </div>
  );
}
