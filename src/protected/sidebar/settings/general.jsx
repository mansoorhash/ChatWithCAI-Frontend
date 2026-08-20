import React from "react";
import { useTheme } from "../../../utils/themeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import './general.css'

export default function General() {
  const { themePref, setThemePref } = useTheme();

  const options = [
    { key: "light", label: "Light", Icon: Sun },
    { key: "dark", label: "Dark", Icon: Moon },
    { key: "system", label: "System", Icon: Monitor },
  ];

  return (
    <div className="sub-wrap">
      <div className="sub-header">General</div>
      {/* Appearance */ }
      <div className="sep"></div>
      <div className="sub-content">
        <div className="row">
          <div className="left">
            <div className="title">
              <p>Appearance</p>
            </div>
          </div>

          <div className="right">
            <div className="strong">
              <div className="theme-toggle" role="group" aria-label="Theme">
                {options.map(({ key, label, Icon }) => {
                  const selected = themePref === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`theme-btn ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      aria-label={`${label} theme`}
                      title={`${label} theme`}
                      onClick={() => setThemePref(key)}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
              
      {/* Language - Needs to be configured*/}
      {/*
      <div className="row">
        <div className="left">
          <div className="title">
            <p>Language</p>
          </div>
        </div>

        <div className="right">
          <div className="strong">
            <div className="theme-toggle" role="group" aria-label="Theme">
              {options.map(({ key, label, Icon }) => {
                const selected = themePref === key;
                return (
                  <div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      */}
    </div>
  );
}
