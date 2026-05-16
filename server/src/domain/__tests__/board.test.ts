// ============================================================
// board.test.ts — Vitest unit tests for board.ts
// ============================================================

import { describe, it, expect } from "vitest";
import {
  createEmptyBoard,
  placeShip,
  randomLayout,
  applyShipsToBoard,
  getShipCells,
  PlaceShipResult,
} from "../board";
import { Board, Coordinate, ColIndex, RowIndex, ShipType, SHIP_LENGTHS } from "@battleship/shared";

// ---- Helpers -------------------------------------------------

/** Count cells with status "ship" on a board. */
function countShipCells(board: Board): number {
  let count = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board.grid[row][col].status === "ship") count++;
    }
  }
  return count;
}

/** Return all coordinates that have status "ship". */
function shipCoordinates(board: Board): string[] {
  const coords: string[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board.grid[row][col].status === "ship") {
        coords.push(`${col},${row}`);
      }
    }
  }
  return coords;
}

// ---- createEmptyBoard ----------------------------------------

describe("createEmptyBoard", () => {
  it("returns a 10×10 grid", () => {
    const board = createEmptyBoard();
    expect(board.grid.length).toBe(10);
    board.grid.forEach((row) => expect(row.length).toBe(10));
  });

  it("every cell has status 'empty'", () => {
    const board = createEmptyBoard();
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        expect(board.grid[row][col]).toEqual({ status: "empty" });
      }
    }
  });

  it("returns a new board each call (no shared references)", () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    a.grid[0][0] = { status: "hit" };
    expect(b.grid[0][0].status).toBe("empty");
  });
});

// ---- placeShip -----------------------------------------------

describe("placeShip", () => {
  const empty = createEmptyBoard();

  describe("valid placements", () => {
    it("places a Destroyer (length 2) horizontally at origin", () => {
      const result = placeShip(empty, "Destroyer", { col: 0, row: 0 }, "horizontal");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.board.grid[0][0]).toEqual({ status: "ship", shipType: "Destroyer" });
        expect(result.board.grid[0][1]).toEqual({ status: "ship", shipType: "Destroyer" });
        expect(result.board.grid[0][2].status).toBe("empty");
      }
    });

    it("places a Carrier (length 5) vertically", () => {
      const result = placeShip(empty, "Carrier", { col: 4, row: 2 }, "vertical");
      expect(result.success).toBe(true);
      if (result.success) {
        for (let i = 0; i < 5; i++) {
          expect(result.board.grid[2 + i][4]).toEqual({ status: "ship", shipType: "Carrier" });
        }
      }
    });

    it("places a ship at the bottom-right edge", () => {
      const result = placeShip(empty, "Destroyer", { col: 8, row: 9 }, "horizontal");
      expect(result.success).toBe(true);
    });

    it("does not mutate the original board", () => {
      const result = placeShip(empty, "Destroyer", { col: 0, row: 0 }, "horizontal");
      expect(empty.grid[0][0].status).toBe("empty");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid placements — out of bounds", () => {
    it("rejects horizontal ship extending past column 9", () => {
      const result = placeShip(empty, "Carrier", { col: 6, row: 0 }, "horizontal");
      expect(result.success).toBe(false);
      expect((result as { error: string }).error).toBe("Ship out of bounds");
    });

    it("rejects vertical ship extending past row 9", () => {
      const result = placeShip(empty, "Battleship", { col: 0, row: 7 }, "vertical");
      expect(result.success).toBe(false);
      expect((result as { error: string }).error).toBe("Ship out of bounds");
    });

    it("rejects negative row", () => {
      const result = placeShip(empty, "Destroyer", { col: 0, row: -1 as RowIndex }, "horizontal");
      expect(result.success).toBe(false);
    });

    it("rejects start at col 9 for a length-2 ship horizontally", () => {
      const result = placeShip(empty, "Destroyer", { col: 9, row: 5 }, "horizontal");
      expect(result.success).toBe(false);
    });
  });

  describe("invalid placements — overlap", () => {
    it("rejects overlapping with an existing ship", () => {
      const afterFirst = placeShip(empty, "Carrier", { col: 0, row: 0 }, "horizontal");
      expect(afterFirst.success).toBe(true);
      if (!afterFirst.success) return;

      const result = placeShip(afterFirst.board, "Battleship", { col: 3, row: 0 }, "horizontal");
      // Battleship at col 3-6 overlaps with Carrier at col 0-4 at col 3,4
      expect(result.success).toBe(false);
      expect((result as { error: string }).error).toBe("Ship overlaps with existing ship");
    });

    it("rejects placing a ship directly on top of another", () => {
      const afterFirst = placeShip(empty, "Destroyer", { col: 5, row: 5 }, "horizontal");
      expect(afterFirst.success).toBe(true);
      if (!afterFirst.success) return;

      const result = placeShip(afterFirst.board, "Submarine", { col: 5, row: 5 }, "vertical");
      expect(result.success).toBe(false);
    });
  });

  describe("orientation behavior", () => {
    it("horizontal: row stays constant, col increments", () => {
      const result = placeShip(empty, "Cruiser", { col: 2, row: 4 }, "horizontal");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.board.grid[4][2].shipType).toBe("Cruiser");
        expect(result.board.grid[4][3].shipType).toBe("Cruiser");
        expect(result.board.grid[4][4].shipType).toBe("Cruiser");
        // row above/below untouched
        expect(result.board.grid[3][2].status).toBe("empty");
        expect(result.board.grid[5][2].status).toBe("empty");
      }
    });

    it("vertical: col stays constant, row increments", () => {
      const result = placeShip(empty, "Submarine", { col: 7, row: 3 }, "vertical");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.board.grid[3][7].shipType).toBe("Submarine");
        expect(result.board.grid[4][7].shipType).toBe("Submarine");
        expect(result.board.grid[5][7].shipType).toBe("Submarine");
      }
    });
  });

  describe("returns correct shipType on placed cells", () => {
    it("sets shipType for all cells of the placed ship", () => {
      const result = placeShip(empty, "Carrier", { col: 0, row: 0 }, "horizontal");
      expect(result.success).toBe(true);
      if (result.success) {
        for (let i = 0; i < 5; i++) {
          expect(result.board.grid[0][i].shipType).toBe("Carrier");
        }
      }
    });
  });
});

// ---- getShipCells --------------------------------------------

describe("getShipCells", () => {
  it("returns correct cells for horizontal placement", () => {
    const cells = getShipCells(3, { col: 2, row: 5 }, "horizontal");
    expect(cells).toEqual([
      { col: 2, row: 5 },
      { col: 3, row: 5 },
      { col: 4, row: 5 },
    ]);
  });

  it("returns correct cells for vertical placement", () => {
    const cells = getShipCells(4, { col: 7, row: 1 }, "vertical");
    expect(cells).toEqual([
      { col: 7, row: 1 },
      { col: 7, row: 2 },
      { col: 7, row: 3 },
      { col: 7, row: 4 },
    ]);
  });

  it("returns a single cell for length 1 (hypothetical)", () => {
    const cells = getShipCells(1, { col: 0, row: 0 }, "horizontal");
    expect(cells).toEqual([{ col: 0, row: 0 }]);
  });
});

// ---- randomLayout --------------------------------------------

describe("randomLayout", () => {
  it("returns exactly 5 placements", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      expect(placements).toHaveLength(5);
    }
  });

  it("contains one of each ship type", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      const types = placements.map((p) => p.shipType).sort();
      expect(types).toEqual([
        "Battleship",
        "Carrier",
        "Cruiser",
        "Destroyer",
        "Submarine",
      ]);
    }
  });

  it("all placements are within 10×10 bounds", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      for (const p of placements) {
        const length = SHIP_LENGTHS[p.shipType];
        const cells = getShipCells(length, p.start, p.orientation);
        for (const c of cells) {
          expect(c.col).toBeGreaterThanOrEqual(0);
          expect(c.col).toBeLessThanOrEqual(9);
          expect(c.row).toBeGreaterThanOrEqual(0);
          expect(c.row).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it("no two placements overlap", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      const occupied = new Set<string>();
      for (const p of placements) {
        const length = SHIP_LENGTHS[p.shipType];
        const cells = getShipCells(length, p.start, p.orientation);
        for (const c of cells) {
          const key = `${c.col},${c.row}`;
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }
      }
    }
  });

  it("total occupied cells = 17 (5+4+3+3+2)", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      const occupied = new Set<string>();
      for (const p of placements) {
        const length = SHIP_LENGTHS[p.shipType];
        const cells = getShipCells(length, p.start, p.orientation);
        for (const c of cells) {
          occupied.add(`${c.col},${c.row}`);
        }
      }
      expect(occupied.size).toBe(17);
    }
  });

  it("only uses horizontal or vertical orientation", () => {
    for (let i = 0; i < 20; i++) {
      const placements = randomLayout();
      for (const p of placements) {
        expect(["horizontal", "vertical"]).toContain(p.orientation);
      }
    }
  });

  it("produces different layouts on successive calls (probabilistic)", () => {
    const layouts = Array.from({ length: 10 }, () => {
      const p = randomLayout();
      return JSON.stringify(
        p.map((s) => `${s.shipType}:${s.start.col},${s.start.row}:${s.orientation}`).sort()
      );
    });
    const unique = new Set(layouts);
    // With 10 rolls, it's virtually impossible to get the same layout every time
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ---- applyShipsToBoard ---------------------------------------

describe("applyShipsToBoard", () => {
  it("applies a single placement to an empty board", () => {
    const board = createEmptyBoard();
    const result = applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    expect(result.grid[0][0]).toEqual({ status: "ship", shipType: "Destroyer" });
    expect(result.grid[0][1]).toEqual({ status: "ship", shipType: "Destroyer" });
    expect(result.grid[0][2].status).toBe("empty");
    expect(countShipCells(result)).toBe(2);
  });

  it("applies all 5 ships", () => {
    const board = createEmptyBoard();
    const placements = [
      { shipType: "Carrier" as ShipType, start: { col: 0, row: 0 } as Coordinate, orientation: "horizontal" as const },
      { shipType: "Battleship" as ShipType, start: { col: 0, row: 1 } as Coordinate, orientation: "horizontal" as const },
      { shipType: "Cruiser" as ShipType, start: { col: 0, row: 2 } as Coordinate, orientation: "horizontal" as const },
      { shipType: "Submarine" as ShipType, start: { col: 0, row: 3 } as Coordinate, orientation: "horizontal" as const },
      { shipType: "Destroyer" as ShipType, start: { col: 0, row: 4 } as Coordinate, orientation: "horizontal" as const },
    ];
    const result = applyShipsToBoard(board, placements);
    expect(countShipCells(result)).toBe(17);
  });

  it("does not mutate the original board", () => {
    const board = createEmptyBoard();
    applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    expect(board.grid[0][0].status).toBe("empty");
  });

  it("preserves existing non-empty cells on the board", () => {
    const board = createEmptyBoard();
    // Pre-place a miss marker
    board.grid[0][0] = { status: "miss" };
    const result = applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 1, row: 0 }, orientation: "horizontal" },
    ]);
    expect(result.grid[0][0]).toEqual({ status: "miss" });
    expect(result.grid[0][1]).toEqual({ status: "ship", shipType: "Destroyer" });
  });

  it("sets correct shipType for each cell", () => {
    const board = createEmptyBoard();
    const result = applyShipsToBoard(board, [
      { shipType: "Carrier", start: { col: 5, row: 5 }, orientation: "vertical" },
    ]);
    for (let i = 0; i < 5; i++) {
      expect(result.grid[5 + i][5]).toEqual({ status: "ship", shipType: "Carrier" });
    }
  });

  it("handles empty placements array", () => {
    const board = createEmptyBoard();
    const result = applyShipsToBoard(board, []);
    expect(countShipCells(result)).toBe(0);
  });
});
