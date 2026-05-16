// ============================================================
// Game.tsx — Battle phase: OwnBoard + TrackingBoard + TurnIndicator
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
      <h1 className="text-2xl font-bold text-blue-400">⚓ Battle!</h1>

      {/* Turn Indicator */}
      <TurnIndicator
        isMyTurn={isMyTurn}
        myName={playerName}
        opponentName={opponentName}
        winner={winner}
      />

      {/* Player labels */}
      <div className="flex gap-16 text-sm">
        <span className="text-blue-400 font-semibold">
          {playerName ?? "You"}
        </span>
        <span className="text-gray-500">vs</span>
        <span className="text-red-400 font-semibold">
          {opponentName ?? "Opponent"}
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
        <div className="bg-red-900 border border-red-600 rounded-lg px-4 py-2 text-sm text-red-200 max-w-sm text-center">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-red-600 rounded-sm" /> Hit
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-gray-600 rounded-sm" /> Miss
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-blue-600 rounded-sm" /> Ship
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-red-900 rounded-sm" /> Sunk
        </span>
      </div>
    </div>
  );
};

export default Game;
