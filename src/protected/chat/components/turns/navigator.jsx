import React from 'react';
import './navigator.css'

export default function TurnNavigator({ turns, activeTurn, onTurnClick }) {
  return (
    <div className="turn-navigator">
        <div className="scrollbar-custom">
            {turns.map((turnData, index) => {
                const turnSeq = turnData.turnSeq ?? index + 1;
                const text = turnData.user?.message ?? "";

                return (
                <button
                    key={turnSeq}
                    className={`turn-nav-item ${
                    activeTurn === turnSeq ? "active" : ""
                    }`}
                    onClick={() => onTurnClick(turnSeq)}
                >
                    <span className="turn-nav-text">
                    {text}
                    </span>
                    <span className="turn-nav-marker" />
                </button>
                );
            })}
        </div>
    </div>
  );
}