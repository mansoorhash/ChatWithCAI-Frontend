import React, {useState} from "react";
import {
  CopyCheck,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import blocksToText from "./utils/blockToText";
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
    regenerate,
}) {
    const { accessToken, updateAccessToken } = useUserID();
    const [isCopied, setIsCopied] = useState(false);
    const [review, setReview] = useState(data.review ?? null);
    
    const handleCopy = async (rawText) => {
        try {
            let text = rawText;
            if (speaker === "ai" && Array.isArray(rawText.blocks)) {
                text = blocksToText(rawText.blocks);
            }

            await navigator.clipboard.writeText(text);

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
        } catch {
            setMessageError('Failed to review message.');
        }
    };

    const onCopy = async () => {
        handleCopy(data.message);
    }
    return (
        <div className="message-meta-row">
            <div className="message-actions">
                {!messageError ? (
                    <>
                    <button disabled={isCopied} className="ds-icon tooltip-wrapper" onClick={onCopy}>
                        {isCopied ? 
                            <CopyCheck size={16}/> : <Copy size={16}/>  
                        }
                        <span className="ds-tooltip">Copy</span>
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
                <button className="ds-icon tooltip-wrapper" onClick={regenerate}>
                    <RotateCcw size={16} />
                    <span className="ds-tooltip">Try again...</span>
                </button>
                }
                    
            </div>

            {speaker === "ai" && data?.model && (
                <div className="model" title={data.model}>
                {catalogDict[data.model] || data.model}
                </div>
            )}
        </div>
  );
}
