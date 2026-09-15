# API client

This directory is the frontend boundary for the CAI backend. UI components should call these focused modules instead of assembling backend requests themselves.

## Request layering

```text
feature module
    ↓
getjson.js / postjson.js (when the request is ordinary JSON)
    ↓
basefetch.jsx
    ↓
CAI API origin from src/config.js
```

`basefetch.jsx` centralizes the behavior shared by backend requests:

- Prefix the request path with `VITE_BACKEND_SERVER`.
- Send cookies with `credentials: 'include'`.
- Add the bearer access token when one is supplied.
- Serialize concurrent refresh attempts through one shared refresh promise.
- Retry an expired or invalid token once when an `updateAccessToken` callback is supplied.
- Throw errors containing `status` and the parsed backend `body`.

Access tokens remain in React context; do not persist them to local storage. Authentication cookies are managed by the browser and backend.

## Modules

| Path | Responsibility |
| --- | --- |
| `authentication/` | Registration, login, logout, verification, password reset, and password challenges. |
| `basefetch/` | JSON helpers and access-token refresh. |
| `chat/` | Session history, streamed turns, continuation, branches, reviews, warm-up pings, and attachments. |
| `data/` | Public service data such as status. |
| `user/` | Profile, model selection, subscription, usage, and data controls. |

## Adding an endpoint

1. Put the function in the domain module that owns the request.
2. Accept an `AbortSignal` for work tied to a component lifecycle or active generation.
3. Pass `accessToken` and `updateAccessToken` for protected endpoints.
4. URL-encode user-controlled path segments and use `JSON.stringify` for query cursor objects.
5. Return parsed JSON when callers need data; return the raw `Response` for streams or status-only operations.
6. Preserve the established `{ unauthorized: true }` result only where existing callers explicitly handle it.

Attachment uploads are the exception to the usual Fetch-only transport. `chat/files.js` obtains a presigned URL through `apiFetch`, uploads directly with `XMLHttpRequest` so progress can be reported, and then confirms completion with the backend.

Chat response bodies are streams. Parsing and state reconciliation live in `../protected/chat/chat.jsx`, not in the transport module; see [`../protected/chat/README.md`](../protected/chat/README.md).
