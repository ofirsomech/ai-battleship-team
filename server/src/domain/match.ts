// ============================================================
// match.ts — Pure domain logic for match/game-state operations
// Zero imports from express, socket.io, or react.
// ============================================================

import {
  Board,
  Cell,
  Coordinate,
  ColIndex,
  RowIndex,
  ShipType,
  Ship,
  ShipPlacement,
  Orientation,
  GameState,
  GamePhase,
  GameMode,
  Player,
  ShotResultType,
  ShotResultPayload,
  SHIP_LENGTHS,
} from "@battleship/shared";

import { createEmptyBoard, getShipCells } from "./board";

// ---- Internal helpers ----------------------------------------

/** Deep-clone a Board so nothing is ever mutated in place. */
function cloneBoard(board: Board): Board {
  return {
    grid: board.grid.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

/** Find a player by id; throws if not found. */
function findPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game`);
  }
  return player;
}

/**
 * Given a ship and a board, return true when every cell belonging to
 * that ship has status "hit" or "sunk" (i.e. the ship has zero
 * untouched "ship" cells remaining).
 */
function isShipSunk(board: Board, shipType: ShipType): boolean {
  for (let row: RowIndex = 0; row < 10; row++) {
    for (let col: ColIndex = 0; col < 10; col++) {
      const cell = board.grid[row][col];
      if (cell.shipType === shipType && cell.status === "ship") {
        return false;
      }
    }
  }
  return true;
}

// ---- Exports -------------------------------------------------

/**
 * Create a fresh GameState in the "lobby" phase with zero players.
 *
 * @param gameMode — defaults to `"multiplayer"`. Set to `"ai"` for
 *   single‑player vs‑AI games.
 */
export function createGameState(
  roomCode: string,
  gameMode: GameMode = "multiplayer"
): GameState {
  return {
    roomCode,
    players: [],
    phase: "lobby",
    gameMode,
    currentTurn: null,
    winner: null,
  };
}

/**
 * Add a player to an existing GameState.
 *
 * - First player → stays in "lobby".
 * - Second player → transitions to "placement".
 * - Third+ player → throws (room is full).
 *
 * Returns a **new** GameState.
 */
export function addPlayerToGameState(
  state: GameState,
  playerId: string,
  playerName: string
): GameState {
  if (state.players.length >= 2) {
    throw new Error("Room is full");
  }

  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    board: createEmptyBoard(),
    trackingBoard: createEmptyBoard(),
    ships: [],
    isReady: false,
  };

  const players = [...state.players, newPlayer];

  // AI games skip placement — the AI is auto‑ready, so we go
  // straight to battle once both "players" are present.
  const isAIGame = state.gameMode === "ai";
  const phase: GamePhase =
    players.length === 2
      ? isAIGame
        ? "battle"
        : "placement"
      : "lobby";

  return { ...state, players, phase };
}

/**
 * Return the playerId of the opponent.
 * Throws if there aren't exactly 2 players.
 */
export function getOpponentId(state: GameState, playerId: string): string {
  if (state.players.length !== 2) {
    throw new Error("Game requires exactly 2 players");
  }
  const playerExists = state.players.some((p) => p.id === playerId);
  if (!playerExists) {
    throw new Error(`Player ${playerId} not found in game`);
  }
  const opponent = state.players.find((p) => p.id !== playerId);
  if (!opponent) {
    throw new Error(`Opponent not found for player ${playerId}`);
  }
  return opponent.id;
}

/**
 * Apply a shot from `shooterPlayerId` at `targetCoordinate`.
 *
 * Validates:
 * - Phase must be "battle".
 * - It must be the shooter's turn.
 * - The cell must not have been previously targeted (on the tracking board).
 *
 * Returns a new GameState and a ShotResultPayload describing the outcome.
 * Throws on validation failures (the server layer catches these and emits
 * `error` events).
 */
export function applyShot(
  state: GameState,
  shooterPlayerId: string,
  targetCoordinate: Coordinate
): { newState: GameState; result: ShotResultPayload } {
  // ---- Validation --------------------------------------------
  if (state.phase !== "battle") {
    throw new Error("Not in battle phase");
  }

  const shooter = findPlayer(state, shooterPlayerId);

  if (state.currentTurn !== shooterPlayerId) {
    throw new Error("Not your turn");
  }

  const opponentId = getOpponentId(state, shooterPlayerId);
  const opponent = findPlayer(state, opponentId);

  const { col, row } = targetCoordinate;

  // Check double-shot on the shooter's *tracking* board
  const trackingCell = shooter.trackingBoard.grid[row][col];
  if (
    trackingCell.status === "hit" ||
    trackingCell.status === "miss" ||
    trackingCell.status === "sunk"
  ) {
    throw new Error("Cell already shot");
  }

  // ---- Compute result ----------------------------------------
  const targetCell = opponent.board.grid[row][col];
  let shotResult: ShotResultType;
  let sunkShip: ShipType | undefined;

  if (targetCell.status === "empty" || targetCell.status === "miss") {
    // "miss" on own board can only happen if a miss was recorded
    // (i.e. the opponent already shot here, but that's the opponent's own board
    //  showing misses from the *other player's* shots — shouldn't happen
    //  because this is the opponent's ship-placement board).
    // In any case: no ship → miss.
    shotResult = "miss";
  } else {
    // The cell contains a ship
    shotResult = "hit";

    // Temporarily apply the hit to a cloned board to check sunk status
    const afterHitBoard = cloneBoard(opponent.board);
    afterHitBoard.grid[row][col] = {
      ...afterHitBoard.grid[row][col],
      status: "hit",
    };

    const shipType = targetCell.shipType!;
    if (isShipSunk(afterHitBoard, shipType)) {
      shotResult = "sunk";
      sunkShip = shipType;
    }
  }

  // ---- Update boards -----------------------------------------
  const newOpponentBoard = cloneBoard(opponent.board);
  const newTrackingBoard = cloneBoard(shooter.trackingBoard);

  if (shotResult === "miss") {
    newOpponentBoard.grid[row][col] = { status: "miss" };
    newTrackingBoard.grid[row][col] = { status: "miss" };
  } else if (shotResult === "hit") {
    const shipType = targetCell.shipType!;
    newOpponentBoard.grid[row][col] = {
      status: "hit",
      shipType,
    };
    newTrackingBoard.grid[row][col] = {
      status: "hit",
      shipType,
    };
  } else if (shotResult === "sunk" && sunkShip) {
    // Mark all cells of the sunk ship as "sunk" on both boards
    for (let r: RowIndex = 0; r < 10; r++) {
      for (let c: ColIndex = 0; c < 10; c++) {
        if (opponent.board.grid[r][c].shipType === sunkShip) {
          newOpponentBoard.grid[r][c] = {
            status: "sunk",
            shipType: sunkShip,
          };
          newTrackingBoard.grid[r][c] = {
            status: "sunk",
            shipType: sunkShip,
          };
        }
      }
    }
  }

  // ---- Update ship hits --------------------------------------
  const newOpponentShips = opponent.ships.map((ship) => {
    const cells = getShipCells(
      ship.length,
      ship.position.start,
      ship.position.orientation
    );
    const wasHit = cells.some(
      (c) => c.col === targetCoordinate.col && c.row === targetCoordinate.row
    );
    return wasHit ? { ...ship, hits: ship.hits + 1 } : ship;
  });

  // ---- Assemble new state ------------------------------------
  const newOpponent: Player = {
    ...opponent,
    board: newOpponentBoard,
    ships: newOpponentShips,
  };

  const newShooter: Player = {
    ...shooter,
    trackingBoard: newTrackingBoard,
  };

  const newPlayers = state.players.map((p) => {
    if (p.id === opponentId) return newOpponent;
    if (p.id === shooterPlayerId) return newShooter;
    return p;
  });

  // Check win condition
  const fleetSunk = isFleetSunk(newOpponentBoard);
  const newPhase: GamePhase = fleetSunk ? "gameOver" : "battle";
  const winner = fleetSunk ? shooterPlayerId : undefined;

  const newState: GameState = {
    ...state,
    players: newPlayers,
    phase: newPhase,
    currentTurn: fleetSunk ? null : opponentId,
    winner: winner ?? null,
  };

  const result: ShotResultPayload = {
    coordinate: targetCoordinate,
    result: shotResult,
    sunkShip,
    nextTurn: opponentId,
    winner,
  };

  return { newState, result };
}

/**
 * Returns true when every cell with a `shipType` on the board has
 * been hit or sunk — i.e. there are zero untouched "ship" cells.
 */
export function isFleetSunk(board: Board): boolean {
  for (let row: RowIndex = 0; row < 10; row++) {
    for (let col: ColIndex = 0; col < 10; col++) {
      const cell = board.grid[row][col];
      if (cell.shipType && cell.status === "ship") {
        return false;
      }
    }
  }
  return true;
}
