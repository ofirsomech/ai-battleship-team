// ============================================================
// rooms.ts — In-memory room / player / grace-timer store
// Security hardening: F-004, F-005, F-007, F-008, F-012, F-013
// ============================================================

import { randomBytes } from "node:crypto";
import { GameState } from "@battleship/shared";
import { createGameState } from "./domain/match.js";
import { logger } from "./logging.js";

// ---- Constants ------------------------------------------------

/** Maximum number of concurrent rooms (F-008). */
const MAX_ROOMS = 100;

/** Maximum connections per IP (F-008). */
const MAX_CONNS_PER_IP = 5;

/** Room idle timeout before cleanup sweep removes it (ms) (F-007). */
const ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/** How often the cleanup sweep runs (ms) (F-007). */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Reconnect tokens keyed by playerId (F-005).
 * Generated on room create/join, verified on reconnect.
 */
const reconnectTokens = new Map<string, string>();

/**
 * IP → active socket count for connection limiting (F-008/F-015).
 */
const ipConnectionCounts = new Map<string, number>();

/**
 * Last activity timestamp per room for idle cleanup (F-007).
 */
const roomLastActivity = new Map<string, number>();

// ---- Room Code Generation (F-004) -----------------------------

/** Generate a unique 6-char uppercase alphanumeric room code using CSPRNG. */
export function generateRoomCode(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code: string;
  let attempts = 0;
  do {
    const bytes = randomBytes(6);
    code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet[bytes[i] % alphabet.length];
    }
    attempts++;
    if (attempts > 100) {
      throw new Error("Unable to generate unique room code");
    }
  } while (rooms.has(code));
  return code;
}

// ---- Room CRUD ------------------------------------------------

export function createRoom(roomCode: string): GameState {
  if (rooms.size >= MAX_ROOMS) {
    throw new Error("Server at capacity — too many active rooms");
  }
  const state = createGameState(roomCode);
  rooms.set(roomCode, state);
  roomLastActivity.set(roomCode, Date.now());
  return state;
}

export function getRoom(roomCode: string): GameState | undefined {
  const state = rooms.get(roomCode);
  if (state) {
    roomLastActivity.set(roomCode, Date.now());
  }
  return state;
}

export function setRoom(roomCode: string, state: GameState): void {
  rooms.set(roomCode, state);
  roomLastActivity.set(roomCode, Date.now());
}

export function deleteRoom(roomCode: string): void {
  // Clean up all associated data (F-013)
  const state = rooms.get(roomCode);
  if (state) {
    for (const p of state.players) {
      clearGraceTimer(p.id);
      reconnectTokens.delete(p.id);
    }
  }
  rooms.delete(roomCode);
  playAgainRequests.delete(roomCode);
  playAgainCallbacks.delete(roomCode);
  roomLastActivity.delete(roomCode);
  logger.info("ROOM_DELETED", `Room ${roomCode} deleted`, { roomCode });
}

/** Check if any player in the room still has an active socket (F-007). */
export function hasConnectedPlayers(roomCode: string): boolean {
  for (const [, info] of socketToPlayer) {
    if (info.roomCode === roomCode) return true;
  }
  return false;
}

/** Get the total number of active rooms. */
export function getRoomCount(): number {
  return rooms.size;
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

// ---- Reconnect Tokens (F-005) ---------------------------------

/** Generate a cryptographically random reconnect token. */
export function generateReconnectToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Store a reconnect token for a player.
 * Called when a player creates or joins a room.
 */
export function storeReconnectToken(playerId: string, token: string): void {
  reconnectTokens.set(playerId, token);
}

/**
 * Validate a reconnect token for a player.
 * Returns true if the token matches the stored one.
 * The token is rotated on successful validation to prevent replay.
 */
export function validateReconnectToken(
  playerId: string,
  token: string
): boolean {
  const stored = reconnectTokens.get(playerId);
  if (!stored) return false;
  if (stored !== token) return false;
  // Rotate token after successful use to prevent replay
  const newToken = generateReconnectToken();
  reconnectTokens.set(playerId, newToken);
  return true;
}

/** Get the current reconnect token for a player (to send to client). */
export function getReconnectToken(playerId: string): string | undefined {
  return reconnectTokens.get(playerId);
}

// ---- IP Connection Tracking (F-008/F-015) ---------------------

/**
 * Track a new connection from an IP address.
 * Returns true if the connection is within limits, false if rejected.
 */
export function trackConnection(ip: string): boolean {
  const current = ipConnectionCounts.get(ip) || 0;
  if (current >= MAX_CONNS_PER_IP) {
    logger.warn("CONNECTION_REJECTED", `IP ${ip} exceeded connection limit`, {
      ip,
      current,
      limit: MAX_CONNS_PER_IP,
    });
    return false;
  }
  ipConnectionCounts.set(ip, current + 1);
  return true;
}

/** Release a connection from an IP address (on disconnect). */
export function untrackConnection(ip: string): void {
  const current = ipConnectionCounts.get(ip) || 0;
  if (current <= 1) {
    ipConnectionCounts.delete(ip);
  } else {
    ipConnectionCounts.set(ip, current - 1);
  }
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

// ---- Room Expiry Cleanup (F-007) ------------------------------

/**
 * Scan all rooms and delete those with no connected sockets that have
 * been idle for longer than ROOM_IDLE_TIMEOUT_MS.
 */
function sweepExpiredRooms(): void {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [roomCode, lastActivity] of roomLastActivity) {
    if (now - lastActivity < ROOM_IDLE_TIMEOUT_MS) continue;
    if (hasConnectedPlayers(roomCode)) continue;
    toDelete.push(roomCode);
  }

  for (const roomCode of toDelete) {
    logger.info("ROOM_EXPIRED", `Room ${roomCode} expired — cleaning up`, {
      roomCode,
    });
    deleteRoom(roomCode);
  }

  if (toDelete.length > 0) {
    logger.info(
      "CLEANUP_SWEEP",
      `Cleaned up ${toDelete.length} expired room(s)`,
      { count: toDelete.length }
    );
  }
}

// Start periodic cleanup sweep
const cleanupTimer = setInterval(sweepExpiredRooms, CLEANUP_INTERVAL_MS);
// Allow the process to exit even if the timer is still active
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}
