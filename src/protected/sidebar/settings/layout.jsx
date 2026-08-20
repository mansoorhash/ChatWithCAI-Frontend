// SettingsLayout.jsx
import React, { useEffect, useState } from "react";
import { User, Database, Settings, Calendar, Route } from "lucide-react";

import General from "./general";
import LLMselection from "./LLMselection";
import Account from "./account";
import Subscription from "./subscription";
import DataControls from "./privacy";
import { fetchModelTraining } from "../../../api/user/datacontrol";
import { useUserID } from "../../../utils/userIdContext";

import "./layout.css";
import "./subscription.css";

const SECTIONS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "LLMselection", label: "Model Selection", Icon: Route },
  { id: "dataControls", label: "Data Controls", Icon: Database },
  { id: "account", label: "Account", Icon: User },
  { id: "subscription", label: "Subscription", Icon: Calendar },
];

export default function SettingsLayout({
  setErrorMessage,
  onClose,
  account,
  setAccount,
  subscription,
  catalog,
  allModels,
  trainingState,
  setTrainingState
}) {
  const [selected, setSelected] = useState("general");
  const [isDirty, setIsDirty] = useState(false);
  const { getAccessToken, updateAccessToken } = useUserID();

  const selectSection = (nextSection) => {
    if (nextSection === selected) return;

    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }

    setIsDirty(false);
    setSelected(nextSection);
  };

  const closeSettings = () => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }

    onClose();
  };

  useEffect(() => {
    const preventUnload = (event) => {
      if (!isDirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventUnload);

    return () => {
      window.removeEventListener("beforeunload", preventUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    const ctrl = new AbortController();
    const fetchDataControls = async () => {
      try {
        const res = await fetchModelTraining(
          ctrl.signal,
          getAccessToken(),
          updateAccessToken,
        );
        setTrainingState(res.status);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setErrorMessage("Failed to load data-control settings.");
        }
      }
    };

    fetchDataControls();
    return () => ctrl.abort();
  }, [getAccessToken, setErrorMessage, setTrainingState, updateAccessToken])

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <button
          type="button"
          className="settings-close"
          onClick={closeSettings}
          aria-label="Close settings"
        >
          ✕
        </button>

        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            className={`settings-item ${selected === id ? "active" : ""}`}
            onClick={() => selectSection(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        {selected === "general" && (
          <General />
        )}

        {selected === "LLMselection" && (
          <LLMselection
            catalog={catalog}
          />
        )}

        {selected === "dataControls" && (
          <DataControls
            setErrorMessage={setErrorMessage}
            trainingState={trainingState}
            setTrainingState={setTrainingState}
            onDirtyChange={setIsDirty}
          />
        )}

        {selected === "account" && (
          <Account
            account={account}
            setAccount={setAccount}
            onDirtyChange={setIsDirty}
          />
        )}

        {selected === "subscription" && (
          <Subscription
            subscription={subscription}
            catalog={catalog}
            allModels={allModels}
            onDirtyChange={setIsDirty}
          />
        )}
      </div>
    </div>
  );
}
