// ============================================================
// Battleship — shared types
// Canonical source per docs/game_spec.md and docs/api_contract.md
// ============================================================

// ---- Grid & Coordinates -------------------------------------

/** Column index 0–9 (mapped to display labels a–j). */
export type ColIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** Row index 0–9 (mapped to display labels 1–10). */
export type RowIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Coordinate {
  col: ColIndex;
  row: RowIndex;
}

// ---- Cells --------------------------------------------------

export type CellStatus = "empty" | "ship" | "hit" | "miss" | "sunk";

export interface Cell {
  status: CellStatus;
  /** The type of ship occupying this cell (only set when status is 'ship' on the own board). */
  shipType?: ShipType;
}

/** A 10×10 board. Accessed as grid[row][col]. */
export interface Board {
  grid: Cell[][];
}

// ---- Ships --------------------------------------------------

export type ShipType =
  | "Carrier"
  | "Battleship"
  | "Cruiser"
  | "Submarine"
  | "Destroyer";

export type Orientation = "horizontal" | "vertical";

export interface ShipPosition {
  start: Coordinate;
  orientation: Orientation;
}

export interface Ship {
  type: ShipType;
  length: number;
  position: ShipPosition;
  /** Number of hits taken so far. */
  hits: number;
}

/** Ship lengths as defined in docs/game_spec.md §3. */
export const SHIP_LENGTHS: Record<ShipType, number> = {
  Carrier: 5,
  Battleship: 4,
  Cruiser: 3,
  Submarine: 3,
  Destroyer: 2,
};

// ---- Phases -------------------------------------------------

export type GamePhase = "lobby" | "placement" | "battle" | "gameOver";

// ---- Game Mode ----------------------------------------------

export type GameMode = "multiplayer" | "ai";

// ---- Players ------------------------------------------------

export interface Player {
  id: string;
  name: string;
  board: Board;
  trackingBoard: Board;
  ships: Ship[];
  isReady: boolean;
}

// ---- Game State ---------------------------------------------

export interface GameState {
  roomCode: string;
  players: Player[];
  phase: GamePhase;
  /** The game mode — defaults to "multiplayer" if not set. */
  gameMode?: GameMode;
  /** playerId of the player whose turn it is; null when not in battle. */
  currentTurn: string | null;
  /** playerId of the winner; null until game over. */
  winner: string | null;
}

// ---- Placement ----------------------------------------------

export interface ShipPlacement {
  shipType: ShipType;
  start: Coordinate;
  orientation: Orientation;
}

// ---- AI -----------------------------------------------------

/** Timeout in ms for AI move decisions before fallback to random shot. */
export const AI_DECISION_TIMEOUT_MS = 60_000;

// ---- Shot / Battle ------------------------------------------

export type ShotResultType = "miss" | "hit" | "sunk";
export type GameOverReason = "allSunk" | "forfeit";

export interface ShotResultPayload {
  /** The coordinate that was shot. */
  coordinate: Coordinate;
  /** Result for this shot. */
  result: ShotResultType;
  /** When result is 'sunk', the type of ship that was sunk. */
  sunkShip?: ShipType;
  /** playerId of the player whose turn is next. */
  nextTurn: string;
  /** If this shot ended the game, the winner's playerId. */
  winner?: string;
}

export interface GameOverPayload {
  winner: string;
  reason: GameOverReason;
}

export interface ReconnectResultPayload {
  success: boolean;
  /** Full game state on successful reconnect, so client can rebuild. */
  gameState?: GameState;
}

// ---- Socket.IO Typed Events ---------------------------------

export interface ClientToServerEvents {
  /** Create a new room; server responds with roomCreated. */
  createRoom: () => void;

  /** Join an existing room by code. */
  joinRoom: (data: { roomCode: string; playerName: string }) => void;

  /** Submit the player's ship placements. */
  placeShips: (data: { ships: ShipPlacement[] }) => void;

  /** Request server-generated random valid placement. */
  randomizeShips: () => void;

  /** Confirm placement and indicate readiness. */
  playerReady: () => void;

  /** Shoot at a coordinate on the opponent's board. */
  shoot: (data: { coordinate: Coordinate }) => void;

  /** Request reconnection after a disconnect. */
  requestReconnect: (data: { roomCode: string; playerId: string }) => void;

  /** Request a rematch (return to placement phase). */
  playAgain: () => void;
}

export interface ServerToClientEvents {
  /** A room was successfully created. */
  roomCreated: (data: { roomCode: string }) => void;

  /** Another player joined the room. */
  playerJoined: (data: { playerId: string; playerName: string }) => void;

  /** The opponent is ready (placement confirmed). */
  opponentReady: () => void;

  /** Battle phase has begun; indicates who shoots first. */
  battleStart: (data: { currentTurn: string }) => void;

  /** Result of a shot, broadcast to both players. */
  shotResult: (data: ShotResultPayload) => void;

  /** AI reasoning before its shot is processed (AI mode only). */
  aiThinking: (data: { thinking: string; coordinate: Coordinate }) => void;

  /** The game has ended. */
  gameOver: (data: GameOverPayload) => void;

  /** Result of a reconnection attempt. */
  reconnectResult: (data: ReconnectResultPayload) => void;

  /** A player in the room has disconnected. */
  playerDisconnected: (data: { playerId: string }) => void;

  /** A previously disconnected player has reconnected. */
  playerReconnected: (data: { playerId: string }) => void;

  /** Server-side error notification. */
  error: (data: { message: string; code?: string }) => void;

  /** Lobby-level informational notice. */
  lobbyNotice: (data: { message: string }) => void;
}

// ---- Disconnect (built-in Socket.IO event) ------------------
// The server listens for the 'disconnect' event on individual
// sockets. This event is NOT included in the typed interfaces
// above because Socket.IO fires it natively, but the server
// MUST handle it per docs/game_spec.md §8 (Disconnect Handling).
