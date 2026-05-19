// ============================================================
// Board.tsx — Reusable 10×10 grid with naval-chart styling
// ============================================================

import React from "react";
import type { Board as BoardType, ColIndex, RowIndex } from "@battleship/shared";
import { COL_LABELS, ROW_LABELS } from "../store";
import Cell from "./Cell";

interface BoardProps {
  board: BoardType;
  /** Label shown above the board */
  label: string;
  /** Whether to show ships on this board (own board) */
  showShips?: boolean;
  /** Whether this is the tracking board (cells are clickable if it's our turn) */
  isTracking?: boolean;
  /** Whether it's currently our turn (only relevant for tracking board) */
  isMyTurn?: boolean;
  /** Whether this board is a drop target (placement phase) */
  isPlacement?: boolean;
  /** Currently previewed placement cells */
  previewCells?: Set<string>;
  /** Cell that is being dragged over */
  dragOverCell?: string | null;
  onCellClick?: (col: ColIndex, row: RowIndex) => void;
  onCellHover?: (col: ColIndex, row: RowIndex) => void;
  onCellDragOver?: (e: React.DragEvent, col: ColIndex, row: RowIndex) => void;
  onCellDragLeave?: (e: React.DragEvent, col: ColIndex, row: RowIndex) => void;
  onCellDrop?: (e: React.DragEvent, col: ColIndex, row: RowIndex) => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  label,
  showShips,
  isTracking,
  isMyTurn,
  isPlacement,
  previewCells,
  dragOverCell,
  onCellClick,
  onCellHover,
  onCellDragOver,
  onCellDragLeave,
  onCellDrop,
}) => {
  return (
    <div className="board-container">
      <span className="board-label">{label}</span>

      {/* Column headers */}
      <div className="board-coordinates-row">
        <div className="w-5 sm:w-6" /> {/* spacer for row labels */}
        {COL_LABELS.map((col) => (
          <div key={col} className="board-coordinate-label">
            {col}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {board.grid.map((row, rowIdx) => (
        <div key={rowIdx} className="board-row">
          <div className="row-label">{ROW_LABELS[rowIdx]}</div>
          {row.map((cell, colIdx) => {
            const cellKey = `${colIdx},${rowIdx}`;
            const isPreview = previewCells?.has(cellKey) ?? false;
            const isDragOver = dragOverCell === cellKey;
            const canShoot =
              isTracking &&
              isMyTurn &&
              (cell.status === "empty" || cell.status === "ship");

            return (
              <Cell
                key={cellKey}
                col={colIdx as ColIndex}
                row={rowIdx as RowIndex}
                status={cell.status}
                shipType={cell.shipType}
                hasShip={showShips && cell.status === "ship"}
                isShootable={canShoot}
                isDropTarget={isPlacement && cell.status === "empty"}
                isDragOver={isDragOver}
                isPreview={isPreview}
                onMouseEnter={() => onCellHover?.(colIdx as ColIndex, rowIdx as RowIndex)}
                onClick={() => onCellClick?.(colIdx as ColIndex, rowIdx as RowIndex)}
                onDragOver={(e) => onCellDragOver?.(e, colIdx as ColIndex, rowIdx as RowIndex)}
                onDragLeave={(e) => onCellDragLeave?.(e, colIdx as ColIndex, rowIdx as RowIndex)}
                onDrop={(e) => onCellDrop?.(e, colIdx as ColIndex, rowIdx as RowIndex)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Board;
