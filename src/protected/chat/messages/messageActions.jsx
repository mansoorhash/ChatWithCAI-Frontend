import React, {useEffect, useRef, useState} from "react";
import {
  CopyCheck,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  X,
} from "lucide-react";
import blocksToText from "./utils/blockToText";
import copyToClipboard from "./utils/copyToClipboard";
import "./messageActions.css";
import { useUserID } from "../../../utils/userIdContext";
import { updateMessageReview } from "../../../api/chat/message";

export default function MessageActions({
    data,
    speaker,
    sessionId,
    catalogDict,
    messageError,
    setMessageError,
    regenerationOptions = [],
    regenerate,
    showFeedbackPrompt = false,
    dismissFeedbackPrompt,
}) {
    const { accessToken, updateAccessToken } = useUserID();
    const [isCopied, setIsCopied] = useState(false);
    const [review, setReview] = useState(data.review ?? null);
    const [showRegenerateMenu, setShowRegenerateMenu] = useState(false);
    const regenerateMenuRef = useRef(null);

    const rankedModels = (Array.isArray(regenerationOptions)
        ? regenerationOptions
        : [])
        .map((option) => {
            const modelId = option?.model;
            const rank = Number(option?.rank);

            return {
                rank,
                modelId,
                label: catalogDict?.[modelId] || modelId,
            };
        })
        .filter((option) =>
            Number.isInteger(option.rank) &&
            option.rank > 0 &&
            typeof option.modelId === "string" &&
            option.modelId.length > 0
        );

    const currentModelRank = rankedModels.find(
        (option) => option.modelId === data?.model
    )?.rank ?? null;

    const alternativeModels = rankedModels
        .filter((option) => option.modelId !== data?.model);
    const hasAlternativeModels = alternativeModels.length > 0;

    useEffect(() => {
        if (!showRegenerateMenu) return undefined;

        const closeOnOutsideClick = (event) => {
            if (!regenerateMenuRef.current?.contains(event.target)) {
                setShowRegenerateMenu(false);
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setShowRegenerateMenu(false);
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [showRegenerateMenu]);

    const onRegenerate = (rank = null) => {
        setShowRegenerateMenu(false);
        regenerate(rank);
    };
    
    const handleCopy = async (rawText) => {
        try {
            let text = rawText;
            if (speaker === "ai" && Array.isArray(rawText?.blocks)) {
                text = blocksToText(rawText.blocks);
            }

            await copyToClipboard(text);

            setIsCopied(true);
            setTimeout(() => {
            setIsCopied(false);
            }, 2000)
        } catch (error) {
            console.error("Unable to copy message:", error);
        }
    };

    const onReview = async (option) => {
        if (!option) return
        const nextReview = review === option ? null : option;

        setMessageError(null);
        console.log("Updating")
        try {
            const res = await updateMessageReview(
            nextReview,
            sessionId,
            data.messageId,
            accessToken,
            updateAccessToken,
            );

            if (!res.ok) {
            setMessageError('Failed to review message.');
            return;
            }

            setReview(nextReview);
            if (nextReview) dismissFeedbackPrompt?.();
        } catch {
            setMessageError('Failed to review message.');
        }
    };

    const onCopy = async () => {
        await handleCopy(data.message);
    }
    return (
      <>
        {speaker === "ai" && showFeedbackPrompt && review === null && (
          <div className="feedback-prompt" role="status">
            <span>Help us improve: was this response helpful?</span>
            <button
              type="button"
              className="feedback-prompt-close"
              onClick={dismissFeedbackPrompt}
              aria-label="Dismiss feedback request"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="message-meta-row">
            <div className="message-actions">
                {!messageError ? (
                    <>
                    <button type="button" disabled={isCopied} className="ds-icon tooltip-wrapper" onClick={onCopy}>
                        {isCopied ? 
                            <CopyCheck size={16}/> : <Copy size={16}/>  
                        }
                        <span className="ds-tooltip">{isCopied ? "Copied" : "Copy"}</span>
                    </button>

                    {speaker === "ai" ? 
                    <>
                        <button
                            type="button"
                            className="ds-icon tooltip-wrapper"
                            aria-pressed={review === 'like'}
                            onClick={() => onReview('like')}
                        >
                            <ThumbsUp
                                size={16}
                                fill={review === 'like' ? 'currentColor' : 'none'}
                            />
                            <span className="ds-tooltip">Like</span>
                        </button>

                        <button
                            type="button"
                            className="ds-icon tooltip-wrapper"
                            aria-pressed={review === 'dislike'}
                            onClick={() => onReview('dislike')}
                        >
                            <ThumbsDown
                                size={16}
                                fill={review === 'dislike' ? 'currentColor' : 'none'}
                            />
                            <span className="ds-tooltip">Dislike</span>
                        </button>
                    </>
                    : null
                    }
                    </>
                ): null}
                {speaker ==="ai" &&
                <div className="regenerate-menu-wrapper" ref={regenerateMenuRef}>
                    <button
                        type="button"
                        className="ds-icon tooltip-wrapper"
                        onClick={() => {
                            if (!hasAlternativeModels) {
                                onRegenerate(currentModelRank);
                                return;
                            }
                            setShowRegenerateMenu((open) => !open);
                        }}
                        aria-label="Try again..."
                        aria-haspopup={hasAlternativeModels ? "menu" : undefined}
                        aria-expanded={
                            hasAlternativeModels ? showRegenerateMenu : undefined
                        }
                    >
                        <RotateCcw size={16} aria-hidden="true" />
                        {!showRegenerateMenu && (
                            <span className="ds-tooltip">Try again...</span>
                        )}
                    </button>

                    {showRegenerateMenu && hasAlternativeModels && (
                        <div
                            className="regenerate-menu"
                            role="menu"
                            aria-label="Regenerate response"
                        >
                            <button
                                type="button"
                                className="regenerate-menu-item regenerate-menu-default"
                                role="menuitem"
                                onClick={() => onRegenerate(currentModelRank)}
                            >
                                <RotateCcw size={15} aria-hidden="true" />
                                <span>Try again...</span>
                            </button>

                            {alternativeModels.length > 0 && (
                                <>
                                    <div
                                        className="regenerate-menu-divider"
                                        role="separator"
                                    />
                                    <div className="regenerate-menu-label">
                                        Try Another Model
                                    </div>
                                </>
                            )}

                            {alternativeModels.map((option) => (
                                <button
                                    type="button"
                                    className="regenerate-menu-item regenerate-menu-model"
                                    role="menuitem"
                                    key={option.rank}
                                    onClick={() => onRegenerate(option.rank)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                }
                    
            </div>

            {speaker === "ai" && data?.model && (
                <div className="model" title={data.model}>
                {catalogDict[data.model] || data.model}
                </div>
            )}
        </div>
      </>
  );
}
