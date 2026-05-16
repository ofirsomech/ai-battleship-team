// ============================================================
// GameOverModal.tsx — End-of-game overlay with Play Again
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
        <h2 className="text-3xl font-bold mb-4">
          {iWon ? "🎉 Victory!" : "💀 Defeat"}
        </h2>

        <p className="text-lg mb-2">
          {iWon
            ? `You (${myName}) won the battle!`
            : `${opponentName ?? "Opponent"} won the battle!`}
        </p>

        {reason === "forfeit" && (
          <p className="text-sm text-yellow-400 mb-4">
            Opponent disconnected — win by forfeit.
          </p>
        )}
        {reason === "allSunk" && (
          <p className="text-sm text-gray-400 mb-4">
            All ships have been sunk.
          </p>
        )}

        <hr className="border-gray-600 my-4" />

        <button
          className={`btn w-full ${playAgainRequested ? "btn-secondary" : "btn-primary"}`}
          onClick={onPlayAgain}
          disabled={playAgainRequested}
        >
          {playAgainRequested ? "Waiting for opponent..." : "Play Again"}
        </button>

        {playAgainRequested && (
          <p className="text-xs text-gray-500 mt-2">
            Rematch requested — waiting for opponent to also click Play Again.
          </p>
        )}
      </div>
    </div>
  );
};

export default GameOverModal;
