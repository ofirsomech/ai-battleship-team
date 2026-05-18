// ============================================================
// match.test.ts — Vitest unit tests for match.ts
// ============================================================

import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayerToGameState,
  getOpponentId,
  applyShot,
  isFleetSunk,
} from "../match";
import { createEmptyBoard, applyShipsToBoard } from "../board";
import {
  Board,
  GameState,
  Coordinate,
  ShipPlacement,
  ShipType,
  Player,
  SHIP_LENGTHS,
} from "@battleship/shared";

// ---- Helpers -------------------------------------------------

/** Create a simple fleet layout that places all 5 ships on non-overlapping rows. */
function simpleFleet(): ShipPlacement[] {
  const placements: ShipPlacement[] = [
    { shipType: "Carrier", start: { col: 0, row: 0 }, orientation: "horizontal" },    // row 0, cols 0-4
    { shipType: "Battleship", start: { col: 0, row: 1 }, orientation: "horizontal" },  // row 1, cols 0-3
    { shipType: "Cruiser", start: { col: 0, row: 2 }, orientation: "horizontal" },     // row 2, cols 0-2
    { shipType: "Submarine", start: { col: 0, row: 3 }, orientation: "horizontal" },   // row 3, cols 0-2
    { shipType: "Destroyer", start: { col: 0, row: 4 }, orientation: "horizontal" },   // row 4, cols 0-1
  ];
  return placements;
}

/** Build a battle-ready GameState with two players and ships placed. */
function createBattleState(): GameState {
  let state = createGameState("TEST01");
  state = addPlayerToGameState(state, "p1", "Alice");
  state = addPlayerToGameState(state, "p2", "Bob");

  // Place ships for both players
  const p1Placements = simpleFleet();
  const p2Placements = simpleFleet();

  let p1 = state.players[0];
  let p2 = state.players[1];

  p1 = {
    ...p1,
    board: applyShipsToBoard(p1.board, p1Placements),
    ships: p1Placements.map((pl) => ({
      type: pl.shipType,
      length: SHIP_LENGTHS[pl.shipType],
      position: { start: pl.start, orientation: pl.orientation },
      hits: 0,
    })),
    isReady: true,
  };

  p2 = {
    ...p2,
    board: applyShipsToBoard(p2.board, p2Placements),
    ships: p2Placements.map((pl) => ({
      type: pl.shipType,
      length: SHIP_LENGTHS[pl.shipType],
      position: { start: pl.start, orientation: pl.orientation },
      hits: 0,
    })),
    isReady: true,
  };

  return {
    ...state,
    players: [p1, p2],
    phase: "battle",
    currentTurn: "p1", // host shoots first
  };
}

/** Count cells with a given status on a board. */
function countByStatus(board: Board, status: string): number {
  let count = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (board.grid[row][col].status === status) count++;
    }
  }
  return count;
}

// ---- createGameState -----------------------------------------

describe("createGameState", () => {
  it("returns a GameState with the correct roomCode", () => {
    const state = createGameState("ABCDEF");
    expect(state.roomCode).toBe("ABCDEF");
  });

  it("starts in 'lobby' phase with no players", () => {
    const state = createGameState("XYZ123");
    expect(state.phase).toBe("lobby");
    expect(state.players).toHaveLength(0);
    expect(state.currentTurn).toBeNull();
    expect(state.winner).toBeNull();
  });
});

// ---- addPlayerToGameState ------------------------------------

describe("addPlayerToGameState", () => {
  it("adds the first player and stays in lobby", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    expect(state.players).toHaveLength(1);
    expect(state.players[0].id).toBe("p1");
    expect(state.players[0].name).toBe("Alice");
    expect(state.phase).toBe("lobby");
  });

  it("adds the second player and transitions to placement", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    state = addPlayerToGameState(state, "p2", "Bob");
    expect(state.players).toHaveLength(2);
    expect(state.phase).toBe("placement");
  });

  it("new players have empty boards and are not ready", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    const player = state.players[0];
    expect(player.isReady).toBe(false);
    expect(player.ships).toHaveLength(0);
    // Verify boards are empty
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        expect(player.board.grid[row][col].status).toBe("empty");
        expect(player.trackingBoard.grid[row][col].status).toBe("empty");
      }
    }
  });

  it("throws when adding a third player", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    state = addPlayerToGameState(state, "p2", "Bob");
    expect(() => addPlayerToGameState(state, "p3", "Charlie")).toThrow(
      "Room is full"
    );
  });

  it("does not mutate the original state", () => {
    const state = createGameState("ROOM");
    const originalPhase = state.phase;
    addPlayerToGameState(state, "p1", "Alice");
    expect(state.phase).toBe(originalPhase);
    expect(state.players).toHaveLength(0);
  });
});

// ---- getOpponentId -------------------------------------------

describe("getOpponentId", () => {
  it("returns the other player's id", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    state = addPlayerToGameState(state, "p2", "Bob");
    expect(getOpponentId(state, "p1")).toBe("p2");
    expect(getOpponentId(state, "p2")).toBe("p1");
  });

  it("throws when there aren't 2 players", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    expect(() => getOpponentId(state, "p1")).toThrow(
      "Game requires exactly 2 players"
    );
  });

  it("throws for unknown player id", () => {
    let state = createGameState("ROOM");
    state = addPlayerToGameState(state, "p1", "Alice");
    state = addPlayerToGameState(state, "p2", "Bob");
    expect(() => getOpponentId(state, "p3")).toThrow("Player p3 not found in game");
  });
});

// ---- applyShot -----------------------------------------------

describe("applyShot", () => {
  describe("validation", () => {
    it("throws if phase is not 'battle'", () => {
      let state = createGameState("ROOM");
      state = addPlayerToGameState(state, "p1", "Alice");
      state = addPlayerToGameState(state, "p2", "Bob");
      // Still in "placement" phase
      expect(() =>
        applyShot(state, "p1", { col: 0, row: 0 })
      ).toThrow("Not in battle phase");
    });

    it("throws if it is not the shooter's turn", () => {
      const state = createBattleState();
      // p1's turn; p2 tries to shoot
      expect(() =>
        applyShot(state, "p2", { col: 0, row: 0 })
      ).toThrow("Not your turn");
    });

    it("throws for double-shot (cell already targeted)", () => {
      const state = createBattleState();
      // p1 shoots at (0,0) — miss (row 0 empty since p2's ships on row 0)
      const { newState } = applyShot(state, "p1", { col: 0, row: 0 });
      // It's now p2's turn; but let's test with a fresh state
      // Actually after a shot, it becomes p2's turn. Let's do a full cycle:
      const state2 = createBattleState();
      const r1 = applyShot(state2, "p1", { col: 0, row: 5 }); // miss
      // Now it's p2's turn
      const r2 = applyShot(r1.newState, "p2", { col: 0, row: 5 }); // miss
      // Back to p1
      expect(() =>
        applyShot(r2.newState, "p1", { col: 0, row: 5 })
      ).toThrow("Cell already shot");
    });

    it("throws for unknown shooter", () => {
      const state = createBattleState();
      expect(() =>
        applyShot(state, "p3", { col: 0, row: 0 })
      ).toThrow("Player p3 not found in game");
    });
  });

  describe("miss", () => {
    it("records a miss on both tracking and opponent boards", () => {
      const state = createBattleState();
      // p1 shoots at empty water on p2's board: row 5 is empty
      const { newState, result } = applyShot(state, "p1", { col: 5, row: 5 });

      expect(result.result).toBe("miss");
      expect(result.coordinate).toEqual({ col: 5, row: 5 });
      expect(result.sunkShip).toBeUndefined();
      expect(result.winner).toBeUndefined();
      expect(result.nextTurn).toBe("p2");

      // p1's tracking board updated
      const p1 = newState.players.find((p) => p.id === "p1")!;
      expect(p1.trackingBoard.grid[5][5]).toEqual({ status: "miss" });

      // p2's own board updated
      const p2 = newState.players.find((p) => p.id === "p2")!;
      expect(p2.board.grid[5][5]).toEqual({ status: "miss" });

      // Turn passes to p2
      expect(newState.currentTurn).toBe("p2");
      expect(newState.phase).toBe("battle");
    });
  });

  describe("hit", () => {
    it("records a hit on tracking and opponent boards", () => {
      const state = createBattleState();
      // p2 has Carrier at row 0, cols 0-4. p1 shoots at (2, 0) = a hit
      const { newState, result } = applyShot(state, "p1", { col: 2, row: 0 });

      expect(result.result).toBe("hit");
      expect(result.sunkShip).toBeUndefined();

      const p1 = newState.players.find((p) => p.id === "p1")!;
      expect(p1.trackingBoard.grid[0][2]).toEqual({
        status: "hit",
        shipType: "Carrier",
      });

      const p2 = newState.players.find((p) => p.id === "p2")!;
      expect(p2.board.grid[0][2]).toEqual({
        status: "hit",
        shipType: "Carrier",
      });

      // p2's ship hits counter increments
      const carrier = p2.ships.find((s) => s.type === "Carrier")!;
      expect(carrier.hits).toBe(1);

      // Turn passes
      expect(newState.currentTurn).toBe("p2");
    });
  });

  describe("sunk", () => {
    it("detects a sunk ship and marks all its cells 'sunk'", () => {
      const state = createBattleState();
      // Sink p2's Destroyer (row 4, cols 0-1)
      // First shot hits (0,4)
      let s = state;
      const r1 = applyShot(s, "p1", { col: 0, row: 4 });
      expect(r1.result.result).toBe("hit");

      // Now p2's turn — shoot at empty water
      s = r1.newState;
      const r2 = applyShot(s, "p2", { col: 5, row: 5 }); // miss
      s = r2.newState;

      // p1's turn again — sink Destroyer at (1,4)
      const r3 = applyShot(s, "p1", { col: 1, row: 4 });

      expect(r3.result.result).toBe("sunk");
      expect(r3.result.sunkShip).toBe("Destroyer");

      // Both cells of Destroyer marked "sunk" on tracking board
      const p1 = r3.newState.players.find((p) => p.id === "p1")!;
      expect(p1.trackingBoard.grid[4][0]).toEqual({
        status: "sunk",
        shipType: "Destroyer",
      });
      expect(p1.trackingBoard.grid[4][1]).toEqual({
        status: "sunk",
        shipType: "Destroyer",
      });

      // Both cells of Destroyer marked "sunk" on p2's own board
      const p2 = r3.newState.players.find((p) => p.id === "p2")!;
      expect(p2.board.grid[4][0]).toEqual({
        status: "sunk",
        shipType: "Destroyer",
      });
      expect(p2.board.grid[4][1]).toEqual({
        status: "sunk",
        shipType: "Destroyer",
      });

      expect(r3.newState.currentTurn).toBe("p2");
    });
  });

  describe("game over", () => {
    it("declares winner when all 17 opponent cells are hit", () => {
      const state = createBattleState();
      let s = state;

      // Hit all 17 cells of p2's fleet
      // Fleet layout: row0 cols0-4 (Carrier), row1 cols0-3 (Battleship),
      //               row2 cols0-2 (Cruiser), row3 cols0-2 (Submarine),
      //               row4 cols0-1 (Destroyer)
      const targets: Coordinate[] = [
        // Carrier (5 cells)
        { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
        { col: 3, row: 0 }, { col: 4, row: 0 },
        // Battleship (4 cells)
        { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
        { col: 3, row: 1 },
        // Cruiser (3 cells)
        { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
        // Submarine (3 cells)
        { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 },
        // Destroyer (2 cells)
        { col: 0, row: 4 }, { col: 1, row: 4 },
      ];

      // p2 shoots at different empty cells to pass turn back each time
      let passTurnIdx = 0;
      const passCells: Coordinate[] = [
        { col: 5, row: 5 }, { col: 6, row: 5 }, { col: 7, row: 5 },
        { col: 8, row: 5 }, { col: 9, row: 5 }, { col: 5, row: 6 },
        { col: 6, row: 6 }, { col: 7, row: 6 }, { col: 8, row: 6 },
        { col: 9, row: 6 }, { col: 5, row: 7 }, { col: 6, row: 7 },
        { col: 7, row: 7 }, { col: 8, row: 7 }, { col: 9, row: 7 },
        { col: 5, row: 8 }, { col: 6, row: 8 },
      ];

      for (let i = 0; i < targets.length; i++) {
        // p1 shoots
        const { newState, result } = applyShot(s, "p1", targets[i]);
        s = newState;

        if (i === targets.length - 1) {
          // Last shot
          expect(result.winner).toBe("p1");
          expect(newState.phase).toBe("gameOver");
          expect(newState.winner).toBe("p1");
          expect(newState.currentTurn).toBeNull();
        } else {
          // Not last — p2 shoots at empty water to pass turn back
          expect(newState.currentTurn).toBe("p2");
          const p2shot = applyShot(newState, "p2", passCells[passTurnIdx++]);
          s = p2shot.newState;
          expect(s.currentTurn).toBe("p1");
        }
      }
    });
  });

  describe("turn alternation", () => {
    it("alternates turns after each shot (hit or miss)", () => {
      const state = createBattleState();
      // p1 shoots miss
      const r1 = applyShot(state, "p1", { col: 9, row: 9 });
      expect(r1.newState.currentTurn).toBe("p2");

      // p2 shoots miss
      const r2 = applyShot(r1.newState, "p2", { col: 8, row: 8 });
      expect(r2.newState.currentTurn).toBe("p1");
    });
  });
});

// ---- isFleetSunk ---------------------------------------------

describe("isFleetSunk", () => {
  it("returns false for an empty board (no ships)", () => {
    const board = createEmptyBoard();
    expect(isFleetSunk(board)).toBe(true); // vacuously true — no ship cells to check
  });

  it("returns false when there are untouched ship cells", () => {
    const board = createEmptyBoard();
    const boardWithShips = applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    expect(isFleetSunk(boardWithShips)).toBe(false);
  });

  it("returns true when all ship cells are hit", () => {
    const board = createEmptyBoard();
    const boardWithShips = applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    // Mark both cells as hit
    boardWithShips.grid[0][0] = { status: "hit", shipType: "Destroyer" };
    boardWithShips.grid[0][1] = { status: "hit", shipType: "Destroyer" };
    expect(isFleetSunk(boardWithShips)).toBe(true);
  });

  it("returns true when all ship cells are sunk", () => {
    const board = createEmptyBoard();
    const boardWithShips = applyShipsToBoard(board, [
      { shipType: "Destroyer", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    boardWithShips.grid[0][0] = { status: "sunk", shipType: "Destroyer" };
    boardWithShips.grid[0][1] = { status: "sunk", shipType: "Destroyer" };
    expect(isFleetSunk(boardWithShips)).toBe(true);
  });

  it("returns false when only some ship cells are hit", () => {
    const board = createEmptyBoard();
    const boardWithShips = applyShipsToBoard(board, [
      { shipType: "Carrier", start: { col: 0, row: 0 }, orientation: "horizontal" },
    ]);
    boardWithShips.grid[0][0] = { status: "hit", shipType: "Carrier" };
    boardWithShips.grid[0][1] = { status: "hit", shipType: "Carrier" };
    // 3 more cells still "ship"
    expect(isFleetSunk(boardWithShips)).toBe(false);
  });

  it("returns false when mix of hit and ship cells", () => {
    const board = createEmptyBoard();
    const boardWithShips = applyShipsToBoard(board, [
      { shipType: "Cruiser", start: { col: 5, row: 5 }, orientation: "vertical" },
    ]);
    boardWithShips.grid[5][5] = { status: "hit", shipType: "Cruiser" };
    boardWithShips.grid[6][5] = { status: "sunk", shipType: "Cruiser" };
    // row 7[5] still "ship"
    expect(isFleetSunk(boardWithShips)).toBe(false);
  });
});
