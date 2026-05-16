// ============================================================
// rooms.ts — In-memory room / player / grace-timer store
// ============================================================

import { GameState } from "@battleship/shared";
import { createGameState } from "./domain/match.js";

// ---- Stores --------------------------------------------------

/** All active rooms keyed by 6-char room code. */
const rooms = new Map<string, GameState>();

/** Map socket.id → { roomCode, playerId } for disconnect lookup. */
const socketToPlayer = new Map<string, { roomCode: string; playerId: string }>();

/**
 * Active disconnect-grace timers keyed by playerId.
 * Only set during battle phase; expiry triggers forfeit.
 */
const graceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Per-room set of playerIds who have called `playAgain`.
 * When both have, the room resets to placement.
 */
const playAgainRequests = new Map<string, Set<string>>();

/**
 * Stored callbacks for `playAgain` — the first player to call gets their
 * callback stored; the second player's call triggers both callbacks.
 */
const playAgainCallbacks = new Map<string, Map<string, (result: { success: boolean }) => void>>();

// ---- Room Code Generation -------------------------------------

/** Generate a unique 6-char uppercase alphanumeric room code. */
export function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

// ---- Room CRUD ------------------------------------------------

export function createRoom(roomCode: string): GameState {
  const state = createGameState(roomCode);
  rooms.set(roomCode, state);
  return state;
}

export function getRoom(roomCode: string): GameState | undefined {
  return rooms.get(roomCode);
}

export function setRoom(roomCode: string, state: GameState): void {
  rooms.set(roomCode, state);
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

// ---- Player → Socket Mapping ----------------------------------

export function registerPlayer(
  socketId: string,
  roomCode: string,
  playerId: string
): void {
  socketToPlayer.set(socketId, { roomCode, playerId });
}

export function unregisterPlayer(socketId: string): void {
  socketToPlayer.delete(socketId);
}

export function getPlayerInfo(
  socketId: string
): { roomCode: string; playerId: string } | undefined {
  return socketToPlayer.get(socketId);
}

// ---- Grace Timer Management (Battle disconnect) ----------------

export function setGraceTimer(playerId: string, timer: NodeJS.Timeout): void {
  clearGraceTimer(playerId); // safety: never double-stack
  graceTimers.set(playerId, timer);
}

export function clearGraceTimer(playerId: string): void {
  const existing = graceTimers.get(playerId);
  if (existing) {
    clearTimeout(existing);
    graceTimers.delete(playerId);
  }
}

export function hasGraceTimer(playerId: string): boolean {
  return graceTimers.has(playerId);
}

// ---- Play-Again Tracking --------------------------------------

/**
 * Record that `playerId` wants a rematch in `roomCode`.
 * Returns the current count of players who have opted in (1 or 2).
 */
export function addPlayAgainRequest(roomCode: string, playerId: string): number {
  if (!playAgainRequests.has(roomCode)) {
    playAgainRequests.set(roomCode, new Set());
  }
  playAgainRequests.get(roomCode)!.add(playerId);
  return playAgainRequests.get(roomCode)!.size;
}

export function clearPlayAgainRequests(roomCode: string): void {
  playAgainRequests.delete(roomCode);
}

// ---- Play-Again Callbacks -------------------------------------

export function storePlayAgainCallback(
  roomCode: string,
  playerId: string,
  cb: (result: { success: boolean }) => void
): void {
  if (!playAgainCallbacks.has(roomCode)) {
    playAgainCallbacks.set(roomCode, new Map());
  }
  playAgainCallbacks.get(roomCode)!.set(playerId, cb);
}

export function invokePlayAgainCallbacks(roomCode: string): void {
  const cbs = playAgainCallbacks.get(roomCode);
  if (cbs) {
    for (const [, cb] of cbs) {
      cb({ success: true });
    }
    playAgainCallbacks.delete(roomCode);
  }
}
