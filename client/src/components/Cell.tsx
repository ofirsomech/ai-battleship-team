// ============================================================
// Cell.tsx — Grid cell with battle-worn naval styling
// Radar-green hits, warm-gray misses, brass sunk
// ============================================================

import React from "react";
import type { CellStatus, ShipType, ColIndex, RowIndex } from "@battleship/shared";

interface CellProps {
  col: ColIndex;
  row: RowIndex;
  status: CellStatus;
  shipType?: ShipType;
  /** Whether this cell on the own board contains an unhit ship */
  hasShip?: boolean;
  /** Whether this cell is clickable (tracking board during battle, your turn) */
  isShootable?: boolean;
  /** Whether this cell is a drop target (placement phase) */
  isDropTarget?: boolean;
  /** Whether drag is currently over this cell */
  isDragOver?: boolean;
  /** Whether this cell is part of a placement preview */
  isPreview?: boolean;
  onMouseEnter?: () => void;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const Cell: React.FC<CellProps> = ({
  col,
  row,
  status,
  shipType: _shipType,
  hasShip,
  isShootable,
  isDropTarget,
  isDragOver,
  isPreview,
  onMouseEnter,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  let className = "cell";

  // Determine visual state
  if (isDragOver) {
    className += " drag-over";
  } else if (isPreview) {
    className += " placing-preview";
  } else if (status === "hit") {
    className += " hit";
  } else if (status === "miss") {
    className += " miss";
  } else if (status === "sunk") {
    className += " sunk";
  } else if (status === "ship" || hasShip) {
    className += " ship";
  } else if (status === "empty") {
    className += " empty";
  }

  if (isShootable && status === "empty") {
    className += " shootable";
  }

  if (isDropTarget) {
    className += " drop-target";
  }

  // Display symbol
  let display: string | null = null;
  if (status === "hit") {
    display = "V";
  } else if (status === "miss") {
    display = "✕";
  } else if (status === "sunk") {
    display = "V";
  }

  return (
    <div
      className={className}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      title={`${String.fromCharCode(97 + col)}${row + 1}`}
    >
      {display}
    </div>
  );
};

export default Cell;
