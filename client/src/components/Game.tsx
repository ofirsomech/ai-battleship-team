// ============================================================
// Game.tsx — Battle phase with naval styling
// ============================================================

import React, { useCallback } from "react";
import type { Board as BoardType, ColIndex, RowIndex } from "@battleship/shared";
import Board from "./Board";
import TurnIndicator from "./TurnIndicator";

interface GameProps {
  ownBoard: BoardType;
  trackingBoard: BoardType;
  currentTurn: string | null;
  playerId: string | null;
  playerName: string | null;
  opponentName: string | null;
  winner: string | null;
  onShoot: (col: ColIndex, row: RowIndex) => void;
  error: string | null;
}

const Game: React.FC<GameProps> = ({
  ownBoard,
  trackingBoard,
  currentTurn,
  playerId,
  playerName,
  opponentName,
  winner,
  onShoot,
  error,
}) => {
  const isMyTurn = currentTurn === playerId && !winner;

  const handleTrackingCellClick = useCallback(
    (col: ColIndex, row: RowIndex) => {
      if (!isMyTurn) return;
      const cell = trackingBoard.grid[row][col];
      if (cell.status === "hit" || cell.status === "miss" || cell.status === "sunk") {
        return; // already shot
      }
      onShoot(col, row);
    },
    [isMyTurn, trackingBoard, onShoot]
  );

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 py-8 px-4">
      <h1
        className="text-2xl font-bold tracking-[0.2em] animate-stamp-reveal"
        style={{
          fontFamily: "'Crimson Text', serif",
          color: "var(--color-brass)",
          textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(201,168,76,0.15)",
        }}
      >
        ⚓ BATTLE STATIONS
      </h1>

      {/* Turn Indicator */}
      <TurnIndicator
        isMyTurn={isMyTurn}
        myName={playerName}
        opponentName={opponentName}
        winner={winner}
      />

      {/* Player labels */}
      <div className="flex gap-16 text-sm">
        <span
          className="font-semibold tracking-[0.1em] uppercase"
          style={{
            fontFamily: "'Crimson Text', serif",
            color: "var(--color-sonar-blue)",
          }}
        >
          {playerName ?? "YOU"}
        </span>
        <span
          className="uppercase tracking-[0.3em]"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: "var(--color-warm-gray-dim)",
          }}
        >
          VS
        </span>
        <span
          className="font-semibold tracking-[0.1em] uppercase"
          style={{
            fontFamily: "'Crimson Text', serif",
            color: "var(--color-copper)",
          }}
        >
          {opponentName ?? "ENEMY"}
        </span>
      </div>

      {/* Boards */}
      <div className="flex flex-col lg:flex-row gap-8">
        <Board
          board={ownBoard}
          label="Your Fleet"
          showShips
        />

        <Board
          board={trackingBoard}
          label="Enemy Waters"
          isTracking
          isMyTurn={isMyTurn}
          onCellClick={handleTrackingCellClick}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="toast-error max-w-sm text-center border px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Legend */}
      <div
        className="flex gap-6 text-xs tracking-[0.08em] uppercase"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: "var(--color-warm-gray)",
        }}
      >
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              background: "radial-gradient(ellipse at center, #2a4a1a 0%, #1a2a0a 100%)",
              border: "1px solid var(--color-radar-green)",
            }}
          />{" "}
          HIT
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              background: "linear-gradient(135deg, #1a1f2a 0%, #141a24 100%)",
              border: "1px solid var(--color-warm-gray-dim)",
            }}
          />{" "}
          MISS
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              background: "linear-gradient(135deg, #1a3a5c 0%, #0f2a44 100%)",
              border: "1px solid var(--color-sonar-blue-dim)",
            }}
          />{" "}
          SHIP
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-4 h-4 rounded-sm"
            style={{
              background: "linear-gradient(135deg, #2a1a0a 0%, #1a1005 100%)",
              border: "2px solid var(--color-brass-dim)",
            }}
          />{" "}
          SUNK
        </span>
      </div>
    </div>
  );
};

export default Game;
