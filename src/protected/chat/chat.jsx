import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ChatHeader from './chatHeader';
import { useNavigate } from 'react-router-dom';
import { fetchSessionServer } from '../../api/chat/session';
import SpinnerRounded from '../../components/loading';
import Messages from './messages/messages';
import {v4 as uuidv4} from "uuid";
import './chat.css';
import { useUserID } from '../../utils/userIdContext';
import {
  continueChatMessageServer,
  sendChatTurnServer,
} from '../../api/chat/message';
import { CHAT_TOTALCOUNT, CHAT_EXPIRATION } from '../../utils/constants';
import TurnNavigator from './components/turns/navigator';
import ChatInput from './input/layout';
import useChatLimits from './input/useChatLimits';

const FEEDBACK_PROMPT_CHANCE = 0.2;
const FEEDBACK_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_PROMPT_LAST_SHOWN = 'chat_feedback_prompt_last_shown';

function shouldRequestFeedback(
  now = Date.now(),
  random = Math.random,
) {
  try {
    const lastShown = Number(
      localStorage.getItem(FEEDBACK_PROMPT_LAST_SHOWN),
    );

    if (
      Number.isFinite(lastShown) &&
      lastShown > 0 &&
      now - lastShown < FEEDBACK_PROMPT_COOLDOWN_MS
    ) {
      return false;
    }

    if (random() >= FEEDBACK_PROMPT_CHANCE) return false;

    localStorage.setItem(FEEDBACK_PROMPT_LAST_SHOWN, String(now));
    return true;
  } catch {
    return random() < FEEDBACK_PROMPT_CHANCE;
  }
}


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
  modelLabelsById,
  chatReady = true,
  onNewChat,
  onPromoteSession,
}) {
  const { accessToken, updateAccessToken } = useUserID();
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const showTrainingChoice = trainingState === null;

  const [chatLoading, setChatLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageProcessing, setMessageProcessing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedbackPromptTurnSeq, setFeedbackPromptTurnSeq] = useState(null);
  const {
    chatExpiration,
    chatTotalCount,
    setChatExpiration,
    setChatTotalCount: setTotalCount,
  } = useChatLimits();
  const initialScrollRef = useRef(false);

  // Now this is turns (backend-native)
  const [turns, setTurns] = useState([]);
  const turnsRef = useRef(turns);
  const hasTurns = turns.length > 0;
  const showTurnNavigator = turns.length > 2;
  
  const hasSelectedSession = Boolean(!session?.draft);

  // Message States
  const [activeTurn, setActiveTurn] = useState(null);
  const [editedTurn, setEditedTurn] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Pagination cursor (LastEvaluatedKey)
  const cursorRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);
  const cooldownRef = useRef(false);
  const wasGeneratingRef = useRef(false);
  const messageAbortRef = useRef(null);
  const messageReaderRef = useRef(null);

  // Attachments
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Fetch turns when session changes
  useEffect(() => {
    setChatLoading(true);

    // reset pagination on session change
    cursorRef.current = null;
    hasLoadedOnceRef.current = false;
    initialScrollRef.current = false;
    
    // reset edit states
    setEditedTurn(null);
    setEditValue('');
    setFeedbackPromptTurnSeq(null);
    setAttachments((current) =>
      current.filter(
        (attachment) => attachment.sessionId === session?.id
      )
    );
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
    text,
    turnSequence = null,
    regenerationRank = null,
    editingUserMessage = false,
  ) => {
    const filesUploading = attachments.some(
      (attachment) => attachment.status === 'uploading',
    );

    if (
      !text ||
      filesUploading ||
      messageLoading ||
      !chatReady ||
      !session?.id
    ) return;
    setFeedbackPromptTurnSeq(null);
    
    setEditedTurn(null);
    setEditValue('');
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
      session = await onPromoteSession?.(session);
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

    const nextAiMessageSeq = editingUserMessage
      ? 1
      : retryingFailedAi
      ? existingTurn.ai.messageSeq
      : (existingTurn?.ai?.totalMessages ?? 0) + 1;

    const previousStoredAiId = editingUserMessage
      ? ""
      : retryingFailedAi
      ? existingTurn.ai.prevMessageId || ""
      : existingTurn?.ai?.messageId || "";

    const messageAttachments = attachments
      .filter(
        (attachment) =>
          attachment.status === 'ready' &&
          attachment.sessionId === session.id
      )
      .map((attachment) => ({
        fileId: attachment.fileId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
    }));

    const userMessage = editingUserMessage
      ? {
          message: text,
          messageId,
          messageSeq:
            (existingTurn?.user?.totalMessages ??
              existingTurn?.user?.messageSeq ??
              0) + 1,
          parentMessageId: existingTurn?.user?.parentMessageId || "#ROOT",
          prevMessageId: existingTurn?.user?.messageId || "",
          attachments: existingTurn?.user?.attachments ?? [],
        }
      : existingTurn?.user ?? {
          message: text,
          messageId,
          messageSeq: 1,
          parentMessageId: lastTurn?.ai.messageId || "#ROOT",
          attachments: messageAttachments,
        };

    const newTurn = {
      turnSeq: existingTurn?.turnSeq ?? lastVisibleTurnSeq + 1,
      user: userMessage,
      ai: {
        messageSeq: nextAiMessageSeq,
        parentMessageId: userMessage.messageId,
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
    const regenerate = turnSequence !== null && !editingUserMessage;
    const requestedRegenerationRank = retryingFailedAi
      ? null
      : regenerationRank;
    let receivedResponseContent = false;
    let receivedCommittedEvent = false;
    
    try {
      const requestTurn = {
        ...newTurn,
        user: { ...newTurn.user },
      };
      delete requestTurn.user.alternativeModels;

      const res = await sendChatTurnServer(
        session.id,
        requestTurn,
        accessToken,
        updateAccessToken,
        requestController.signal,
        requestedRegenerationRank,
        regenerate,
      );

      if (!existingTurn) {
        setAttachments([]);
      }

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

      const applyRequestData = (requestData) => {
        if (!requestData) return;

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
      };

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

        if (msg.type === "partial") {
          receivedResponseContent = true;
          applyRequestData(msg.request);

          const storedTurn = msg?.turn;
          if (storedTurn?.ai && storedTurn?.user) {
            receivedCommittedEvent = true;
            const committedTurn = {
              ...storedTurn,
              ai: {
                ...storedTurn.ai,
                ...(msg.continuation
                  ? { continuation: msg.continuation }
                  : {}),
              },
            };

            if (committedTurn.title) {
              setSessions((prev) =>
                prev.map((storedSession) =>
                  storedSession.id === session.id
                    ? { ...storedSession, title: committedTurn.title }
                    : storedSession
                )
              );
            }

            setTurns((prev) =>
              prev.map((turn) =>
                turn.turnSeq === newTurn.turnSeq
                  ? committedTurn
                  : turn
              )
            );
          } else if (msg.content) {
            setTurns((prev) =>
              prev.map((turn) =>
                turn.turnSeq === newTurn.turnSeq
                  ? {
                      ...turn,
                      ai: {
                        ...turn.ai,
                        message: msg.content,
                        ...(msg.continuation
                          ? { continuation: msg.continuation }
                          : {}),
                      },
                    }
                  : turn
              )
            );
          }

          contentChanged = true;
        }

        if (msg.type === "final") {
          receivedTerminalEvent = true;
          receivedResponseContent = true;
          applyRequestData(msg.request);

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

          const finalTurn = {
            ...msg.content,
            ai: {
              ...msg.content.ai,
              ...(msg.continuation
                ? { continuation: msg.continuation }
                : {}),
            },
          };

          setTurns((prev) =>
            prev.map((turn) =>
              turn.turnSeq === newTurn.turnSeq
                ? finalTurn
                : turn
            )
          );

          if (!finalTurn?.ai?.error && shouldRequestFeedback()) {
            setFeedbackPromptTurnSeq(
              finalTurn?.turnSeq ?? newTurn.turnSeq,
            );
          }
          contentChanged = true;
        }

        if (msg.type === "error") {
          receivedTerminalEvent = true;

          if (msg.code == "daily_limit_exceeded") {
            const total = Number(20);
            const expires = Number(msg.resetsAt);

            if (Number.isFinite(total)) {
              setTotalCount(total);
              localStorage.setItem(CHAT_TOTALCOUNT, String(total));
            }

            if (Number.isFinite(expires)) {
              setChatExpiration(expires);
              localStorage.setItem(CHAT_EXPIRATION, String(expires));
            }
          }

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

      if (!receivedTerminalEvent && !receivedCommittedEvent) {
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
                      ? { message: "Cancelled", }
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

      if (receivedCommittedEvent) {
        console.warn(
          "Chat stream ended after the response was persisted; using committed content.",
        );
        return;
      }

      try {
        const recoveryPage = await fetchSessionServer(
          session.id,
          null,
          accessToken,
          updateAccessToken,
        );
        const recoveredTurn = coerceTurns(recoveryPage).find(
          (turn) =>
            turn?.user?.messageId === newTurn.user.messageId &&
            turn?.ai?.message,
        );

        if (recoveredTurn) {
          turnsRef.current = turnsRef.current.map((turn) =>
            turn.turnSeq === newTurn.turnSeq ? recoveredTurn : turn
          );
          setTurns(turnsRef.current);

          if (recoveredTurn.title) {
            setSessions((prev) =>
              prev.map((storedSession) =>
                storedSession.id === session.id
                  ? { ...storedSession, title: recoveredTurn.title }
                  : storedSession
              )
            );
          }

          console.warn(
            "Chat stream ended early; restored the persisted response.",
          );
          return;
        }
      } catch (recoveryError) {
        console.error("Chat response recovery failed:", recoveryError);
      }

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
                blocks: msg.replace
                  ? addedBlocks
                  : [...currentBlocks, ...addedBlocks],
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

  const editMessage = async (turnIndex) => {
    const editedMessage = editValue.trim();
    const turn = turnsRef.current[turnIndex];

    if (!editedMessage || !turn || messageLoading) return;

    setEditedTurn(null);
    setEditValue('');
    await sendMessage(editedMessage, turn.turnSeq, null, true);
  }

  const scrollToTurn = (turnSeq) => {
    document
      .getElementById(`turn-${turnSeq}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    setActiveTurn(turnSeq);
  };

  return (
    <div className="chat-container">
      {chatLoading || hasSelectedSession &&
        <ChatHeader session={session} chatLoading={chatLoading} />
      }
      <div className={`chat-main ${hasSelectedSession ? "" : "no-session"}`}>
      <div
        className={`chat-box scrollbar-custom ${
          hasSelectedSession ? "" : "no-session"
        }`}
        ref={scrollRef}
        onScroll={onScrollChat}
      >
        <div className="chat-content">
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
              setEditedTurn={setEditedTurn}
              editValue={editValue}
              setEditValue={setEditValue}
              sessionId={sessionId}
              catalogDict={catalogDict}
              messageProcessing={messageProcessing}
              setMessageError={setErrorMessage}
              regenerate={sendMessage}
              continueMessage={continueMessage}
              feedbackPromptTurnSeq={feedbackPromptTurnSeq}
              dismissFeedbackPrompt={() => setFeedbackPromptTurnSeq(null)}
            />
          </>
        ) : (
          <div className="empty-state">
            <h2>What should we solve together?</h2>
          </div>
        )}
        </div>

        {showTurnNavigator && (
          <TurnNavigator
            turns={turns}
            activeTurn={activeTurn}
            onTurnClick={scrollToTurn}
          />
        )}
      </div>
      <ChatInput
        chatExpiration={chatExpiration}
        chatReady={chatReady}
        chatTotalCount={chatTotalCount}
        canSendToSession={Boolean(session?.id)}
        editValue={editValue}
        editedTurn={editedTurn}
        hasSelectedSession={hasSelectedSession}
        messageLoading={messageLoading}
        onEditMessage={editMessage}
        onSendMessage={sendMessage}
        onStopMessage={stopMessage}
        sessionId={sessionId}
        setEditValue={setEditValue}
        setEditedTurn={setEditedTurn}
        setErrorMessage={setErrorMessage}
        setSuccessMessage={setSuccessMessage}
        setTrainingState={setTrainingState}
        showTrainingChoice={showTrainingChoice}
        attachments={attachments}
        setAttachments={setAttachments}
        onCreateSession={onNewChat}
      />
      </div>
      <div className="chat-footer">
          <span>
            ChatWithCAI responses may be inaccurate. Verify important
            information.
          </span>
        </div>
    </div>
  );
}
