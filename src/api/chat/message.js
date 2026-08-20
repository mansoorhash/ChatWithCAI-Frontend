import { apiFetch } from "../basefetch";

export async function sendChatTurnServer(sessionId, turnData, accessToken, updateAccessToken) {
  if (!sessionId) {
    throw new Error("sendChatTurnServer requires a sessionId");
  }

  try {
    const res = await apiFetch(
      `/chat/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnData,
        }),
      },
      accessToken,
      updateAccessToken
    );

    return res;
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}

export async function updateMessageReview(review, sessionId, messageId, accessToken, updateAccessToken) {
  if (!sessionId) {
    throw new Error("updateMessageReview requires a sessionId");
  }

  try {
    const res = await apiFetch(
      `/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messageId,
          review
        }),
      },
      accessToken,
      updateAccessToken
    );

    return res;
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}