// ============================================================
// board.ts — Pure domain logic for board operations
// Zero imports from express, socket.io, or react.
// ============================================================

import {
  Board,
  Cell,
  Coordinate,
  ColIndex,
  RowIndex,
  ShipType,
  ShipPlacement,
  Orientation,
  SHIP_LENGTHS,
} from "@battleship/shared";

// ---- Result types --------------------------------------------

/** Result of attempting to place a single ship. */
export type PlaceShipResult =
  | { success: true; board: Board }
  | { success: false; error: string };

// ---- Helpers -------------------------------------------------

/** Return every cell a ship of the given length would occupy. */
export function getShipCells(
  length: number,
  start: Coordinate,
  orientation: Orientation
): Coordinate[] {
  const cells: Coordinate[] = [];
  for (let i = 0; i < length; i++) {
    cells.push({
      col: (orientation === "horizontal" ? start.col + i : start.col) as ColIndex,
      row: (orientation === "vertical" ? start.row + i : start.row) as RowIndex,
    });
  }
  return cells;
}

// ---- Exports -------------------------------------------------

/**
 * Create a 10×10 board where every cell is `{ status: "empty" }`.
 */
export function createEmptyBoard(): Board {
  const grid: Cell[][] = [];
  for (let row = 0; row < 10; row++) {
    grid[row] = [];
    for (let col = 0; col < 10; col++) {
      grid[row][col] = { status: "empty" };
    }
  }
  return { grid };
}

/**
 * Attempt to place a single ship on a board.
 *
 * Validates:
 * - All cells are within the 10×10 grid.
 * - No overlap with existing ships.
 * - Orientation is horizontal or vertical (no diagonals — enforced by
 *   the Orientation type + cell-computation math).
 *
 * Returns `{ success: true, board }` with a **new** Board on success,
 * or `{ success: false, error }` on invalid placement.
 */
export function placeShip(
  board: Board,
  shipType: ShipType,
  start: Coordinate,
  orientation: Orientation
): PlaceShipResult {
  const length = SHIP_LENGTHS[shipType];

  // Compute candidate cells
  const cells: Coordinate[] = [];
  for (let i = 0; i < length; i++) {
    const col = orientation === "horizontal" ? start.col + i : start.col;
    const row = orientation === "vertical" ? start.row + i : start.row;

    if (col < 0 || col > 9 || row < 0 || row > 9) {
      return { success: false, error: "Ship out of bounds" };
    }

    cells.push({ col: col as ColIndex, row: row as RowIndex });
  }

  // Check overlap
  for (const { col, row } of cells) {
    if (board.grid[row][col].status !== "empty") {
      return { success: false, error: "Ship overlaps with existing ship" };
    }
  }

  // Place ship on a new board copy
  const newGrid = board.grid.map((row) => row.map((cell) => ({ ...cell })));
  for (const { col, row } of cells) {
    newGrid[row][col] = { status: "ship", shipType };
  }

  return { success: true, board: { grid: newGrid } };
}

/**
 * Generate a random valid fleet layout (all 5 ships, no overlaps, within 10×10).
 *
 * Ships are placed in descending length order to reduce collision probability.
 * Throws if a ship cannot be placed after 1000 attempts (should never happen
 * on an empty 10×10 board).
 */
export function randomLayout(): ShipPlacement[] {
  // Place largest ships first — they have fewer valid positions.
  const shipTypes: ShipType[] = [
    "Carrier",
    "Battleship",
    "Cruiser",
    "Submarine",
    "Destroyer",
  ];

  const placements: ShipPlacement[] = [];
  const occupied: Set<string> = new Set();

  for (const shipType of shipTypes) {
    const length = SHIP_LENGTHS[shipType];
    let placed = false;

    for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
      const orientation: Orientation =
        Math.random() < 0.5 ? "horizontal" : "vertical";

      const maxCol = orientation === "horizontal" ? 10 - length : 9;
      const maxRow = orientation === "vertical" ? 10 - length : 9;

      const col = Math.floor(Math.random() * (maxCol + 1)) as ColIndex;
      const row = Math.floor(Math.random() * (maxRow + 1)) as RowIndex;
      const start: Coordinate = { col, row };

      const cells = getShipCells(length, start, orientation);

      // Check overlap against all previously placed cells
      const overlaps = cells.some((c) => occupied.has(`${c.col},${c.row}`));
      if (overlaps) continue;

      // Place it
      placements.push({ shipType, start, orientation });
      for (const c of cells) {
        occupied.add(`${c.col},${c.row}`);
      }
      placed = true;
    }

    if (!placed) {
      throw new Error(
        `Could not place ${shipType} after 1000 attempts`
      );
    }
  }

  return placements;
}

/**
 * Apply an array of ShipPlacement records to a board, marking every
 * occupied cell as `{ status: "ship", shipType }`.
 *
 * Returns a **new** Board (does not mutate the input).
 */
export function applyShipsToBoard(
  board: Board,
  placements: ShipPlacement[]
): Board {
  const newGrid = board.grid.map((row) => row.map((cell) => ({ ...cell })));

  for (const { shipType, start, orientation } of placements) {
    const length = SHIP_LENGTHS[shipType];
    const cells = getShipCells(length, start, orientation);
    for (const { col, row } of cells) {
      newGrid[row][col] = { status: "ship", shipType };
    }
  }

  return { grid: newGrid };
}
