import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ChatHeader from './chatHeader';
import { useNavigate } from 'react-router-dom';
import { fetchSessionServer } from '../../api/chat/session';
import SpinnerRounded from '../../components/loading';
import Messages from './messages/messages';
import {v4 as uuidv4} from "uuid";
import {
  Send,
  Square,
} from 'lucide-react';
import './chat.css';
import { useUserID } from '../../utils/userIdContext';
import {
  continueChatMessageServer,
  sendChatTurnServer,
} from '../../api/chat/message';
import ChatModelTraining from './components/modelTraining';
import { CHAT_TOTALCOUNT, CHAT_EXPIRATION } from '../../utils/constants';


function coerceTurns(data) {
  // Backend: { last_key: null, messages: [ { turnSeq, user: {...}, ai: {...} }, ... ] }
  const arr = Array.isArray(data?.messages) ? data.messages : [];
  if (!arr.length) return [];

  return arr
    .sort((a, b) => (a.turnSeq ?? 0) - (b.turnSeq ?? 0))  
    .map((t) => ({
    turnSeq: t.turnSeq ?? 0,
    user: t?.user ?? null,
    ai: t?.ai ?? null,
  }));
}

export default function Chat({
  setSuccessMessage,
  setErrorMessage,
  session, 
  setSessions,
  skipPageFetch,
  setSkipPageFetch,
  newChat,
  sessionId, 
  catalogDict,
  trainingState,
  setTrainingState,
  modelLabelsById
}) {
  const { accessToken, updateAccessToken } = useUserID();
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const showTrainingChoice = trainingState === null;

  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageProcessing, setMessageProcessing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatTotalCount, setTotalCount] = useState(() => {
    const storedCount = localStorage.getItem(CHAT_TOTALCOUNT);
    return storedCount !== null ? Number(storedCount) || 0 : 0;
  });

  const [chatExpiration, setChatExpiration] = useState(
    () => localStorage.getItem(CHAT_EXPIRATION)
  );
  const initialScrollRef = useRef(false);

  // Now this is turns (backend-native)
  const [turns, setTurns] = useState([]);
  const turnsRef = useRef(turns);
  const hasTurns = turns.length > 0;

  // Message States
  const [editedTurn, setEditedTurn] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);
  const activeText = editedTurn !== null ? editValue : input;

  // Pagination cursor (LastEvaluatedKey)
  const cursorRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);
  const cooldownRef = useRef(false);
  const wasGeneratingRef = useRef(false);
  const messageAbortRef = useRef(null);
  const messageReaderRef = useRef(null);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Fetch turns when session changes
  useEffect(() => {
    setChatLoading(true);
    setInput('')

    // reset pagination on session change
    cursorRef.current = null;
    hasLoadedOnceRef.current = false;
    initialScrollRef.current = false;
    
    // reset edit states
    setEditedTurn(null);
    setEditValue('');
    if (!session) {
      setTurns([]);
      setChatLoading(false);
      return;
    }
    if (skipPageFetch) {
      setChatLoading(false);
      setSkipPageFetch(false);
      return
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchPage();
        if (cancelled) return;

        if (data?.unauthorized) {
          setTurns([]);
          return;
        }

        const t = coerceTurns(data);
        
        setTurns(t);
        cursorRef.current = data?.lastKey ?? null;
        hasLoadedOnceRef.current = true;
        if (!t.length) {
          setTurns([]);
          navigate(`/chat`, { replace: true });
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching session data:', err);
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.id]);

  // Scroll management
  useLayoutEffect(() => {
    const wasGenerating = wasGeneratingRef.current;
    wasGeneratingRef.current = messageLoading;

    if (chatLoading || loadingMore || turns.length === 0) return;

    const shouldScroll =
      !initialScrollRef.current ||
      messageLoading ||
      wasGenerating;

    if (!shouldScroll) return;

    initialScrollRef.current = true;

    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [turns, messageLoading, chatLoading, loadingMore]);

  // Editing
  useEffect(() => {
    if (editedTurn !== null && turns[editedTurn]) {
      setEditValue(turns[editedTurn].user.message);
    }
  }, [editedTurn, turns]);

  useEffect(() => {
    if (editedTurn === null) return;

    const onDown = (e) => {
      const bar = document.querySelector(".chat-input-bar");
      if (bar && bar.contains(e.target)) return;

      setEditedTurn(null);
      setEditValue('');
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editedTurn]);

  useEffect(() => {
    if (editedTurn !== null && editInputRef.current) {
      requestAnimationFrame(() => {
        const el = editInputRef.current;
        el.focus();
        const n = el.value.length;
        el.setSelectionRange(n, n);
      });
    }
  }, [editedTurn]);

  useEffect(() => {
    const el = editInputRef.current;
    if (!el) return;

    const max = parseInt(getComputedStyle(el).maxHeight, 10) || 240;

    el.style.height = "auto";

    const text = (editedTurn !== null ? editValue : input);
    if (!text) {
      el.style.overflowY = "hidden";
      return;
    }

    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [input, editValue, editedTurn, session?.id]);

  // Fetch page helper
  const fetchPage = async (cursor) => {
    // Must support optional cursor:
    // fetchSessionServer(sessionId, cursor) -> { messages: [...], lastKey }
    if (newChat || session.draft) return
    return await fetchSessionServer(session.id, cursor, accessToken, updateAccessToken);
  };

  // Load older turns on scroll-top
  const loadOlderTurns = async () => {
    if (loadingMore) return;
    if (!session) return;
    if (hasLoadedOnceRef.current && cursorRef.current == null) return;

    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => (cooldownRef.current = false), 600);

    const el = scrollRef.current;
    if (!el) return;

    setLoadingMore(true);

    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    try {
      const data = await fetchPage(cursorRef.current)
      if (data?.unauthorized) return;

      const incoming = coerceTurns(data);
      cursorRef.current = data?.lastKey ?? null;
      hasLoadedOnceRef.current = true;

      if (!incoming.length) return;

      setTurns(prev => [...incoming, ...prev]);

      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        const delta = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + delta;
      });
    } catch (e) {
      console.error('loadOlderTurns failed:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll handler
  const onScrollChat = (e) => {
    const el = e.currentTarget;
      if (el.scrollHeight <= el.clientHeight + 2) return;
    const thresholdPx = 36;
    if (el.scrollTop <= thresholdPx) loadOlderTurns();
  };

  // Send message handler
  const handleNewChat = async () => {
    
    const newId = uuidv4();
    const newSession = {
      id: newId,
      title: "Untitled",
      lastUpdated: new Date().toISOString(),
    };
    setSessions(prev => prev.map(s => (s.draft ? newSession : s)));
    navigate(`/chat/${newId}`, { replace: true });
    return newSession;
  };

  const stopMessage = () => {
    const controller = messageAbortRef.current;
    if (!controller || controller.signal.aborted) return;

    controller.abort();

    const reader = messageReaderRef.current;
    if (reader) {
      void reader.cancel("User stopped generation").catch(() => {});
    }
  };

  // Send message function
  const sendMessage = async (
    text = input.trim(),
    turnSequence = null
  ) => {
    if (!text || messageLoading) return;
    if (turnSequence === null) setInput('');

    const requestController = new AbortController();
    messageAbortRef.current = requestController;
    messageReaderRef.current = null;
    setMessageLoading(true);
    setMessageProcessing(true);

    const turnsWithoutContinuations = turnsRef.current.map((turn) => {
      if (!turn?.ai?.continuation) return turn;
      const ai = { ...turn.ai };
      delete ai.continuation;
      return { ...turn, ai };
    });
    turnsRef.current = turnsWithoutContinuations;
    setTurns(turnsWithoutContinuations);

    if (newChat) {
      setSkipPageFetch(true);
      session = await handleNewChat(text);
    }

    const existingTurn =
      turnSequence !== null
      ? turnsRef.current.find((turn) => turn.turnSeq === turnSequence)
      : null;

    if (turnSequence !== null && !existingTurn) {
      throw new Error(`Turn ${turnSequence} was not found`);
    }

    const lastTurn = turnsRef.current
      .slice()
      .reverse()
      .find((turn) => turn?.ai?.messageId && !turn.ai.error);

    const lastVisibleTurnSeq = Number(
      turnsRef.current[turnsRef.current.length - 1]?.turnSeq ?? 0
    );

    const messageId = uuidv4();

    const retryingFailedAi = existingTurn?.ai?.error === true;

    const nextAiMessageSeq = retryingFailedAi
      ? existingTurn.ai.messageSeq
      : (existingTurn?.ai?.totalMessages ?? 0) + 1;

    const previousStoredAiId = retryingFailedAi
      ? existingTurn.ai.prevMessageId || ""
      : existingTurn?.ai?.messageId || "";

    const newTurn = {
      turnSeq: existingTurn?.turnSeq ?? lastVisibleTurnSeq + 1,
      user: existingTurn?.user ?? {
        message: text,
        messageId: messageId,
        messageSeq: 1,
        parentMessageId: lastTurn?.ai.messageId || "#ROOT",
      },
      ai: {
        messageSeq: nextAiMessageSeq,
        parentMessageId: existingTurn?.user?.messageId ?? messageId,
        prevMessageId: previousStoredAiId,
      },
      title: session?.title || "Untitled",
    };

    const updatedTurns = existingTurn
      ? turnsRef.current
          .filter((turn) => turn.turnSeq <= newTurn.turnSeq)
          .map((turn) =>
            turn.turnSeq === newTurn.turnSeq ? newTurn : turn
          )
      : [...turnsRef.current, newTurn];
    turnsRef.current = updatedTurns;
    setTurns(updatedTurns);
    let receivedResponseContent = false;

    try {
      const res = await sendChatTurnServer(
        session.id,
        newTurn,
        accessToken,
        updateAccessToken,
        requestController.signal,
      );

      if (res?.unauthorized) {
        setMessageLoading(false);
        return;
      }

      if (!res?.body) {
        throw new Error("No response body returned from chat stream");
      }

      const reader = res.body.getReader();
      messageReaderRef.current = reader;
      const decoder = new TextDecoder();

      let buffer = "";
      let receivedTerminalEvent = false;

      const allowReactToPaint = () =>
        new Promise((resolve) => {
          if (document.visibilityState !== "visible") {
            resolve();
            return;
          }

          let settled = false;
          let frameId;
          let timeoutId;

          const finish = () => {
            if (settled) return;
            settled = true;
            cancelAnimationFrame(frameId);
            clearTimeout(timeoutId);
            resolve();
          };

          frameId = requestAnimationFrame(finish);
          timeoutId = setTimeout(finish, 50);
        });

      const processStreamMessage = async (msg) => {
        let contentChanged = false;

        if (msg.type === "status") {
          const modelName = msg.model
            ? modelLabelsById[msg.model] ?? msg.model
            : null;

          const message = modelName
            ? `${msg.content} ${modelName}…`
            : msg.content;

          setTurns((prev) =>
            prev.map((turn) =>
              turn.turnSeq === newTurn.turnSeq
                ? {
                    ...turn,
                    ai: {
                      ...turn.ai,
                      message: message,
                    },
                  }
                : turn
              )
          );
          contentChanged = true;
        }

        if (msg.type === "final") {
          receivedTerminalEvent = true;
          receivedResponseContent = true;
          const requestData = msg.request;

          if (requestData) {
            const total = Number(requestData.total);
            const expires = Number(requestData.expires);

            if (Number.isFinite(total)) {
              setTotalCount(total);
              localStorage.setItem(CHAT_TOTALCOUNT, String(total));
            }

            if (Number.isFinite(expires)) {
              setChatExpiration(expires);
              localStorage.setItem(CHAT_EXPIRATION, String(expires));
            }
          }

          if (msg.content.title) {
            const newTitle = msg.content.title;

            setSessions((prev) =>
              prev.map((storedSession) =>
                storedSession.id === session.id
                  ? { ...storedSession, title: newTitle }
                  : storedSession
              )
            );
          }

          const finalTurn = msg.continuation
            ? {
                ...msg.content,
                ai: {
                  ...msg.content.ai,
                  continuation: msg.continuation,
                },
              }
            : msg.content;

          setTurns((prev) =>
            prev.map((turn) =>
              turn.turnSeq === newTurn.turnSeq
                ? finalTurn
                : turn
            )
          );

          contentChanged = true;
        }

        if (msg.type === "error") {
          receivedTerminalEvent = true;

          setTurns((prev) =>
            prev.map((turn) =>
              turn.turnSeq === newTurn.turnSeq
                ? {
                    ...turn,
                    ai: {
                      ...turn.ai,
                      ...(!receivedResponseContent
                        ? { message: msg.content }
                        : {}),
                      error: true,
                    },
                  }
                : turn
            )
          );

          contentChanged = true;
        }

        // Separate visible UI updates without stalling on browsers that pause rAF.
        if (contentChanged) {
          await allowReactToPaint();
        }
      };

      while (true) {
        const { value, done } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        if (done) {
          // Flush any bytes still held by TextDecoder.
          buffer += decoder.decode();
        }

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const msg = JSON.parse(line);
          await processStreamMessage(msg);
        }

        if (done) {
          // Process a final JSON object even if it has no trailing newline.
          if (buffer.trim()) {
            const msg = JSON.parse(buffer);
            await processStreamMessage(msg);
          }

          break;
        }
      }

      if (!receivedTerminalEvent) {
        throw new Error("Chat stream ended before a final event was received");
      }
    } catch (err) {
      const stopped =
        requestController.signal.aborted || err?.name === "AbortError";

      if (stopped) {
        setTurns((prev) =>
          prev.map((turn) =>
            turn.turnSeq === newTurn.turnSeq
              ? {
                  ...turn,
                  ai: {
                    ...turn.ai,
                    ...(!receivedResponseContent
                      ? { message: "Response stopped." }
                      : {}),
                    stopped: true,
                  },
                }
              : turn
          )
        );
        return;
      }

      console.error('API error:', err);
      const serverMessage =
        err?.body?.detail?.message ||
        err?.body?.detail ||
        err?.body?.message ||
        `Chat request failed (${err?.status || "network error"})`;
      console.error("ERROR", serverMessage);

      setTurns(prev =>
        prev.map((t) =>
          t.turnSeq === newTurn.turnSeq
            ? {
                ...t,
                ai: {
                  ...t.ai,
                  message: "Having trouble connecting...",
                  error: true
                },
              }
            : t
        )
      );
    } finally {
      if (messageAbortRef.current === requestController) {
        messageAbortRef.current = null;
        messageReaderRef.current = null;
        setMessageProcessing(false);
        setMessageLoading(false);
      }

      hasLoadedOnceRef.current = true;
    }
  };

  const continueMessage = async (turnSeq, continuationId) => {
    if (!continuationId) return;

    const requestController = new AbortController();
    messageAbortRef.current = requestController;
    messageReaderRef.current = null;
    setMessageLoading(true);
    setMessageProcessing(true);
    setTurns((prev) => prev.map((turn) =>
      turn.turnSeq === turnSeq
        ? {
            ...turn,
            ai: {
              ...turn.ai,
              continuation: {
                ...turn.ai.continuation,
                loading: true,
                error: null,
              },
            },
          }
        : turn
    ));

    let receivedTerminalEvent = false;

    try {
      const res = await continueChatMessageServer(
        session.id,
        continuationId,
        accessToken,
        updateAccessToken,
        requestController.signal,
      );
      if (res?.unauthorized) return;
      if (!res?.body) throw new Error("No continuation stream was returned");

      const reader = res.body.getReader();
      messageReaderRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (msg) => {
        if (msg.type === "continuation") {
          receivedTerminalEvent = true;
          setTurns((prev) => prev.map((turn) => {
            if (turn.turnSeq !== turnSeq) return turn;

            const current = turn?.ai?.message;
            const currentBlocks = current?.format === "blocks_v1"
              && Array.isArray(current.blocks)
              ? current.blocks
              : [];
            const addedBlocks = msg?.content?.format === "blocks_v1"
              && Array.isArray(msg.content.blocks)
              ? msg.content.blocks
              : [];
            const ai = {
              ...turn.ai,
              message: {
                format: "blocks_v1",
                blocks: [...currentBlocks, ...addedBlocks],
              },
            };

            if (msg.continuation) {
              ai.continuation = msg.continuation;
            } else {
              delete ai.continuation;
            }
            return { ...turn, ai };
          }));
        }

        if (msg.type === "continuation_error") {
          receivedTerminalEvent = true;
          setTurns((prev) => prev.map((turn) =>
            turn.turnSeq === turnSeq
              ? {
                  ...turn,
                  ai: {
                    ...turn.ai,
                    continuation: {
                      ...turn.ai.continuation,
                      loading: false,
                      error: msg.content,
                    },
                  },
                }
              : turn
          ));
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        if (done) buffer += decoder.decode();

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) processEvent(JSON.parse(line));
        }
        if (done) {
          if (buffer.trim()) processEvent(JSON.parse(buffer));
          break;
        }
      }

      if (!receivedTerminalEvent) {
        throw new Error("Continuation stream ended unexpectedly");
      }
    } catch (err) {
      if (requestController.signal.aborted || err?.name === "AbortError") {
        setTurns((prev) => prev.map((turn) =>
          turn.turnSeq === turnSeq
            ? {
                ...turn,
                ai: {
                  ...turn.ai,
                  continuation: {
                    ...turn.ai.continuation,
                    loading: false,
                    error: null,
                  },
                },
              }
            : turn
        ));
        return;
      }
      console.error("Continuation failed:", err);
      setTurns((prev) => prev.map((turn) =>
        turn.turnSeq === turnSeq
          ? {
              ...turn,
              ai: {
                ...turn.ai,
                continuation: {
                  ...turn.ai.continuation,
                  loading: false,
                  error: "Unable to continue right now. Please try again.",
                },
              },
            }
          : turn
      ));
    } finally {
      if (messageAbortRef.current === requestController) {
        messageAbortRef.current = null;
        messageReaderRef.current = null;
        setMessageProcessing(false);
        setMessageLoading(false);
      }
    }
  };

  // Input keydown handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editedTurn !== null) {
        setEditedTurn(null);
      } else {
        sendMessage();
      }
    }
  };

  const CHAT_MESSAGE_LIMIT = 20;
  const totalMessagesUsed = Number(chatTotalCount) || 0;
  const messagesRemaining = Math.max(
    CHAT_MESSAGE_LIMIT - totalMessagesUsed,
    0
  );
  const showMessageReminder = messagesRemaining <= 5;
  const expirationTimestamp = Number(chatExpiration);
  const resetDate =
    expirationTimestamp > 0
      ? new Date(expirationTimestamp * 1000)
      : null;
  const resetLabel =
    resetDate && !Number.isNaN(resetDate.getTime())
      ? resetDate.toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
  return (
    <div className="chat-container">
      {hasTurns ? <ChatHeader session={session} chatLoading={chatLoading} /> : null}

      <div className="chat-box scrollbar-custom" ref={scrollRef} onScroll={onScrollChat}>
        {chatLoading ? (
          <div className="loading-container">
            <SpinnerRounded />
          </div>
        ) : hasTurns ? (
          <>
            {loadingMore && (
              <div className="chat-msg ai" style={{ opacity: 0.7 }}>
                Loading older messages…
              </div>
            )}

            <Messages
              turns={turns}
              editedTurn={editedTurn}
              sessionId={sessionId}
              catalogDict={catalogDict}
              messageProcessing={messageProcessing}
              setMessageError={setErrorMessage}
              regenerate={sendMessage}
              continueMessage={continueMessage}
            />
          </>
        ) : (
          <div className="empty-state">
            <img src="/logo.svg" alt="Logo" className="empty-logo" width={125}/>
            <h2>Hi, It's CAI</h2>
            <p>How can I help you today?</p>
          </div>
        )}
      </div>
      <div className="chat-input-wrapper">
        {!showTrainingChoice && showMessageReminder && (
          <div
            className={`chat-limit-status ${
              messagesRemaining === 0 ? "limit-reached" : ""
            }`}
            role="status"
          >
            {messagesRemaining === 0 ? (
              <>
                You’ve reached your message limit.
                {resetLabel && (
                  <> You can send more messages after <strong>{resetLabel}</strong>.</>
                )}
              </>
            ) : (
              <>
                You have{" "}
                <strong>
                  {messagesRemaining} message
                  {messagesRemaining === 1 ? "" : "s"} left
                </strong>
                {resetLabel && (
                  <>. Your limit resets <strong>{resetLabel}</strong></>
                )}
                .
              </>
            )}
          </div>
        )}

        <div
          className={`chat-input-bar ${
            showTrainingChoice ? "training" : ""
          } ${editedTurn !== null ? "editing" : ""}`}
        >
          {editedTurn !== null && (
            <div className="edit-inline-label">Editing…</div>
          )}

          {showTrainingChoice ? (
            <ChatModelTraining
              setTrainingState={setTrainingState}
              setErrorMessage={setErrorMessage}
              setSuccessMessage={setSuccessMessage}
            />
          ) : (
            <div className="chat-input-row">
              <textarea
                ref={editInputRef}
                className="chat-input scrollbar-custom"
                value={editedTurn !== null ? editValue : input}
                onKeyDown={handleKeyDown}
                onChange={(e) =>
                  editedTurn !== null
                    ? setEditValue(e.target.value)
                    : setInput(e.target.value)
                }
                rows={1}
                placeholder="Get the Best Answer"
              />
              {messageLoading ? (
                <button
                  type="button"
                  className="chat-send"
                  onClick={stopMessage}
                  aria-label="Stop generating"
                >
                  <Square size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className="chat-send"
                  onClick={
                    editedTurn !== null
                      ? () => setEditedTurn(null)
                      : () => sendMessage()
                  }
                  disabled={
                    messageLoading ||
                    (editedTurn === null && !activeText.trim())
                  }
                  aria-label="Send message"
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="chat-footer">
          <span>
            ChatWithCAI responses may be inaccurate. Verify important
            information.
          </span>
        </div>
      </div>
    </div>
  );
}
