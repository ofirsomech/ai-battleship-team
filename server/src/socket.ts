// ============================================================
// socket.ts — Socket.IO event handlers
// Validates inputs, calls domain layer, emits typed events.
// No business logic lives here.
// Security hardening: F-001, F-002, F-003, F-005, F-010, F-011, F-016
// ============================================================

import { Socket } from "socket.io";
import type { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ShipPlacement,
  Ship,
  ShipType,
  Player,
  Coordinate,
} from "@battleship/shared";
import { SHIP_LENGTHS } from "@battleship/shared";

import {
  createEmptyBoard,
  placeShip,
  randomLayout,
  applyShipsToBoard,
} from "./domain/board.js";
import {
  createGameState,
  addPlayerToGameState,
  applyShot,
  getOpponentId,
} from "./domain/match.js";
import {
  generateRoomCode,
  createRoom,
  getRoom,
  setRoom,
  deleteRoom,
  registerPlayer,
  unregisterPlayer,
  getPlayerInfo,
  setGraceTimer,
  clearGraceTimer,
  addPlayAgainRequest,
  clearPlayAgainRequests,
  invokePlayAgainCallbacks,
  storePlayAgainCallback,
  generateReconnectToken,
  storeReconnectToken,
  validateReconnectToken,
  getReconnectToken,
  trackConnection,
  untrackConnection,
  hasConnectedPlayers,
  getRoomCount,
} from "./rooms.js";
import { processAITurn } from "./ai.js";
import { logger } from "./logging.js";

// ---- Types ----------------------------------------------------

type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Grace window for reconnect during battle (ms). */
const RECONNECT_GRACE_MS = 30_000;

// ---- Rate Limiting (F-001) ------------------------------------

/** Per-socket rate-limit window definitions (ms). */
const RATE_LIMITS: Record<string, number> = {
  createRoom: 5_000,
  joinRoom: 2_000,
  placeShips: 2_000,
  randomizeShips: 1_000,
  playerReady: 1_000,
  shoot: 500,
  requestReconnect: 1_000,
  playAgain: 2_000,
};

/** Track last invocation time per socket per event. */
const rateLimitState = new Map<string, Map<string, number>>();

/**
 * Check if a socket is within its rate limit for an event.
 * Returns true if allowed, false if rate-limited.
 */
function checkRateLimit(socketId: string, event: string): boolean {
  const windowMs = RATE_LIMITS[event];
  if (!windowMs) return true; // no limit defined

  if (!rateLimitState.has(socketId)) {
    rateLimitState.set(socketId, new Map());
  }
  const socketLimits = rateLimitState.get(socketId)!;
  const lastCall = socketLimits.get(event) || 0;
  const now = Date.now();

  if (now - lastCall < windowMs) {
    logger.warn("RATE_LIMITED", `Socket ${socketId} rate-limited on ${event}`, {
      socketId,
      event,
      lastCall,
      now,
      windowMs,
    });
    return false;
  }

  socketLimits.set(event, now);
  return true;
}

/** Clean up rate-limit state for a disconnected socket. */
function clearRateLimitState(socketId: string): void {
  rateLimitState.delete(socketId);
}

// ---- Validation Helpers (F-002) -------------------------------

/** Validate playerName: 1-20 chars, alphanumeric + spaces + underscores. */
function validatePlayerName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return null;
  if (!/^[\w\s]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Validate roomCode: exactly 6 uppercase alphanumeric. */
function validateRoomCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  if (!/^[A-Z0-9]{6}$/.test(code)) return null;
  return code;
}

/** Strip HTML special characters from a string (F-016). */
function sanitizePlayerName(name: string): string {
  return name.replace(/[<>&"']/g, "");
}

// ---- Runtime Type Guards (F-003) ------------------------------

/** Type guard: validate that data contains a valid ShipPlacement array. */
function isValidShipPlacements(
  data: unknown
): data is { ships: ShipPlacement[] } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.ships)) return false;
  if (d.ships.length !== 5) return false;
  for (const item of d.ships) {
    if (!item || typeof item !== "object") return false;
    const s = item as Record<string, unknown>;
    if (typeof s.shipType !== "string") return false;
    if (!s.start || typeof s.start !== "object") return false;
    const start = s.start as Record<string, unknown>;
    if (
      typeof start.col !== "number" ||
      start.col < 0 ||
      start.col > 9
    )
      return false;
    if (
      typeof start.row !== "number" ||
      start.row < 0 ||
      start.row > 9
    )
      return false;
    if (s.orientation !== "horizontal" && s.orientation !== "vertical")
      return false;
  }
  return true;
}

/** Type guard: validate that data contains a valid Coordinate. */
function isValidCoordinate(
  data: unknown
): data is { coordinate: Coordinate } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  const coord = d.coordinate;
  if (!coord || typeof coord !== "object") return false;
  const c = coord as Record<string, unknown>;
  return (
    typeof c.col === "number" &&
    c.col >= 0 &&
    c.col <= 9 &&
    typeof c.row === "number" &&
    c.row >= 0 &&
    c.row <= 9
  );
}

/** Type guard: validate reconnect request data. */
function isValidReconnectData(
  data: unknown
): data is { roomCode: string; playerId: string; reconnectToken: string } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.roomCode === "string" &&
    d.roomCode.length === 6 &&
    typeof d.playerId === "string" &&
    d.playerId.length > 0 &&
    typeof d.reconnectToken === "string" &&
    d.reconnectToken.length > 0
  );
}

// ---- Helpers --------------------------------------------------

/** Build Ship objects from validated ShipPlacement array. */
function shipsFromPlacements(placements: ShipPlacement[]): Ship[] {
  return placements.map((p) => ({
    type: p.shipType,
    length: SHIP_LENGTHS[p.shipType],
    position: { start: p.start, orientation: p.orientation },
    hits: 0,
  }));
}

/**
 * Validate all 5 ships at once: unique types, in-bounds, no overlap, orthogonal.
 * Returns the fully-placed Board on success, or an error string.
 */
function validateAndPlaceAllShips(
  placements: ShipPlacement[]
):
  | { success: true; board: ReturnType<typeof createEmptyBoard>; ships: Ship[] }
  | { success: false; error: string } {
  // 1. Must be exactly 5
  if (placements.length !== 5) {
    return { success: false, error: "Exactly 5 ships required" };
  }

  // 2. All ship types must be unique and present
  const requiredTypes = new Set(Object.keys(SHIP_LENGTHS) as ShipType[]);
  const providedTypes = new Set(placements.map((p) => p.shipType));
  if (requiredTypes.size !== providedTypes.size) {
    return { success: false, error: "Must place all 5 unique ship types" };
  }
  for (const t of requiredTypes) {
    if (!providedTypes.has(t)) {
      return { success: false, error: `Missing ship type: ${t}` };
    }
  }

  // 3. Place ships one-by-one on an accumulating board
  let board = createEmptyBoard();
  for (const p of placements) {
    const result = placeShip(board, p.shipType, p.start, p.orientation);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    board = result.board;
  }

  return { success: true, board, ships: shipsFromPlacements(placements) };
}

// ---- Registration ---------------------------------------------

export function registerHandlers(io: TypedServer): void {
  io.on("connection", (socket: TypedSocket) => {
    // -- IP connection tracking (F-008/F-015) --
    const clientIp =
      (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      socket.handshake.address;

    if (!trackConnection(clientIp)) {
      logger.warn("CONNECTION_REJECTED_IP", `Too many connections from ${clientIp}`, {
        ip: clientIp,
      });
      socket.emit("error", {
        message: "Too many connections from this IP",
        code: "TOO_MANY_CONNECTIONS",
      });
      socket.disconnect(true);
      return;
    }

    logger.info("CONNECTION", `Socket connected`, {
      socketId: socket.id,
      ip: clientIp,
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      untrackConnection(clientIp);
      clearRateLimitState(socket.id);
    });

    // ==========================================================
    // 1. createRoom
    // ==========================================================
    socket.on("createRoom", () => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "createRoom")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const roomCode = generateRoomCode();
        const state = createRoom(roomCode);
        const playerId = socket.id;
        const playerName = "Player 1";

        // Generate reconnect token (F-005)
        const reconnectToken = generateReconnectToken();
        storeReconnectToken(playerId, reconnectToken);

        // Add host as first player
        const updated = addPlayerToGameState(state, playerId, playerName);
        setRoom(roomCode, updated);

        // Track socket → player
        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        socket.emit("roomCreated", { roomCode, reconnectToken } as unknown as {
          roomCode: string;
        });

        logger.info("ROOM_CREATED", `Room ${roomCode} created by ${playerId}`, {
          roomCode,
          playerId,
          totalRooms: getRoomCount(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create room";
        socket.emit("error", { message: msg, code: "CREATE_ROOM_FAILED" });
        logger.error("CREATE_ROOM_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 2A. createAIGame — single-player vs AI
    // ==========================================================
    // Uses the untyped Socket cast because createAIGame is a new
    // internal event not yet defined in the shared contract types.
    (socket as Socket).on("createAIGame", () => {
      try {
        // Rate limit (F-001) — reuse createRoom window
        if (!checkRateLimit(socket.id, "createRoom")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const roomCode = generateRoomCode();
        const state = createRoom(roomCode, "ai");
        const humanPlayerId = socket.id;
        const humanPlayerName = "Player 1";
        const aiPlayerId = `ai-${roomCode}`;
        const aiPlayerName = "AI Commander";

        // Generate reconnect token for the human player (F-005)
        const reconnectToken = generateReconnectToken();
        storeReconnectToken(humanPlayerId, reconnectToken);

        // Add human as first player
        let updated = addPlayerToGameState(state, humanPlayerId, humanPlayerName);

        // Build AI player with auto-randomized board but NOT auto-ready.
        // The human must place ships first, then click Ready. AI auto-readies
        // only after the human is ready (in the playerReady handler).
        const aiPlacements = randomLayout();
        const aiBoard = applyShipsToBoard(createEmptyBoard(), aiPlacements);
        const aiShips = shipsFromPlacements(aiPlacements);

        const aiPlayer: Player = {
          id: aiPlayerId,
          name: aiPlayerName,
          board: aiBoard,
          trackingBoard: createEmptyBoard(),
          ships: aiShips,
          isReady: false,
        };

        updated = {
          ...updated,
          players: [...updated.players, aiPlayer],
          phase: "placement", // transition to placement now that both players are in
        };

        setRoom(roomCode, updated);

        // Track socket → player
        socket.data = { roomCode, playerId: humanPlayerId };
        registerPlayer(socket.id, roomCode, humanPlayerId);
        void socket.join(roomCode);

        // Emit contract events — placement phase starts; no battleStart yet
        socket.emit("roomCreated", { roomCode, reconnectToken } as unknown as {
          roomCode: string;
        });

        socket.emit("playerJoined", {
          playerId: aiPlayerId,
          playerName: aiPlayerName,
          reconnectToken,
        } as unknown as { playerId: string; playerName: string });

        logger.info(
          "AI_GAME_CREATED",
          `AI game created in room ${roomCode} — human: ${humanPlayerId}, AI: ${aiPlayerId}`,
          {
            roomCode,
            humanPlayerId,
            aiPlayerId,
            totalRooms: getRoomCount(),
          }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create AI game";
        socket.emit("error", { message: msg, code: "CREATE_AI_GAME_FAILED" });
        logger.error("CREATE_AI_GAME_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 2. joinRoom
    // ==========================================================
    socket.on("joinRoom", (data) => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "joinRoom")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        // Input validation (F-002)
        const roomCode = validateRoomCode(data.roomCode);
        if (!roomCode) {
          socket.emit("error", {
            message: "Invalid room code",
            code: "INVALID_INPUT",
          });
          return;
        }

        const rawName = validatePlayerName(data.playerName);
        if (!rawName) {
          socket.emit("error", {
            message: "Invalid player name (1-20 alphanumeric characters)",
            code: "INVALID_INPUT",
          });
          return;
        }

        // Sanitize playerName (F-016)
        const playerName = sanitizePlayerName(rawName);

        const state = getRoom(roomCode);

        // Generic error — don't leak room existence (F-011)
        if (!state) {
          logger.warn("JOIN_ROOM_NOT_FOUND", `Join attempt on non-existent room`, {
            roomCode,
            socketId: socket.id,
          });
          socket.emit("error", {
            message: "Cannot join room",
            code: "JOIN_ROOM_FAILED",
          });
          return;
        }

        if (state.players.length >= 2) {
          logger.warn("JOIN_ROOM_FULL", `Join attempt on full room`, {
            roomCode,
            socketId: socket.id,
          });
          socket.emit("error", {
            message: "Cannot join room",
            code: "JOIN_ROOM_FAILED",
          });
          return;
        }

        const playerId = socket.id;

        // Generate reconnect token (F-005)
        const reconnectToken = generateReconnectToken();
        storeReconnectToken(playerId, reconnectToken);

        const updated = addPlayerToGameState(state, playerId, playerName);
        setRoom(roomCode, updated);

        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        // Broadcast to room — include token for the joining player
        io.to(roomCode).emit("playerJoined", {
          playerId,
          playerName,
          reconnectToken,
        } as unknown as { playerId: string; playerName: string });

        // Send the reconnect token directly to the joining socket too
        socket.emit("playerJoined", {
          playerId,
          playerName,
          reconnectToken,
        } as unknown as { playerId: string; playerName: string });

        logger.info(
          "PLAYER_JOINED",
          `Player ${playerId} joined room ${roomCode}`,
          { roomCode, playerId, playerName }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to join room";
        socket.emit("error", { message: msg, code: "JOIN_ROOM_FAILED" });
        logger.error("JOIN_ROOM_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 3. placeShips
    // ==========================================================
    socket.on("placeShips", (data) => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "placeShips")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) {
          socket.emit("error", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }

        // Runtime type guard (F-003)
        if (!isValidShipPlacements(data)) {
          socket.emit("error", {
            message: "Invalid ship placements data",
            code: "INVALID_INPUT",
          });
          return;
        }

        const state = getRoom(roomCode);
        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        if (state.phase !== "placement") {
          socket.emit("error", {
            message: "Can only place ships during placement phase",
            code: "WRONG_PHASE",
          });
          return;
        }

        const { ships: placements } = data;
        const result = validateAndPlaceAllShips(placements);

        if (!result.success) {
          socket.emit("error", { message: result.error, code: "INVALID_PLACEMENT" });
          return;
        }

        // Update player in game state
        const updatedPlayers = state.players.map((p) => {
          if (p.id !== playerId) return p;
          return { ...p, board: result.board, ships: result.ships };
        });

        setRoom(roomCode, { ...state, players: updatedPlayers });

        logger.info("SHIPS_PLACED", `Player ${playerId} placed ships`, {
          roomCode,
          playerId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to place ships";
        socket.emit("error", { message: msg, code: "PLACE_SHIPS_FAILED" });
        logger.error("PLACE_SHIPS_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 4. randomizeShips
    // ==========================================================
    // Uses a regular function (not arrow) to access the
    // acknowledgement callback via `arguments[0]`. Socket.IO typed
    // events declare `() => void` but the client may pass a callback.
    socket.on("randomizeShips", function () {
      // eslint-disable-next-line prefer-rest-params
      const ack: ((result: { placements: ShipPlacement[] }) => void) | undefined =
        typeof arguments[0] === "function" ? arguments[0] : undefined;

      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "randomizeShips")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) {
          socket.emit("error", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }

        const state = getRoom(roomCode);
        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        if (state.phase !== "placement") {
          socket.emit("error", {
            message: "Can only randomize during placement phase",
            code: "WRONG_PHASE",
          });
          return;
        }

        const placements = randomLayout();
        const board = applyShipsToBoard(createEmptyBoard(), placements);
        const ships = shipsFromPlacements(placements);

        // Update player in game state
        const updatedPlayers = state.players.map((p) => {
          if (p.id !== playerId) return p;
          return { ...p, board, ships };
        });

        setRoom(roomCode, { ...state, players: updatedPlayers });

        // Return placements to client via acknowledgement callback
        if (ack) ack({ placements });

        logger.info("SHIPS_RANDOMIZED", `Player ${playerId} randomized ships`, {
          roomCode,
          playerId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to randomize ships";
        socket.emit("error", { message: msg, code: "RANDOMIZE_FAILED" });
        logger.error("RANDOMIZE_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 5. playerReady
    // ==========================================================
    socket.on("playerReady", () => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "playerReady")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) {
          socket.emit("error", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }

        const state = getRoom(roomCode);
        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        if (state.phase !== "placement") {
          socket.emit("error", {
            message: "Can only ready during placement phase",
            code: "WRONG_PHASE",
          });
          return;
        }

        const player = state.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit("error", {
            message: "Player not in room",
            code: "PLAYER_NOT_FOUND",
          });
          return;
        }

        if (player.ships.length !== 5) {
          socket.emit("error", {
            message: "Must place all 5 ships before readying",
            code: "SHIPS_NOT_PLACED",
          });
          return;
        }

        // Mark player ready
        let updatedPlayers = state.players.map((p) =>
          p.id === playerId ? { ...p, isReady: true } : p
        );

        // AI mode: auto-ready the AI player as soon as the human is ready
        if (state.gameMode === "ai") {
          updatedPlayers = updatedPlayers.map((p) =>
            p.id.startsWith("ai-") ? { ...p, isReady: true } : p
          );
        }

        let updatedState = { ...state, players: updatedPlayers };

        // Notify opponent (multiplayer only — AI has no socket)
        if (state.gameMode !== "ai") {
          socket.broadcast.to(roomCode).emit("opponentReady");
        }

        // Check if both ready → start battle
        const bothReady = updatedPlayers.every((p) => p.isReady);
        if (bothReady) {
          const hostId = updatedPlayers[0].id;
          updatedState = {
            ...updatedState,
            phase: "battle",
            currentTurn: hostId, // host shoots first (§5)
          };
          io.to(roomCode).emit("battleStart", { currentTurn: hostId });

          logger.info(
            "BATTLE_STARTED",
            `Battle started in room ${roomCode}`,
            { roomCode, hostId, players: updatedPlayers.map((p) => p.id) }
          );
        }

        setRoom(roomCode, updatedState);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to ready";
        socket.emit("error", { message: msg, code: "READY_FAILED" });
        logger.error("READY_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 6. shoot
    // ==========================================================
    socket.on("shoot", (data) => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "shoot")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) {
          socket.emit("error", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }

        // Runtime type guard (F-003)
        if (!isValidCoordinate(data)) {
          socket.emit("error", {
            message: "Invalid coordinate",
            code: "INVALID_INPUT",
          });
          return;
        }

        const state = getRoom(roomCode);
        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        // Delegate all logic to domain — it validates phase, turn, double-shot
        const { newState, result } = applyShot(state, playerId, data.coordinate);
        setRoom(roomCode, newState);

        // Broadcast shot result to both players
        io.to(roomCode).emit("shotResult", result);

        logger.info(
          "SHOT_FIRED",
          `Player ${playerId} shot at (${data.coordinate.col},${data.coordinate.row}): ${result.result}`,
          {
            roomCode,
            playerId,
            coordinate: data.coordinate,
            result: result.result,
            sunkShip: result.sunkShip ?? null,
          }
        );

        // Emit gameOver if this shot ended the game
        if (newState.phase === "gameOver") {
          const opponentId = getOpponentId(newState, playerId);
          io.to(roomCode).emit("gameOver", {
            winner: newState.winner!,
            reason: "allSunk",
          });

          logger.info(
            "GAME_OVER",
            `Game over in room ${roomCode} — winner: ${newState.winner}`,
            { roomCode, winner: newState.winner, reason: "allSunk" }
          );
        }

        // AI mode: if it's now the AI's turn, process it asynchronously
        if (
          newState.gameMode === "ai" &&
          newState.phase === "battle" &&
          newState.currentTurn?.startsWith("ai-")
        ) {
          const aiPlayerId = newState.currentTurn;

          processAITurn(newState, aiPlayerId)
            .then(({ newState: aiNewState, result: aiResult, thinking }) => {
              setRoom(roomCode, aiNewState);

              // Emit AI thinking before the shot result so the UI can display reasoning
              io.to(roomCode).emit("aiThinking", {
                thinking,
                coordinate: aiResult.coordinate,
              });

              io.to(roomCode).emit("shotResult", aiResult);

              logger.info(
                "AI_SHOT_FIRED",
                `AI ${aiPlayerId} shot at (${aiResult.coordinate.col},${aiResult.coordinate.row}): ${aiResult.result}`,
                {
                  roomCode,
                  aiPlayerId,
                  coordinate: aiResult.coordinate,
                  result: aiResult.result,
                  sunkShip: aiResult.sunkShip ?? null,
                }
              );

              if (aiNewState.phase === "gameOver") {
                io.to(roomCode).emit("gameOver", {
                  winner: aiNewState.winner!,
                  reason: "allSunk",
                });

                logger.info(
                  "AI_GAME_OVER",
                  `AI game over in room ${roomCode} — winner: ${aiNewState.winner}`,
                  { roomCode, winner: aiNewState.winner, reason: "allSunk" }
                );
              }
            })
            .catch((err: unknown) => {
              const msg =
                err instanceof Error ? err.message : "AI turn failed";
              logger.error("AI_TURN_FAILED", msg, {
                roomCode,
                aiPlayerId,
                error: err instanceof Error ? err.stack : String(err),
              });
            });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Shot failed";
        socket.emit("error", { message: msg, code: "SHOT_FAILED" });
        logger.error("SHOT_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 7. requestReconnect
    // ==========================================================
    socket.on("requestReconnect", (data) => {
      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "requestReconnect")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        // Runtime type guard (F-003) — also validates reconnectToken
        if (!isValidReconnectData(data)) {
          socket.emit("reconnectResult", { success: false });
          logger.warn(
            "RECONNECT_INVALID_DATA",
            `Reconnect attempt with invalid data`,
            { socketId: socket.id }
          );
          return;
        }

        const { roomCode, playerId, reconnectToken } = data;

        // Validate reconnect token (F-005)
        if (!validateReconnectToken(playerId, reconnectToken)) {
          socket.emit("reconnectResult", { success: false });
          logger.warn(
            "RECONNECT_INVALID_TOKEN",
            `Reconnect attempt with invalid token for player ${playerId}`,
            { roomCode, playerId, socketId: socket.id }
          );
          return;
        }

        const state = getRoom(roomCode);

        if (!state) {
          socket.emit("reconnectResult", { success: false });
          logger.warn(
            "RECONNECT_ROOM_NOT_FOUND",
            `Reconnect attempt on non-existent room ${roomCode}`,
            { roomCode, playerId, socketId: socket.id }
          );
          return;
        }

        const player = state.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit("reconnectResult", { success: false });
          logger.warn(
            "RECONNECT_PLAYER_NOT_FOUND",
            `Reconnect attempt for unknown player ${playerId}`,
            { roomCode, playerId, socketId: socket.id }
          );
          return;
        }

        // Update socket mapping (old socket is gone, new socket joins)
        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        // Clear any active grace timer for this player
        clearGraceTimer(playerId);

        // Get the new rotated token to send back
        const newToken = getReconnectToken(playerId);

        // Send full game state to reconnecting client
        socket.emit("reconnectResult", {
          success: true,
          gameState: state,
          reconnectToken: newToken,
        } as unknown as { success: boolean; gameState: typeof state });

        // Notify room that the player is back
        io.to(roomCode).emit("playerReconnected", { playerId });

        logger.info(
          "PLAYER_RECONNECTED",
          `Player ${playerId} reconnected to room ${roomCode}`,
          { roomCode, playerId, socketId: socket.id }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Reconnect failed";
        socket.emit("error", { message: msg, code: "RECONNECT_FAILED" });
        logger.error("RECONNECT_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 8. playAgain
    // ==========================================================
    // Uses a regular function (not arrow) to access the
    // acknowledgement callback via `arguments[0]`. Socket.IO typed
    // events declare `() => void` but the client may pass a callback.
    socket.on("playAgain", function () {
      // eslint-disable-next-line prefer-rest-params
      const ack: ((result: { success: boolean }) => void) | undefined =
        typeof arguments[0] === "function" ? arguments[0] : undefined;

      try {
        // Rate limit (F-001)
        if (!checkRateLimit(socket.id, "playAgain")) {
          socket.emit("error", {
            message: "Too many requests — please slow down",
            code: "RATE_LIMITED",
          });
          return;
        }

        const { roomCode, playerId } = socket.data;
        if (!roomCode || !playerId) {
          socket.emit("error", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }

        const state = getRoom(roomCode);
        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        if (state.phase !== "gameOver") {
          socket.emit("error", {
            message: "Can only play again after game over",
            code: "WRONG_PHASE",
          });
          return;
        }

        // ---- AI mode: immediate reset -----------------------------
        if (state.gameMode === "ai") {
          const aiPlayerId = state.players.find((p) =>
            p.id.startsWith("ai-")
          )?.id;

          // Reset AI board to random layout, auto-ready
          const aiPlacements = randomLayout();
          const aiBoard = applyShipsToBoard(createEmptyBoard(), aiPlacements);
          const aiShips = shipsFromPlacements(aiPlacements);

          const freshPlayers: Player[] = state.players.map((p) => {
            if (p.id === aiPlayerId) {
              return {
                ...p,
                board: aiBoard,
                trackingBoard: createEmptyBoard(),
                ships: aiShips,
                isReady: true,
              };
            }
            // Human player — reset to empty, not ready
            return {
              ...p,
              board: createEmptyBoard(),
              trackingBoard: createEmptyBoard(),
              ships: [],
              isReady: false,
            };
          });

          const newState = {
            ...state,
            players: freshPlayers,
            phase: "placement" as const,
            currentTurn: null,
            winner: null,
          };

          setRoom(roomCode, newState);

          // Acknowledge success
          if (ack) ack({ success: true });

          logger.info(
            "AI_REMATCH_STARTED",
            `AI rematch started in room ${roomCode}`,
            { roomCode }
          );
          return;
        }

        // ---- Multiplayer: opt-in flow ----------------------------
        // Store callback if provided
        if (ack) {
          storePlayAgainCallback(roomCode, playerId, ack);
        }

        const optInCount = addPlayAgainRequest(roomCode, playerId);

        if (optInCount === 2) {
          // Both players want a rematch — reset to placement
          const freshPlayers: Player[] = state.players.map((p) => ({
            ...p,
            board: createEmptyBoard(),
            trackingBoard: createEmptyBoard(),
            ships: [],
            isReady: false,
          }));

          const newState = {
            ...state,
            players: freshPlayers,
            phase: "placement" as const,
            currentTurn: null,
            winner: null,
          };

          setRoom(roomCode, newState);
          clearPlayAgainRequests(roomCode);

          // Notify both players via their stored callbacks
          invokePlayAgainCallbacks(roomCode);

          logger.info(
            "REMATCH_STARTED",
            `Rematch started in room ${roomCode}`,
            { roomCode }
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Play again failed";
        socket.emit("error", { message: msg, code: "PLAY_AGAIN_FAILED" });
        logger.error("PLAY_AGAIN_FAILED", msg, {
          socketId: socket.id,
          error: err instanceof Error ? err.stack : String(err),
        });
      }
    });

    // ==========================================================
    // 9. disconnect (built-in) — per game_spec.md §8
    // ==========================================================
    socket.on("disconnect", () => {
      const info = getPlayerInfo(socket.id);
      if (!info) {
        logger.info("DISCONNECT", `Socket ${socket.id} disconnected (no room)`, {
          socketId: socket.id,
        });
        return; // socket not associated with any room
      }

      const { roomCode, playerId } = info;
      const state = getRoom(roomCode);
      if (!state) return;

      logger.info(
        "PLAYER_DISCONNECTED",
        `Player ${playerId} disconnected from room ${roomCode}`,
        { roomCode, playerId, socketId: socket.id, phase: state.phase }
      );

      // Clean up socket mapping
      unregisterPlayer(socket.id);

      if (state.phase === "lobby" || state.phase === "placement") {
        // §8: During Placement (or Lobby) → drop room immediately.
        // Notify the remaining player, then delete the room.
        const remaining = state.players.find((p) => p.id !== playerId);
        if (remaining) {
          io.to(roomCode).emit("lobbyNotice", {
            message: "Opponent disconnected. Returning to lobby.",
          });
          io.to(roomCode).emit("playerDisconnected", { playerId });
        }
        deleteRoom(roomCode);
        clearPlayAgainRequests(roomCode);
        return;
      }

      if (state.phase === "battle") {
        // §8: During Battle → start 30 s grace window.
        io.to(roomCode).emit("playerDisconnected", { playerId });

        const timer = setTimeout(() => {
          // Grace expired — remaining player wins by forfeit
          const freshState = getRoom(roomCode);
          if (!freshState) return; // room already cleaned up

          const survivor = freshState.players.find((p) => p.id !== playerId);
          if (!survivor) return;

          const gameOverState = {
            ...freshState,
            phase: "gameOver" as const,
            winner: survivor.id,
            currentTurn: null,
          };

          setRoom(roomCode, gameOverState);
          io.to(roomCode).emit("gameOver", {
            winner: survivor.id,
            reason: "forfeit",
          });

          logger.info(
            "FORFEIT",
            `Player ${playerId} forfeited — ${survivor.id} wins`,
            { roomCode, forfeitedPlayer: playerId, winner: survivor.id }
          );

          // F-012: Clean up grace timer entry after firing
          clearGraceTimer(playerId);

          // F-007: If other player is also disconnected, schedule cleanup
          if (!hasConnectedPlayers(roomCode)) {
            logger.info(
              "ROOM_CLEANUP_SCHEDULED",
              `Room ${roomCode} has no connected players — will be cleaned up by sweep`,
              { roomCode }
            );
          }
        }, RECONNECT_GRACE_MS);

        setGraceTimer(playerId, timer);
        return;
      }

      if (state.phase === "gameOver") {
        // Game is already over — no grace timer needed, just notify.
        io.to(roomCode).emit("playerDisconnected", { playerId });

        // F-013: Clean up playAgain data
        clearPlayAgainRequests(roomCode);

        // F-007: If no connected players remain, delete room immediately
        if (!hasConnectedPlayers(roomCode)) {
          deleteRoom(roomCode);
        }
        return;
      }
    });
  });
}
