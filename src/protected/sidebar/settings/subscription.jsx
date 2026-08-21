import React, { useMemo, useState } from "react";
import "./subscription.css";

export default function Subscription({ 
  subscription, 
  catalog = {}, 
  allModels = [],
}) {
  const sub = subscription;
  const tier = String(sub?.tier || "free").toLowerCase();

  // Dates
  const expires = useMemo(() => new Date(sub?.expiresAt || 0), [sub?.expiresAt]);
  const renewal = useMemo(() => new Date(sub?.renewalAt || 0), [sub?.renewalAt]);

  // "true"/true → boolean
  const autoRenew = String(sub?.renew).toLowerCase() === "true";

  // Expand/collapse for the pills
  const [open, setOpen] = useState({ unlocked: false, locked: false });

  // --- Ends in (months/weeks/days) ---
  const diffMs = Math.max(0, expires.getTime() - Date.now());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const timeLeft =
    diffMonths >= 1
      ? `${diffMonths} month${diffMonths > 1 ? "s" : ""}`
      : diffWeeks >= 1
      ? `${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`
      : `${diffDays} day${diffDays !== 1 ? "s" : ""}`;

  const dateString = (date) => {
    const stringDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }); 
    return stringDate
  }
  // ---------- Catalog -> unlocked / locked ----------
  const tierOrder = useMemo(() => ["free", "plus", "pro"], []);

  const tierIndex = useMemo(() => {
    const idx = tierOrder.indexOf(String(tier || "").toLowerCase());
    return idx === -1 ? 0 : idx;
  }, [tier, tierOrder]);

  const unlockedSet = useMemo(() => {
    const names = tierOrder
      .slice(0, tierIndex + 1)
      .flatMap((t) => (catalog?.[t] || []))
      .map((m) => (typeof m === "string" ? m : m?.name || m?.label))
      .filter(Boolean);

    return new Set(names);
  }, [catalog, tierIndex, tierOrder]);

  const unlockedModels = useMemo(() => {
    return Array.from(unlockedSet).sort((a, b) => a.localeCompare(b));
  }, [unlockedSet]);

  const lockedModels = useMemo(() => {
    return allModels.filter((m) => !unlockedSet.has(m));
  }, [allModels, unlockedSet]);

  const unlockedCount = unlockedModels.length;
  const lockedCount = lockedModels.length;

  const toggleUnlocked = () =>
    setOpen((p) => ({ ...p, unlocked: !p.unlocked }));
  const toggleLocked = () => setOpen((p) => ({ ...p, locked: !p.locked }));

  return (
    <div className="sub-wrap subscription-settings">
      <div className="sub-header">Subscription</div>
      <div className="sep"></div>
      <div className="sub-content scrollbar-custom">
        {tier && (
          <div>
            <div>
              <div className="title">Current Tier: {tier.toUpperCase()}</div>
              <div className="subline">
                {tier === "free"
                  ? "Upgrade to unlock more models."
                  : "Your current model access."}
              </div>
            </div>

            <div className="model-summary">
              {/* Unlocked */}
              <div className="model-section">
                <div className={`model-summary-row ${open.unlocked ? "is-open" : ""}`}>
                  {tier === "pro" ? (
                    <span className="label">
                      All Models Are Unlocked
                    </span>
                    ) : (
                    <span className="label">
                      Unlocked models
                    </span>
                  )}
                  
                  

                  <span className="rightpack">
                    <span className="value">{unlockedCount}</span>
                    <button
                      type="button"
                      className="chev"
                      aria-label={
                        open.unlocked
                          ? "Collapse unlocked models"
                          : "Expand unlocked models"
                      }
                      aria-expanded={open.unlocked}
                      onClick={toggleUnlocked}
                      disabled={unlockedCount === 0}
                      title={unlockedCount === 0 ? "No unlocked models" : ""}
                    >
                      {open.unlocked ? "▲" : "▼"}
                    </button>
                  </span>
                </div>

                {open.unlocked && unlockedCount > 0 && (
                  <div className="pill-panel">
                    {unlockedModels.map((name) => (
                      <span key={`u-${name}`} className="pill">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Locked */}
              <div className="model-section">
                <div
                  className={`model-summary-row locked ${
                    open.locked ? "is-open" : ""
                  }`}
                >
                  {tier === "pro" ? (
                    <span className="label">
                      No Locked models
                    </span>
                    ) : (
                    <span className="label">
                      Locked models
                    </span>
                  )}

                  <span className="rightpack">
                    <span className="value">{lockedCount}</span>
                    <button
                      type="button"
                      className="chev"
                      aria-label={
                        open.locked
                          ? "Collapse locked models"
                          : "Expand locked models"
                      }
                      aria-expanded={open.locked}
                      onClick={toggleLocked}
                      disabled={lockedCount === 0}
                      title={lockedCount === 0 ? "No locked models" : ""}
                    >
                      {open.locked ? "▲" : "▼"}
                    </button>
                  </span>
                </div>

                {open.locked && lockedCount > 0 && (
                  <div className="pill-panel">
                    {lockedModels.map((name) => (
                      <span key={`l-${name}`} className="pill pill-locked">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {tier !== "free" && (
          <div className="row sep renewal-row" style={{ marginTop: 14 }}>
            <div className="left">
              <div className="title">Ends in</div>
              <div className="subline">
                {autoRenew ? `Renewal on ${dateString(renewal)}` : 
                `Subscription cancelling ${dateString(expires)}`}
              </div>
            </div>
            <div className="right">
              <div className="date">{timeLeft}</div>
            </div>
          </div>
        )}
        
      </div>

      <div className="sub-footer">
        <div className="sub-actions">
          <div className="left">
            <button className="upgrade">View Tiers</button>
          </div>
        </div>
      </div>
    </div>
  );
}
