import React from "react";
import MessageRender from "./messageRender";
import MessageActions from "./messageActions";
import "./messages.css";
import { ChevronsDown } from "lucide-react";

function Messages({
  turns,
  editedTurn,
  setEditedTurn,
  editValue,
  setEditValue,
  sessionId,
  catalogDict,
  messageProcessing,
  setMessageError,
  regenerate,
  continueMessage,
  feedbackPromptTurnSeq,
  dismissFeedbackPrompt,
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
            <div 
              key={t.turnSeq}
              id={`turn-${t.turnSeq}`}
              data-turn={t.turnSeq}
              className={`chat-msg user ${editedTurn === i ? 'editing-target' : ''}`}
            >
              <MessageRender
                speaker="user"
                data={t.user}
              />
              <MessageActions
                speaker="user"
                messageProcessing={messageProcessing}
                data={t.user}
                turnIndex={i}
                sessionId={sessionId}
                editedTurn={editedTurn}
                setEditedTurn={setEditedTurn}
                editValue={editValue}
                setEditValue={setEditValue}
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
              {t?.ai?.continuation?.id && (
                <div className="continuation-row">
                  <button
                    type="button"
                    className="continue-response"
                    disabled={messageProcessing || t?.ai?.continuation?.loading}
                    aria-busy={t?.ai?.continuation?.loading}
                    onClick={() => {
                      if (t?.ai?.continuation?.id) {
                        continueMessage(t.turnSeq, t.ai.continuation.id);
                      }
                    }}
                  >
                    {!t?.ai?.continuation?.loading && (
                      <ChevronsDown className="continue-chevron" size={14} strokeWidth={2} aria-hidden="true" />
                    )}

                    {t?.ai?.continuation?.loading
                      ? <div className="processing-status">
                          Continuing…
                        </div>
                      : "Continue response"}
                  </button>

                  {t?.ai?.continuation?.error && (
                    <span className="continuation-error" role="status">
                      {t.ai.continuation.error}
                    </span>
                  )}
                </div>
              )}
              {!processing && (
                <MessageActions 
                  speaker={"ai"}
                  data={t.ai}
                  sessionId={sessionId}
                  catalogDict={catalogDict}
                  messageError={messageError}
                  setMessageError={setMessageError}
                  regenerationOptions={t.user?.alternativeModels}
                  regenerate={(rank) =>
                    regenerate(t.user.message, t.turnSeq, rank)
                  }
                  showFeedbackPrompt={feedbackPromptTurnSeq === t.turnSeq}
                  dismissFeedbackPrompt={dismissFeedbackPrompt}
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
