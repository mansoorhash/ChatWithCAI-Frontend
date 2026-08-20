import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./modelTraining.css";
import { useUserID } from "../../../utils/userIdContext";
import { updateModelTraining } from "../../../api/user/datacontrol";

export default function ChatModelTraining({
    setTrainingState,
    setErrorMessage,
    setSuccessMessage
}) {
    const { accessToken, updateAccessToken } = useUserID();
    const [saving, setSaving] = useState(false);

    const handleSelectTraining = async (status) => {
        if (saving) return;

        setSaving(true);
        const ctrl = new AbortController();
        try {
        await updateModelTraining(ctrl.signal, accessToken, updateAccessToken, {status})
        setTrainingState(status);
        setSuccessMessage("Model training selection updated.")
        } catch (err) {
            const status_code = err?.status_code;
            setTrainingState(null)
            if (status_code === 429) {
                setErrorMessage(err?.detail);
            } else {
                setErrorMessage(err?.detail?.message, "Failed to update model training.");
            }
        } finally {
        setSaving(false);
        }
    };

    return (
        <div className="chat-model-training">
        <div className="chat-model-training__text">
            Allow CAI to review and use selected conversations to improve its models?{" "}
            <Link
            className="chat-model-training__link"
            to="/privacy#how-do-we-process-your-information"
            replace
            >
            Learn more
            </Link>
        </div>

        <div className="chat-model-training__actions">
            <button
            type="button"
            className="chat-model-training__button chat-model-training__enable"
            onClick={() => handleSelectTraining(true)}
            disabled={saving}
            >
            Enable
            </button>

            <button
            type="button"
            className="chat-model-training__button chat-model-training__disable"
            onClick={() => handleSelectTraining(false)}
            disabled={saving}
            >
            Disable
            </button>
        </div>
        </div>
    );
}
