// ============================================================
// TurnIndicator.tsx — Gauge-style turn indicator
// ============================================================

import React from "react";

interface TurnIndicatorProps {
  isMyTurn: boolean;
  myName: string | null;
  opponentName: string | null;
  winner: string | null;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  isMyTurn,
  myName,
  opponentName,
  winner,
}) => {
  if (winner) {
    return (
      <div className="turn-indicator game-over">
        ⚓ BATTLE CONCLUDED
      </div>
    );
  }

  return (
    <div className={`turn-indicator ${isMyTurn ? "my-turn" : "opponent-turn"}`}>
      {isMyTurn
        ? `◉ FIRE — YOUR TURN`
        : `◌ ${opponentName ?? "ENEMY"} TURN`}
    </div>
  );
};

export default TurnIndicator;
