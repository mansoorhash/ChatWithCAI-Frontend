import React from "react";
import MessageRender from "./messageRender";
import MessageActions from "./messageActions";
import "./messages.css";

function Messages({
  turns,
  editedTurn,
  sessionId,
  catalogDict,
  messageProcessing,
  setMessageError,
  regenerate
}) {

  return (
    <>
      {turns.map((t, i) => {
        const aiMessage = t?.ai?.message;
        const messageError = typeof aiMessage === "string" && t?.ai?.error;
        const processing = messageProcessing && i === turns.length - 1;
        return (
        <React.Fragment key={i}>
          {/* USER MESSAGE */}
          {t?.user?.message && (
            <div className={`chat-msg user ${editedTurn === i ? 'editing-target' : ''}`}>
              <MessageRender
                speaker="user"
                data={t.user}
              />
              <MessageActions
                speaker="user"
                data={t.user}
                sessionId={sessionId}
              />

            </div>
          )}

          {/* AI MESSAGE */}
          {t?.ai?.message? (
            <div className={`chat-msg ai ai-bubble ${t?.ai?.error ? "error" : null}`}>
              <MessageRender
                speaker="ai"
                data={t.ai}
                messageProcessing={processing}
              />
              {!processing && (
                <MessageActions 
                  speaker={"ai"}
                  data={t.ai}
                  sessionId={sessionId}
                  catalogDict={catalogDict}
                  messageError={messageError}
                  setMessageError={setMessageError}
                  regenerate={() => regenerate(t.user.message, t.turnSeq)}
                />
              )}
            </div>
          ) : processing ? (
            <div className={`chat-msg ai ai-bubble ${t?.ai?.error ? "error" : null}`}>
              <MessageRender
                  speaker="ai"
                  data={t.ai}
                  messageProcessing={processing}
                />
            </div>
          ) : null}
        </React.Fragment>
      )})}
    </>
  );
}

export default React.memo(Messages);
