// ============================================================
// TurnIndicator.tsx — Shows whose turn it is during battle
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
      <div className="turn-indicator bg-yellow-700 text-white">
        🏆 Game Over
      </div>
    );
  }

  return (
    <div className={`turn-indicator ${isMyTurn ? "my-turn" : "opponent-turn"}`}>
      {isMyTurn
        ? "🎯 Your Turn — Shoot!"
        : `⏳ ${opponentName ?? "Opponent"}'s Turn`}
    </div>
  );
};

export default TurnIndicator;
