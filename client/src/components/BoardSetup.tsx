// ============================================================
// BoardSetup.tsx — Ship placement phase (drag-and-drop, randomize, Ready)
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { ShipType, ShipPlacement, ColIndex, RowIndex, Orientation, Board as BoardType } from "@battleship/shared";
import { SHIP_LENGTHS } from "@battleship/shared";
import { createEmptyBoard } from "../store";
import Board from "./Board";
import ShipPalette from "./ShipPalette";

interface BoardSetupProps {
  ownBoard: BoardType;
  opponentReady: boolean;
  onPlaceShips: (ships: ShipPlacement[]) => void;
  onRandomize: (callback: (placements: ShipPlacement[]) => void) => void;
  onReady: () => void;
}

const SHIP_TYPES: ShipType[] = [
  "Carrier",
  "Battleship",
  "Cruiser",
  "Submarine",
  "Destroyer",
];

/**
 * Check if a placement is valid (no overlap, within bounds)
 */
function isValidPlacement(
  board: BoardType,
  shipType: ShipType,
  col: ColIndex,
  row: RowIndex,
  orientation: Orientation
): boolean {
  const length = SHIP_LENGTHS[shipType];
  const cells: Array<{ col: ColIndex; row: RowIndex }> = [];

  for (let i = 0; i < length; i++) {
    const c = orientation === "horizontal" ? col + i : col;
    const r = orientation === "vertical" ? row + i : row;
    if (c < 0 || c > 9 || r < 0 || r > 9) return false;
    cells.push({ col: c as ColIndex, row: r as RowIndex });
  }

  return cells.every(({ col: c, row: r }) => {
    const cell = board.grid[r][c];
    return cell.status !== "ship";
  });
}

/**
 * Place a ship on a board (mutates in a controlled way)
 */
function placeShipOnBoard(
  board: BoardType,
  shipType: ShipType,
  col: ColIndex,
  row: RowIndex,
  orientation: Orientation
): BoardType {
  const length = SHIP_LENGTHS[shipType];
  const newGrid = board.grid.map((r) => [...r]);

  for (let i = 0; i < length; i++) {
    const c = orientation === "horizontal" ? col + i : col;
    const r = orientation === "vertical" ? row + i : row;
    newGrid[r][c] = {
      status: "ship",
      shipType,
    };
  }

  return { grid: newGrid };
}

/**
 * Remove all cells belonging to a ship type from the board
 */
function removeShipFromBoard(board: BoardType, shipType: ShipType): BoardType {
  const newGrid = board.grid.map((row) =>
    row.map((cell) => {
      if (cell.shipType === shipType) {
        return { status: "empty" as const };
      }
      return { ...cell };
    })
  );
  return { grid: newGrid };
}

const BoardSetup: React.FC<BoardSetupProps> = ({
  ownBoard,
  opponentReady,
  onPlaceShips,
  onRandomize,
  onReady,
}) => {
  const [placingShip, setPlacingShip] = useState<ShipType | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [placedShips, setPlacedShips] = useState<Map<ShipType, ShipPlacement>>(new Map());
  const [previewCells, setPreviewCells] = useState<Set<string>>(new Set());
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const boardRef = useRef<BoardType>(ownBoard);

  // Sync with externally set board (e.g., from randomize callback)
  useEffect(() => {
    boardRef.current = ownBoard;
    // Rebuild placedShips from ownBoard
    const newPlaced = new Map<ShipType, ShipPlacement>();
    for (const shipType of SHIP_TYPES) {
      // Find ship positions on board
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          const cell = ownBoard.grid[row][col];
          if (cell.status === "ship" && cell.shipType === shipType) {
            // Skip if already found for this ship type — record only the FIRST cell as start position
            if (newPlaced.has(shipType)) continue;

            // Determine orientation by checking adjacent cell
            const isHorizontal =
              col < 9 && ownBoard.grid[row][col + 1]?.shipType === shipType;
            const isVertical =
              row < 9 && ownBoard.grid[row + 1]?.[col]?.shipType === shipType;
            const orient: Orientation = isHorizontal ? "horizontal" : isVertical ? "vertical" : "horizontal";

            newPlaced.set(shipType, {
              shipType,
              start: { col: col as ColIndex, row: row as RowIndex },
              orientation: orient,
            });
          }
        }
      }
    }
    if (newPlaced.size > 0) {
      setPlacedShips(newPlaced);
    }
  }, [ownBoard]);

  // Update boardRef and emit placements when placedShips changes
  const updateBoardAndEmit = useCallback(
    (ships: Map<ShipType, ShipPlacement>) => {
      let board = createEmptyBoard();
      for (const [, placement] of ships) {
        board = placeShipOnBoard(
          board,
          placement.shipType,
          placement.start.col,
          placement.start.row,
          placement.orientation
        );
      }
      boardRef.current = board;
      onPlaceShips(Array.from(ships.values()));
    },
    [onPlaceShips]
  );

  const handlePlaceShip = useCallback(
    (shipType: ShipType, col: ColIndex, row: RowIndex) => {
      const newShips = new Map(placedShips);

      // Remove previous placement of this ship type if exists
      if (newShips.has(shipType)) {
        newShips.delete(shipType);
      }

      if (isValidPlacement(boardRef.current, shipType, col, row, orientation)) {
        const placement: ShipPlacement = {
          shipType,
          start: { col, row },
          orientation,
        };
        newShips.set(shipType, placement);

        // Update the board
        let board = createEmptyBoard();
        // Re-add all non-this-ship ships
        for (const [, p] of newShips) {
          if (p.shipType !== shipType) {
            board = placeShipOnBoard(board, p.shipType, p.start.col, p.start.row, p.orientation);
          }
        }
        // Add this ship
        board = placeShipOnBoard(board, shipType, col, row, orientation);
        boardRef.current = board;
      }

      setPlacedShips(newShips);
      setPlacingShip(null);
      setPreviewCells(new Set());
      updateBoardAndEmit(newShips);
    },
    [placedShips, orientation, updateBoardAndEmit]
  );

  const handleCellClick = useCallback(
    (col: ColIndex, row: RowIndex) => {
      if (placingShip) {
        handlePlaceShip(placingShip, col, row);
      }
    },
    [placingShip, handlePlaceShip]
  );

  const handleCellDragOver = useCallback(
    (e: React.DragEvent, col: ColIndex, row: RowIndex) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const shipType = e.dataTransfer.getData("shipType") as ShipType;
      if (!shipType) return;

      // Calculate preview cells
      const length = SHIP_LENGTHS[shipType];
      const preview = new Set<string>();
      for (let i = 0; i < length; i++) {
        const pc = orientation === "horizontal" ? col + i : col;
        const pr = orientation === "vertical" ? row + i : row;
        if (pc >= 0 && pc <= 9 && pr >= 0 && pr <= 9) {
          preview.add(`${pc},${pr}`);
        }
      }
      setPreviewCells(preview);
      setDragOverCell(`${col},${row}`);
    },
    [orientation]
  );

  const handleCellDragLeave = useCallback(
    (_e: React.DragEvent, _col: ColIndex, _row: RowIndex) => {
      setPreviewCells(new Set());
      setDragOverCell(null);
    },
    []
  );

  const handleCellDrop = useCallback(
    (e: React.DragEvent, col: ColIndex, row: RowIndex) => {
      e.preventDefault();
      const shipType = e.dataTransfer.getData("shipType") as ShipType;
      if (!shipType) return;

      setDragOverCell(null);
      setPreviewCells(new Set());
      handlePlaceShip(shipType, col, row);
    },
    [handlePlaceShip]
  );

  const handleHoverCell = useCallback(
    (col: ColIndex, row: RowIndex) => {
      if (!placingShip) return;

      const length = SHIP_LENGTHS[placingShip];
      const preview = new Set<string>();
      for (let i = 0; i < length; i++) {
        const pc = orientation === "horizontal" ? col + i : col;
        const pr = orientation === "vertical" ? row + i : row;
        if (pc >= 0 && pc <= 9 && pr >= 0 && pr <= 9) {
          preview.add(`${pc},${pr}`);
        }
      }
      setPreviewCells(preview);
    },
    [placingShip, orientation]
  );

  const handleRotate = useCallback(() => {
    setOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  }, []);

  const handleRandomize = useCallback(() => {
    onRandomize((placements: ShipPlacement[]) => {
      const newShips = new Map<ShipType, ShipPlacement>();
      for (const p of placements) {
        newShips.set(p.shipType, p);
      }
      setPlacedShips(newShips);

      let board = createEmptyBoard();
      for (const [, p] of newShips) {
        board = placeShipOnBoard(board, p.shipType, p.start.col, p.start.row, p.orientation);
      }
      boardRef.current = board;
      updateBoardAndEmit(newShips);
    });
  }, [onRandomize, updateBoardAndEmit]);

  // Keyboard handler for R (rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRotate();
      }
      if (e.key === "Escape") {
        setPlacingShip(null);
        setPreviewCells(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRotate]);

  const allPlaced = placedShips.size === 5;

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-400">⚓ Place Your Fleet</h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Own Board (placement area) */}
        <div
          onMouseMove={(e) => {
            if (!placingShip) return;
            // This is handled per-cell in Board
          }}
        >
          <Board
            board={boardRef.current}
            label="Your Board"
            showShips
            isPlacement
            previewCells={previewCells}
            dragOverCell={dragOverCell}
            onCellClick={handleCellClick}
            onCellHover={handleHoverCell}
            onCellDragOver={handleCellDragOver}
            onCellDragLeave={handleCellDragLeave}
            onCellDrop={handleCellDrop}
          />
        </div>

        {/* Right: Ship Palette + Controls */}
        <div className="flex flex-col gap-6">
          <ShipPalette
            placedShips={new Set(placedShips.keys())}
            currentOrientation={orientation}
            onSelectShip={setPlacingShip}
            onRotate={handleRotate}
          />

          {/* Placing hint */}
          {placingShip && (
            <div className="bg-blue-900 border border-blue-600 rounded-lg px-4 py-2 text-sm text-blue-200 text-center">
              Placing <strong>{placingShip}</strong> ({SHIP_LENGTHS[placingShip]} cells){" "}
              {orientation === "horizontal" ? "horizontally" : "vertically"}
              <br />
              <span className="text-xs">Click a cell on the board or press R to rotate • Esc to cancel</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              className="btn btn-secondary w-full"
              onClick={handleRandomize}
            >
              🎲 Randomize
            </button>

            <button
              className={`btn w-full ${allPlaced ? "btn-success" : "btn-secondary"}`}
              onClick={onReady}
              disabled={!allPlaced}
            >
              {allPlaced ? "✅ Ready!" : `Place all ships (${placedShips.size}/5)`}
            </button>
          </div>

          {/* Opponent ready indicator */}
          {opponentReady && (
            <div className="bg-green-900 border border-green-600 rounded-lg px-4 py-2 text-sm text-green-200 text-center">
              ✅ Opponent is ready! Battle starts when you confirm.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardSetup;
