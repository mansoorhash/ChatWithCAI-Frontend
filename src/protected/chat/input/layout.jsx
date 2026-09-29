import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Square,
  Plus,
  FileUp,
  FileText,
  LoaderCircle,
  CircleCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import {v4 as uuidv4} from "uuid";
import ChatModelTraining from '../components/modelTraining';
import {
  deleteSessionFileServer,
  uploadSessionFileServer,
} from '../../../api/chat/files';
import { useUserID } from '../../../utils/userIdContext';
import './layout.css';
import './attachments.css'
import { pingChatMessage } from '../../../api/chat/message';

const CHAT_MESSAGE_LIMIT = 20;
const CHAT_LIMIT_REMINDER_THRESHOLD = 8;
const MAX_FILES = 5;

function formatResetLabel(expiration) {
const expirationTimestamp = Number(expiration);
const resetDate =
    Number.isFinite(expirationTimestamp) && expirationTimestamp > 0
    ? new Date(expirationTimestamp * 1000)
    : null;

return resetDate && !Number.isNaN(resetDate.getTime())
    ? resetDate.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
    : null;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatInput({
    chatExpiration,
    chatReady,
    chatTotalCount,
    canSendToSession,
    editValue,
    editedTurn,
    hasSelectedSession,
    messageLoading,
    onEditMessage,
    onSendMessage,
    onStopMessage,
    sessionId,
    setEditValue,
    setEditedTurn,
    setErrorMessage,
    setSuccessMessage,
    setTrainingState,
    showTrainingChoice,
    attachments = [],
    setAttachments,
    onCreateSession,
}) {
    const { accessToken, updateAccessToken} = useUserID();
    const [input, setInput] = useState('');
    const [showAttachment, setShowAttachment] = useState(false);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);
    const activeText = editedTurn !== null ? editValue : input;
    const messagesRemaining = Math.max(
        CHAT_MESSAGE_LIMIT - (Number(chatTotalCount) || 0),
        0,
    );
    const resetLabel = formatResetLabel(chatExpiration);
    const showMessageReminder = messagesRemaining <= CHAT_LIMIT_REMINDER_THRESHOLD;
    const filesBusy = attachments.some(
        (attachment) =>
          attachment.status === "uploading" ||
          attachment.status === "deleting",
    );
    const sendDisabled =
        messageLoading ||
        filesBusy ||
        !chatReady ||
        !canSendToSession ||
        !activeText.trim();

    const attachmentRef = useRef(null);
    const fileInputRef = useRef(null);
    const pingedServer = useRef(false);
    const pingTimeoutRef = useRef(null);

    useEffect(() => {
    if (!showAttachment) return undefined;

    const closeAttachmentMenu = (event) => {
        if (
        event.type === 'keydown' &&
        event.key !== 'Escape'
        ) {
        return;
        }

        if (
        event.type === 'pointerdown' &&
        attachmentRef.current?.contains(event.target)
        ) {
        return;
        }

        setShowAttachment(false);
    };

    document.addEventListener('pointerdown', closeAttachmentMenu);
    document.addEventListener('keydown', closeAttachmentMenu);

    return () => {
        document.removeEventListener('pointerdown', closeAttachmentMenu);
        document.removeEventListener('keydown', closeAttachmentMenu);
    };
    }, [showAttachment]);

    useEffect(() => {
        setShowAttachment(false);
    }, [sessionId]);

    useEffect(() => {
        setInput('');
    }, [sessionId]);

    useEffect(() => {
        return () => {
            if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (editedTurn === null) return undefined;

        const handleOutsideMouseDown = (event) => {
        if (wrapperRef.current?.contains(event.target)) return;
        if (event.target.closest('.message-actions')) return;
        setEditedTurn(null);
        setEditValue('');
        };

        document.addEventListener('mousedown', handleOutsideMouseDown);
        return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [editedTurn, setEditedTurn, setEditValue]);

    useEffect(() => {
        if (editedTurn === null || !inputRef.current) return;

        requestAnimationFrame(() => {
        const element = inputRef.current;
        if (!element) return;
        element.focus();
        const end = element.value.length;
        element.setSelectionRange(end, end);
        });
    }, [editedTurn]);

    useEffect(() => {
        const element = inputRef.current;
        if (!element) return;

        const maxHeight = parseInt(getComputedStyle(element).maxHeight, 10) || 240;
        element.style.height = 'auto';

        if (!activeText) {
        element.style.overflowY = 'hidden';
        return;
        }

        const nextHeight = Math.min(element.scrollHeight, maxHeight);
        element.style.height = `${nextHeight}px`;
        element.style.overflowY =
        element.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [activeText, sessionId]);

    const submitMessage = () => {
        if (sendDisabled) return;

        if (editedTurn !== null) {
        onEditMessage(editedTurn);
        return;
        }

        const message = input.trim();
        setInput('');
        onSendMessage(message);
    };

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        submitMessage();
    };

    const focusMessageInput = (event) => {
        if (event.target.closest('button, a')) return;
        inputRef.current?.focus();
    };

    const handleFileSelection = (event) => {
        console.log(event);
        const files = Array.from(event.target.files || []);

        event.target.value = '';
        setShowAttachment(false);

        if (files.length) {
            void uploadSelectedFiles(files);
        }
    };

    const removeAttachment = async (attachmentKey) => {
        const attachment = attachments.find(
            (item) => (item.localId || item.fileId) === attachmentKey,
        );

        if (!attachment || attachment.status === 'deleting') return;

        if (!attachment.fileId) {
            setAttachments((current) =>
                current.filter(
                    (item) => (item.localId || item.fileId) !== attachmentKey,
                ),
            );
            return;
        }

        setAttachments((current) =>
            current.map((item) =>
                (item.localId || item.fileId) === attachmentKey
                    ? { ...item, status: 'deleting', error: null }
                    : item,
            ),
        );

        try {
            const result = await deleteSessionFileServer(
                attachment.sessionId,
                attachment.fileId,
                accessToken,
                updateAccessToken,
            );

            if (result?.unauthorized) {
                throw new Error('Authentication required.');
            }

            setAttachments((current) =>
                current.filter(
                    (item) => (item.localId || item.fileId) !== attachmentKey,
                ),
            );
        } catch (error) {
            const message =
                error?.body?.detail?.message ||
                error?.message ||
                'The attachment could not be removed.';
            setErrorMessage(message);
            setAttachments((current) =>
                current.map((item) =>
                    (item.localId || item.fileId) === attachmentKey
                        ? { ...item, status: 'failed', error: message }
                        : item,
                ),
            );
        }
    };

    const uploadSelectedFiles = async (selectedFiles) => {
        const availableSlots = Math.max(
            MAX_FILES - attachments.length,
            0,
        );

        if (availableSlots === 0) {
            setErrorMessage('You can only attach up to 5 files.');
            return;
        }

        const filesToUpload = selectedFiles.slice(0, availableSlots);

        if (!filesToUpload.length) return;

        let targetSessionId = sessionId;

        if (!targetSessionId) {
            const createdSession = await onCreateSession?.();
            targetSessionId = createdSession?.id;
        }

        if (!targetSessionId) {
            setErrorMessage('Unable to create a chat session.');
            return;
        }

        const pendingAttachments = filesToUpload.map((file) => ({
            localId: uuidv4(),
            sessionId: targetSessionId,
            file,
            fileId: null,
            name: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            status: 'uploading',
            progress: 0,
            error: null,
        }));

        setAttachments((current) => [
            ...current,
            ...pendingAttachments,
        ]);

        await Promise.allSettled(
            pendingAttachments.map(async (attachment) => {
            try {
                const uploaded = await uploadSessionFileServer(
                hasSelectedSession,
                targetSessionId,
                attachment.file,
                accessToken,
                updateAccessToken,
                (progress) => {
                    setAttachments((current) =>
                    current.map((item) =>
                        item.localId === attachment.localId
                        ? { ...item, progress }
                        : item,
                    ),
                    );
                },
                );

                if (uploaded?.unauthorized) {
                throw new Error('Authentication required.');
                }

                if (!uploaded?.fileId) {
                throw new Error(
                    uploaded?.message || 'Invalid upload response.'
                );
                }

                setAttachments((current) =>
                current.map((item) =>
                    item.localId === attachment.localId
                    ? {
                        ...item,
                        file: null,
                        fileId: uploaded.fileId,
                        name: uploaded.name,
                        mimeType: uploaded.mimeType,
                        sizeBytes: uploaded.sizeBytes,
                        status: 'ready',
                        progress: 100,
                        error: null,
                        }
                    : item,
                ),
                );
            } catch (error) {
                const message =
                    error?.message || "The file could not be uploaded.";

                setErrorMessage(message);

                if (error?.status === 413) {
                    setAttachments((current) =>
                    current.filter(
                        (item) => item.localId !== attachment.localId
                    )
                    );

                    return;
                }

                setAttachments((current) =>
                    current.map((item) =>
                    item.localId === attachment.localId
                        ? {
                            ...item,
                            status: "failed",
                            error: message,
                        }
                        : item
                    )
                );
                }
            }),
        );
    };

    const handleInputChange = (event) => {
        const value = event.target.value;

        if (editedTurn !== null) {
            setEditValue(value);
            return;
        }

        setInput(value);

        if (value.trim()) {
            void handlePingServer();
        }
    };

    const handlePingServer = async () => {
        if (showTrainingChoice) return;
        if (messagesRemaining <= 0) return;
        if (pingedServer.current) return;

        pingedServer.current = true;

        try {
            await pingChatMessage({
                accessToken,
                updateAccessToken,
            });

            pingTimeoutRef.current = setTimeout(() => {
                pingedServer.current = false;
                pingTimeoutRef.current = null;
            }, 20000);
        } catch {
            pingedServer.current = false;
        }
    };


    return (
        <div 
            className="chat-input-wrapper" 
            ref={wrapperRef}
            onPointerEnter={() => {
                void handlePingServer();
            }}
        >
        {!showTrainingChoice && showMessageReminder && (
            <div
            className={`chat-limit-status ${
                messagesRemaining === 0 ? 'limit-reached' : ''
            }`}
            role="status"
            >
            {messagesRemaining === 0 ? (
                <>
                You&apos;ve reached your message limit.
                {resetLabel && (
                    <> You can send more messages after <strong>{resetLabel}</strong>.</>
                )}
                </>
            ) : (
                <>
                You have{' '}
                <strong>
                    {messagesRemaining} message
                    {messagesRemaining === 1 ? '' : 's'} left
                </strong>
                {resetLabel && (
                    <>. Your limit resets <strong>{resetLabel}</strong></>
                )}
                .
                </>
            )}
            </div>
        )}

        <div
            className={`chat-input-bar ${showTrainingChoice ? 'training' : ''} ${
            editedTurn !== null ? 'editing' : ''
            }`}
            role="group"
            aria-label="Message composer"
            onPointerDown={focusMessageInput}
        >
            {!showTrainingChoice && attachments.length > 0 && editedTurn === null && (
                <div
                    className="chat-attachment-list"
                    aria-label="Attached files"
                >
                    {attachments.map((attachment) => {
                    const attachmentKey =
                        attachment.localId || attachment.fileId;

                    return (
                        <div
                        key={attachmentKey}
                        className={`chat-file-card ${attachment.status}`}
                        >
                        <span
                            className="chat-file-icon"
                            aria-hidden="true"
                        >
                            <FileText size={19} />
                        </span>

                        <span className="chat-file-information">
                            <span
                            className="chat-file-name"
                            title={attachment.name}
                            >
                            {attachment.name}
                            </span>

                            <span className="chat-file-status" role="status">
                            {attachment.status === 'uploading' && (
                                <>
                                <LoaderCircle
                                    className="chat-file-spinner"
                                    size={13}
                                />
                                Uploading… {attachment.progress}%
                                </>
                            )}

                            {attachment.status === 'ready' && (
                                <>
                                <CircleCheck size={13} />
                                Uploaded
                                {attachment.sizeBytes
                                    ? ` · ${formatFileSize(
                                        attachment.sizeBytes,
                                    )}`
                                    : ''}
                                </>
                            )}

                            {attachment.status === 'deleting' && (
                                <>
                                <LoaderCircle
                                    className="chat-file-spinner"
                                    size={13}
                                />
                                Removing…
                                </>
                            )}

                            {attachment.status === 'failed' && (
                                <>
                                <TriangleAlert size={13} />
                                {attachment.error}
                                </>
                            )}
                            </span>
                        </span>

                        <button
                            type="button"
                            className="chat-file-remove"
                            onClick={() =>
                            void removeAttachment(attachmentKey)
                            }
                            disabled={
                                attachment.status === 'uploading' ||
                                attachment.status === 'deleting'
                            }
                            aria-label={`Remove ${attachment.name}`}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                        </div>
                    );
                    })}
                </div>
                )}
            {editedTurn !== null && (
            <div className="edit-inline-label">Editing…</div>
            )}

            {showTrainingChoice ? (
            <ChatModelTraining
                setTrainingState={setTrainingState}
                setErrorMessage={setErrorMessage}
                setSuccessMessage={setSuccessMessage}
            />
            ) : (
            <div className="chat-input-row">
                <div className="chat-attachment-wrapper" ref={attachmentRef}>
                    <input
                        id="chat-file-input"
                        className="chat-file-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        multiple
                        onChange={handleFileSelection}
                    />

                    <button
                        type="button"
                        className={`chat-attachment ${
                        showAttachment ? 'active' : ''
                        }`}
                        onClick={() => setShowAttachment((current) => !current)}
                        aria-label="Add attachment"
                        aria-haspopup="menu"
                        aria-expanded={showAttachment}
                    >
                        <Plus size={22} strokeWidth={2} aria-hidden="true" />
                    </button>

                    {showAttachment && (
                        <div className="attachment-menu" role="menu">
                        <button
                            type="button"
                                className="attachment-menu-item"
                                role="menuitem"
                            onClick={() => fileInputRef.current?.click()}
                                >
                                <span className="attachment-menu-icon">
                                    <FileUp size={18} aria-hidden="true" />
                                </span>

                                <span className="attachment-menu-copy">
                                    <strong>Upload files</strong>
                                    <small>PDF, DOCX, TXT or MD</small>
                                </span>
                        </button>
                        </div>
                    )}
                </div>
                <textarea
                    ref={inputRef}
                    className="chat-input scrollbar-custom"
                    value={activeText}
                    onKeyDown={handleKeyDown}
                    onChange={handleInputChange}
                    rows={1}
                    placeholder={
                        hasSelectedSession
                        ? 'How can I help...'
                        : 'What shall we work on today?'
                    }
                />
                <div className="chat-input-actions">
                {messageLoading ? (
                    <button
                    type="button"
                    className="chat-send chat-send-stop"
                    onClick={onStopMessage}
                    aria-label="Stop generating"
                    >
                    <Square
                        size={15}
                        strokeWidth={2}
                        fill="currentColor"
                        aria-hidden="true"
                    />
                    <span className="chat-send-text">Stop</span>
                    </button>
                ) : (
                    <button
                    type="button"
                    className="chat-send"
                    onClick={submitMessage}
                    disabled={sendDisabled}
                    aria-label="Send message"
                    >
                    <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span className="chat-send-text">Send</span>
                    </button>
                )}
                </div>
            </div>
            )}
        </div>
        </div>
    );
}

export default React.memo(ChatInput);
