// ============================================================
// GameOverModal.tsx — Brass-framed end-of-game overlay
// ============================================================

import React from "react";

interface GameOverModalProps {
  winner: string;
  myPlayerId: string | null;
  myName: string | null;
  opponentName: string | null;
  reason?: string;
  onPlayAgain: () => void;
  playAgainRequested: boolean;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  myPlayerId,
  myName,
  opponentName,
  reason,
  onPlayAgain,
  playAgainRequested,
}) => {
  const iWon = winner === myPlayerId;

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h2
          className="text-3xl font-bold mb-4 animate-stamp-reveal"
          style={{
            color: iWon ? "var(--color-brass)" : "var(--color-copper)",
            textShadow: iWon
              ? "0 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(201,168,76,0.25)"
              : "0 2px 4px rgba(0,0,0,0.6), 0 0 12px rgba(184,115,51,0.2)",
          }}
        >
          {iWon ? "⚓ VICTORY" : "SUNK"}
        </h2>

        <p
          className="text-lg mb-2 font-['Crimson_Text']"
          style={{ color: "var(--color-warm-gray-bright)" }}
        >
          {iWon
            ? `Admiral ${myName} — fleet triumphant.`
            : `${opponentName ?? "The enemy"} has destroyed your fleet.`}
        </p>

        {reason === "forfeit" && (
          <p
            className="text-sm mb-4 font-['DM_Mono']"
            style={{ color: "var(--color-brass)" }}
          >
            VICTORY BY FORFEIT — OPPONENT DISENGAGED
          </p>
        )}
        {reason === "allSunk" && (
          <p
            className="text-sm mb-4 font-['DM_Mono']"
            style={{ color: "var(--color-warm-gray)" }}
          >
            ALL VESSELS DESTROYED
          </p>
        )}

        <hr className="brass-rule my-5" />

        <button
          className={`btn w-full ${playAgainRequested ? "btn-secondary" : "btn-primary"}`}
          onClick={onPlayAgain}
          disabled={playAgainRequested}
        >
          {playAgainRequested ? "AWAITING REMATCH..." : "ENGAGE AGAIN"}
        </button>

        {playAgainRequested && (
          <p
            className="text-xs mt-3 font-['DM_Mono']"
            style={{ color: "var(--color-warm-gray-dim)" }}
          >
            Standing by for opponent&rsquo;s confirmation…
          </p>
        )}
      </div>
    </div>
  );
};

export default GameOverModal;
