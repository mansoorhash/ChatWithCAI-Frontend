import { useEffect, useState } from 'react';
import { CHAT_EXPIRATION, CHAT_TOTALCOUNT } from '../../../utils/constants';

const CHAT_LIMIT_STORAGE_SYNC_MS = 1000;

function readStoredChatLimits() {
  const storedTotal = localStorage.getItem(CHAT_TOTALCOUNT);
  const parsedTotal = Number(storedTotal);
  const total =
    storedTotal !== null && Number.isFinite(parsedTotal) && parsedTotal >= 0
      ? Math.trunc(parsedTotal)
      : 0;

  const storedExpiration = localStorage.getItem(CHAT_EXPIRATION);
  const parsedExpiration = Number(storedExpiration);
  const expiration =
    storedExpiration !== null &&
    Number.isFinite(parsedExpiration) &&
    parsedExpiration > 0
      ? parsedExpiration
      : null;

  return { total, expiration };
}

export default function useChatLimits() {
  const [chatTotalCount, setChatTotalCount] = useState(
    () => readStoredChatLimits().total,
  );
  const [chatExpiration, setChatExpiration] = useState(
    () => readStoredChatLimits().expiration,
  );

  useEffect(() => {
    const syncStoredChatLimits = () => {
      const { total, expiration } = readStoredChatLimits();
      setChatTotalCount((current) => (current === total ? current : total));
      setChatExpiration((current) =>
        current === expiration ? current : expiration,
      );
    };

    const handleStorage = (event) => {
      if (
        event.key !== null &&
        event.key !== CHAT_TOTALCOUNT &&
        event.key !== CHAT_EXPIRATION
      ) {
        return;
      }
      syncStoredChatLimits();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncStoredChatLimits();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncStoredChatLimits);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(
      syncStoredChatLimits,
      CHAT_LIMIT_STORAGE_SYNC_MS,
    );

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncStoredChatLimits);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const expirationTimestamp = Number(chatExpiration);
    if (!Number.isFinite(expirationTimestamp) || expirationTimestamp <= 0) {
      return undefined;
    }

    const resetChatLimit = () => {
      setChatExpiration(null);
      setChatTotalCount(0);
      localStorage.removeItem(CHAT_EXPIRATION);
      localStorage.setItem(CHAT_TOTALCOUNT, '0');
    };

    const millisecondsRemaining = expirationTimestamp * 1000 - Date.now();
    if (millisecondsRemaining <= 0) {
      resetChatLimit();
      return undefined;
    }

    const timeoutId = window.setTimeout(resetChatLimit, millisecondsRemaining);
    return () => window.clearTimeout(timeoutId);
  }, [chatExpiration]);

  return {
    chatExpiration,
    chatTotalCount,
    setChatExpiration,
    setChatTotalCount,
  };
}
