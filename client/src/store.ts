// ============================================================
// store.ts — Global state via React useReducer + Context
// ============================================================

import type {
  GamePhase,
  GameMode,
  Board,
  Ship,
  ShipPlacement,
  CellStatus,
  Coordinate,
  ColIndex,
  RowIndex,
} from "@battleship/shared";

// ---- State Shape ------------------------------------------------

export interface AppState {
  phase: GamePhase;
  gameMode: GameMode;
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  opponentId: string | null;
  opponentName: string | null;
  ownBoard: Board;
  trackingBoard: Board;
  ships: Ship[];
  currentTurn: string | null;
  winner: string | null;
  isConnected: boolean;
  error: string | null;
  notice: string | null;
  /** In placement: the ship type currently being dragged/placed */
  placingShipType: string | null;
  placingOrientation: "horizontal" | "vertical";
  /** Latest AI thinking text (null when cleared on human turn) */
  aiLastThinking: string | null;
}

/** Create a fresh 10×10 empty board grid */
export function createEmptyBoard(): Board {
  const grid: Board["grid"] = [];
  for (let row = 0; row < 10; row++) {
    grid.push([]);
    for (let col = 0; col < 10; col++) {
      grid[row].push({ status: "empty" as CellStatus });
    }
  }
  return { grid };
}

export function initialState(): AppState {
  return {
    phase: "lobby",
    gameMode: "multiplayer",
    roomCode: null,
    playerId: null,
    playerName: null,
    opponentId: null,
    opponentName: null,
    ownBoard: createEmptyBoard(),
    trackingBoard: createEmptyBoard(),
    ships: [],
    currentTurn: null,
    winner: null,
    isConnected: false,
    error: null,
    notice: null,
    placingShipType: null,
    placingOrientation: "horizontal",
    aiLastThinking: null,
  };
}

// ---- Actions ---------------------------------------------------

export type AppAction =
  | { type: "SET_CONNECTED"; isConnected: boolean }
  | { type: "SET_PLAYER_ID"; playerId: string }
  | { type: "SET_GAME_MODE"; gameMode: GameMode }
  | { type: "ROOM_CREATED"; roomCode: string }
  | { type: "PLAYER_JOINED"; playerId: string; playerName: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_OWN_BOARD"; board: Board }
  | { type: "SET_TRACKING_BOARD"; board: Board }
  | { type: "SET_SHIPS"; ships: Ship[] }
  | { type: "OPPONENT_READY" }
  | { type: "BATTLE_START"; currentTurn: string }
  | { type: "SHOT_RESULT"; coordinate: Coordinate; result: "miss" | "hit" | "sunk"; sunkShip?: string; nextTurn: string; winner?: string }
  | { type: "GAME_OVER"; winner: string; reason: string }
  | { type: "RECONNECT_RESULT"; gameState: import("@battleship/shared").GameState }
  | { type: "PLAYER_DISCONNECTED"; playerId: string }
  | { type: "PLAYER_RECONNECTED"; playerId: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_NOTICE"; notice: string | null }
  | { type: "SET_PLACING_SHIP"; shipType: string | null }
  | { type: "SET_PLACING_ORIENTATION"; orientation: "horizontal" | "vertical" }
  | { type: "UPDATE_CELL"; board: "own" | "tracking"; row: RowIndex; col: ColIndex; status: CellStatus; shipType?: string }
  | { type: "RESET_FOR_NEW_GAME" }
  | { type: "SET_AI_THINKING"; thinking: string | null }
  | { type: "REBUILD_FROM_STATE"; gameState: import("@battleship/shared").GameState; myPlayerId: string };

// ---- Reducer ---------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, isConnected: action.isConnected };

    case "SET_PLAYER_ID":
      return { ...state, playerId: action.playerId };

    case "SET_GAME_MODE":
      return { ...state, gameMode: action.gameMode };

    case "ROOM_CREATED":
      return {
        ...state,
        roomCode: action.roomCode,
        playerName: "Player 1",
        phase: "lobby",
        error: null,
      };

    case "PLAYER_JOINED": {
      // If we're Player 1 (host), the joining player is the opponent
      if (state.playerName === "Player 1" && action.playerId !== state.playerId) {
        return {
          ...state,
          opponentId: action.playerId,
          opponentName: action.playerName,
          phase: "placement",
          error: null,
        };
      }
      // If we're Player 2 (joiner), we need to figure out opponent
      // The opponent is the host who was already in the room
      if (!state.opponentId) {
        return {
          ...state,
          phase: "placement",
          error: null,
          // We don't know the host's id yet; the joiner's own id is known on connect
        };
      }
      return state;
    }

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_OWN_BOARD":
      return { ...state, ownBoard: action.board };

    case "SET_TRACKING_BOARD":
      return { ...state, trackingBoard: action.board };

    case "SET_SHIPS":
      return { ...state, ships: action.ships };

    case "OPPONENT_READY":
      return { ...state, notice: "Opponent is ready!" };

    case "BATTLE_START":
      return {
        ...state,
        phase: "battle",
        currentTurn: action.currentTurn,
        notice: null,
        error: null,
      };

    case "SET_AI_THINKING":
      return { ...state, aiLastThinking: action.thinking };

    case "SHOT_RESULT": {
      const { coordinate, result, sunkShip, nextTurn, winner } = action;
      const { col, row } = coordinate;
      const newOwnBoard = { ...state.ownBoard, grid: state.ownBoard.grid.map((r) => [...r]) };
      const newTrackingBoard = { ...state.trackingBoard, grid: state.trackingBoard.grid.map((r) => [...r]) };

      // Determine if we (this client) fired this shot.
      // state.currentTurn is still the shooter's turn before we update it below.
      const isOurShot = state.currentTurn === state.playerId;

      if (isOurShot) {
        // We are the shooter → update our tracking board
        if (result === "miss") {
          newTrackingBoard.grid[row][col] = { status: "miss" };
        } else if (result === "hit") {
          newTrackingBoard.grid[row][col] = { status: "hit" };
        } else if (result === "sunk") {
          newTrackingBoard.grid[row][col] = { status: "sunk", shipType: sunkShip as import("@battleship/shared").ShipType | undefined };
        }
      } else {
        // The opponent fired this shot → update our own board (the shot landed on our ships)
        if (result === "miss") {
          newOwnBoard.grid[row][col] = { status: "miss" };
        } else if (result === "hit") {
          newOwnBoard.grid[row][col] = { status: "hit" };
        } else if (result === "sunk") {
          newOwnBoard.grid[row][col] = { status: "sunk", shipType: sunkShip as import("@battleship/shared").ShipType | undefined };
        }
      }

      return {
        ...state,
        ownBoard: newOwnBoard,
        trackingBoard: newTrackingBoard,
        currentTurn: nextTurn,
        winner: winner || null,
        phase: winner ? "gameOver" : state.phase,
        aiLastThinking: null,
      };
    }

    case "GAME_OVER":
      return {
        ...state,
        phase: "gameOver",
        winner: action.winner,
        currentTurn: null,
      };

    case "RECONNECT_RESULT": {
      const { gameState } = action;
      const myPlayer = gameState.players.find((p) => p.id === state.playerId);
      const opponent = gameState.players.find((p) => p.id !== state.playerId);
      return {
        ...state,
        phase: gameState.phase,
        roomCode: gameState.roomCode,
        currentTurn: gameState.currentTurn,
        winner: gameState.winner,
        ownBoard: myPlayer?.board ?? state.ownBoard,
        trackingBoard: myPlayer?.trackingBoard ?? state.trackingBoard,
        ships: myPlayer?.ships ?? state.ships,
        opponentId: opponent?.id ?? state.opponentId,
        opponentName: opponent?.name ?? state.opponentName,
        error: null,
      };
    }

    case "PLAYER_DISCONNECTED":
      return {
        ...state,
        notice:
          action.playerId === state.opponentId
            ? "Opponent disconnected. Waiting for reconnect..."
            : state.notice,
      };

    case "PLAYER_RECONNECTED":
      return {
        ...state,
        notice: action.playerId === state.opponentId ? "Opponent reconnected!" : state.notice,
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_NOTICE":
      return { ...state, notice: action.notice };

    case "SET_PLACING_SHIP":
      return { ...state, placingShipType: action.shipType };

    case "SET_PLACING_ORIENTATION":
      return { ...state, placingOrientation: action.orientation };

    case "UPDATE_CELL": {
      const board = action.board === "own" ? { ...state.ownBoard } : { ...state.trackingBoard };
      const newGrid = board.grid.map((r) => [...r]);
      newGrid[action.row][action.col] = {
        status: action.status,
        shipType: action.shipType as import("@battleship/shared").ShipType | undefined,
      };
      if (action.board === "own") {
        return { ...state, ownBoard: { grid: newGrid } };
      }
      return { ...state, trackingBoard: { grid: newGrid } };
    }

    case "RESET_FOR_NEW_GAME":
      return {
        ...state,
        phase: "placement",
        ownBoard: createEmptyBoard(),
        trackingBoard: createEmptyBoard(),
        ships: [],
        currentTurn: null,
        winner: null,
        error: null,
        notice: null,
        placingShipType: null,
        placingOrientation: "horizontal",
        aiLastThinking: null,
      };

    case "REBUILD_FROM_STATE": {
      const { gameState, myPlayerId } = action;
      const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
      const opponent = gameState.players.find((p) => p.id !== myPlayerId);
      return {
        ...state,
        phase: gameState.phase,
        roomCode: gameState.roomCode,
        currentTurn: gameState.currentTurn,
        winner: gameState.winner,
        ownBoard: myPlayer?.board ?? state.ownBoard,
        trackingBoard: myPlayer?.trackingBoard ?? state.trackingBoard,
        ships: myPlayer?.ships ?? state.ships,
        opponentId: opponent?.id ?? state.opponentId,
        opponentName: opponent?.name ?? state.opponentName,
        playerId: myPlayerId,
        isConnected: true,
        error: null,
        notice: null,
      };
    }

    default:
      return state;
  }
}

// ---- Coordinate helpers -----------------------------------------

export const COL_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
export const ROW_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function colLabel(col: ColIndex): string {
  return COL_LABELS[col];
}

export function rowLabel(row: RowIndex): string {
  return ROW_LABELS[row];
}

export function formatCoordinate(col: ColIndex, row: RowIndex): string {
  return `${colLabel(col)}${rowLabel(row)}`;
}
