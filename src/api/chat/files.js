import { apiFetch } from "../basefetch";

export async function uploadSessionFileServer(
  sessionId,
  file,
  accessToken,
  updateAccessToken,
  signal,
) {
  if (!sessionId) {
    throw new Error("sendChatTurnServer requires a sessionId");
  }

  if (!(file instanceof File)) {
    throw new Error(
      "uploadSessionFileServer requires a File"
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await apiFetch(
      `/chat/attachments/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: file,
        signal,
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