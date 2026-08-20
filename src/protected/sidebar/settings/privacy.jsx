import React, { useState } from "react";
import { Info } from "lucide-react";
import { updateModelTraining } from "../../../api/user/datacontrol";
import { useUserID } from "../../../utils/userIdContext";
import './general.css'

export default function DataControls({
    trainingState,
    setErrorMessage,
}) {
    const [showModelTraining, setShowModelTraining] = useState(false);
    const [modelTraining, setModelTraining] = useState(trainingState ?? false);
    const { accessToken, updateAccessToken } = useUserID();

    const handleModelTraining = async () => {
        const ctrl = new AbortController();
        const status = !modelTraining;
        setModelTraining(status);
        try {
            await updateModelTraining(ctrl.signal, accessToken, updateAccessToken, {status})
        } catch (err) {
            const status_code = err?.status_code;
            setModelTraining(!status)
            if (status_code === 429) {
                setErrorMessage(err?.detail);
            } else {
                setErrorMessage(err?.detail?.message, "Failed to update model training.");
            }
        }
    };
    return (
        <div className="sub-wrap">
        <div className="sub-header">Data Controls</div>
        <div className="sep"></div>
        <div className="sub-content">
            <div className="row">
            <div className="left">
                <div
                className="title info-popup-wrapper"
                onMouseLeave={() => setShowModelTraining(false)}
                >
                <label className="info-popup-label">
                    Allow model training

                    <span
                    className="info-trigger"
                    onClick={() => setShowModelTraining((current) => !current)}
                    onMouseEnter={() => setShowModelTraining(true)}
                    aria-expanded={showModelTraining}
                    >
                    <Info size={15} />
                    </span>
                </label>

                {showModelTraining && (
                    <div className="info-popup-container">
                    <p>
                        Allows your conversations to be used 
                        to improve CAI's model and services.
                    </p>
                    </div>
                )}
                </div>
            </div>

            <div className="right">
                <label className="switch">
                    <input
                    type="checkbox"
                    checked={modelTraining}
                    onChange={handleModelTraining}
                    />
                    <span className="slider"/>
                </label>
            </div>
            </div>
        </div>
        </div>
    );
}
