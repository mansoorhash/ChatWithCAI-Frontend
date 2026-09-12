import { apiFetch } from "../basefetch";

function uploadToS3(uploadUrl, file, uploadHeaders, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", abortUpload);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const abortUpload = () => {
      request.abort();
      fail(new DOMException("Upload aborted.", "AbortError"));
    };

    request.open("PUT", uploadUrl);
    Object.entries(uploadHeaders).forEach(([name, value]) => {
      request.setRequestHeader(name, value);
    });

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => fail(new Error("The file could not be uploaded."));
    request.onabort = () => fail(new DOMException("Upload aborted.", "AbortError"));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        fail(new Error(`Storage upload failed (${request.status}).`));
        return;
      }

      settled = true;
      cleanup();
      onProgress?.(100);
      resolve();
    };

    if (signal?.aborted) {
      abortUpload();
      return;
    }

    signal?.addEventListener("abort", abortUpload, { once: true });
    request.send(file);
  });
}

export async function uploadSessionFileServer(
  validSession,
  sessionId,
  file,
  accessToken,
  updateAccessToken,
  onProgress,
  signal,
) {
  if (!sessionId) {
    throw new Error("uploadSessionFileServer requires a sessionId");
  }

  if (!(file instanceof File)) {
    throw new Error("uploadSessionFileServer requires a File");
  }

  try {
    const presignResponse = await apiFetch(
      `/chat/attachments/${encodeURIComponent(sessionId)}/presign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          session: Boolean(validSession),
        }),
        signal,
      },
      accessToken,
      updateAccessToken,
    );
    const presigned = await presignResponse.json();

    if (!presigned?.uploadUrl || !presigned?.fileId) {
      throw new Error("Invalid upload response.");
    }

    await uploadToS3(
      presigned.uploadUrl,
      file,
      presigned.uploadHeaders || {
        "Content-Type": presigned.mimeType,
      },
      (percent) => onProgress?.(Math.round(percent * 0.9)),
      signal,
    );

    const completeResponse = await apiFetch(
      `/chat/attachments/${encodeURIComponent(sessionId)}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: presigned.fileId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          session: Boolean(validSession),
        }),
        signal,
      },
      accessToken,
      updateAccessToken,
    );
    const uploaded = await completeResponse.json();

    if (uploaded?.unauthorized) {
      throw new Error("Authentication required.");
    }

    if (!uploaded?.fileId) {
      throw new Error(uploaded?.message || "Invalid upload response.");
    }

    onProgress?.(100);
    return uploaded;
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };

    if (err?.status === 413) {
      const error = new Error("File Exceeds 20MB");
      error.code = err?.body?.message || "FILE_TOO_LARGE";
      error.status = 413;
      throw error;
    }

    throw err;
  }
}

export async function deleteSessionFileServer(
  sessionId,
  fileId,
  accessToken,
  updateAccessToken,
  signal,
) {
  if (!sessionId || !fileId) {
    throw new Error("Deleting an attachment requires sessionId and fileId");
  }

  try {
    const response = await apiFetch(
      `/chat/attachments/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        signal,
      },
      accessToken,
      updateAccessToken,
    );

    return { deleted: response.status === 204 };
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}
