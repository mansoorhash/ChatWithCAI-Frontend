# Chat feature

This directory implements the authenticated conversation experience. `chat.jsx` is the feature coordinator: it loads history, manages the active branch, sends or retries turns, consumes streamed events, reconciles server state, and connects the input and message views.

## Structure

| Path | Responsibility |
| --- | --- |
| `chat.jsx` | Conversation state, history pagination, stream processing, editing, regeneration, continuation, and feedback timing. |
| `chatHeader.jsx` | Conversation header controls. |
| `components/turns/` | Turn navigator for longer conversations. |
| `input/layout.jsx` | Composer, keyboard behavior, limits, file selection/upload, submission, and chat warm-up ping. |
| `input/useChatLimits.js` | Remaining-message and expiry calculations. |
| `messages/messages.jsx` | Turn list and edit/regenerate orchestration. |
| `messages/messageRender.jsx` | Markdown and message-content rendering. |
| `messages/messageActions.jsx` | Copy, review, regenerate, and related actions. |
| `messages/components/attachments.jsx` | Uploaded-file presentation. |
| `messages/utils/` | Clipboard and content-to-text helpers. |

Component styles are colocated with the corresponding JSX files.

## Turn model

The UI treats a conversation as ordered turns. Each turn contains a user message and an AI message, with sequence numbers and message IDs used to represent edited user messages and regenerated AI alternatives. `turnSeq` identifies the visible turn; message sequence metadata identifies alternatives within that turn.

When changing this model, preserve these behaviors:

- Editing a user turn truncates later visible turns and creates a new user-message alternative.
- Regenerating creates or retries an AI alternative without duplicating the user message.
- Branch selection replaces the visible alternative with the branch returned by the backend.
- Older turns prepend without moving the reader's current scroll position.
- Continuation metadata is transient and is removed before a new request is assembled.

## Streaming lifecycle

`sendChatTurnServer` returns a raw `Response`. `chat.jsx` reads newline-delimited JSON from its body and handles these event types:

- `status` updates the temporary routing or processing message.
- `partial` applies incremental content or a server-committed turn snapshot.
- `final` replaces the optimistic turn with canonical server data and updates the generated title when supplied.
- Error events or malformed/incomplete streams move the optimistic AI message into an error state that can be retried.

The separate continuation request emits `continuation` and `continuation_error` events. It appends content to the selected AI message and clears its continuation marker when the follow-up stream finishes.

The active reader and request share cancellation handling so the stop control can abort generation promptly. Keep streamed state updates scoped to the request's `turnSeq`; otherwise a late event can overwrite a different turn.

## Attachments

The composer uploads files before sending the turn:

1. Request a presigned upload from the backend.
2. Upload directly to object storage while reporting progress.
3. Confirm the upload with the backend.
4. Include only `ready` attachments belonging to the active session in the user message.

Uploads are abortable and capped by the server; the current client maps HTTP `413` to the 20 MB file-limit message. Draft sessions are promoted before their first submitted turn.

## Testing changes

Run the focused tests while iterating, followed by the complete project gate:

```bash
npm test -- src/protected/chat
npm run check
```

Add tests beside the affected component or utility. Stream changes should cover partial data, terminal data, cancellation, and failure recovery; branching changes should cover both user and AI alternatives.
