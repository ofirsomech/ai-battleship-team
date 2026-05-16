// ============================================================
// socket.ts — Socket.IO event handlers
// Validates inputs, calls domain layer, emits typed events.
// No business logic lives here.
// ============================================================

import type { Server as SocketIOServer, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ShipPlacement,
  Ship,
  Player,
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
} from "./rooms.js";

// ---- Types ----------------------------------------------------

type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Grace window for reconnect during battle (ms). */
const RECONNECT_GRACE_MS = 30_000;

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
): { success: true; board: ReturnType<typeof createEmptyBoard>; ships: Ship[] }
  | { success: false; error: string } {
  // 1. Must be exactly 5
  if (placements.length !== 5) {
    return { success: false, error: "Exactly 5 ships required" };
  }

  // 2. All ship types must be unique and present
  const requiredTypes = new Set(Object.keys(SHIP_LENGTHS));
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
    // ==========================================================
    // 1. createRoom
    // ==========================================================
    socket.on("createRoom", () => {
      try {
        const roomCode = generateRoomCode();
        const state = createRoom(roomCode);
        const playerId = socket.id;
        const playerName = `Player 1`;

        // Add host as first player
        const updated = addPlayerToGameState(state, playerId, playerName);
        setRoom(roomCode, updated);

        // Track socket → player
        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        socket.emit("roomCreated", { roomCode });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create room";
        socket.emit("error", { message: msg, code: "CREATE_ROOM_FAILED" });
      }
    });

    // ==========================================================
    // 2. joinRoom
    // ==========================================================
    socket.on("joinRoom", (data) => {
      try {
        const { roomCode, playerName } = data;
        const state = getRoom(roomCode);

        if (!state) {
          socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }

        if (state.players.length >= 2) {
          socket.emit("error", { message: "Room is full", code: "ROOM_FULL" });
          return;
        }

        const playerId = socket.id;
        const updated = addPlayerToGameState(state, playerId, playerName);
        setRoom(roomCode, updated);

        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        // Broadcast to room
        io.to(roomCode).emit("playerJoined", { playerId, playerName });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to join room";
        socket.emit("error", { message: msg, code: "JOIN_ROOM_FAILED" });
      }
    });

    // ==========================================================
    // 3. placeShips
    // ==========================================================
    socket.on("placeShips", (data) => {
      try {
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to place ships";
        socket.emit("error", { message: msg, code: "PLACE_SHIPS_FAILED" });
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to randomize ships";
        socket.emit("error", { message: msg, code: "RANDOMIZE_FAILED" });
      }
    });

    // ==========================================================
    // 5. playerReady
    // ==========================================================
    socket.on("playerReady", () => {
      try {
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
          socket.emit("error", { message: "Player not in room", code: "PLAYER_NOT_FOUND" });
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
        const updatedPlayers = state.players.map((p) =>
          p.id === playerId ? { ...p, isReady: true } : p
        );

        let updatedState = { ...state, players: updatedPlayers };

        // Notify opponent
        socket.broadcast.to(roomCode).emit("opponentReady");

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
        }

        setRoom(roomCode, updatedState);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to ready";
        socket.emit("error", { message: msg, code: "READY_FAILED" });
      }
    });

    // ==========================================================
    // 6. shoot
    // ==========================================================
    socket.on("shoot", (data) => {
      try {
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

        // Delegate all logic to domain — it validates phase, turn, double-shot
        const { newState, result } = applyShot(state, playerId, data.coordinate);
        setRoom(roomCode, newState);

        // Broadcast shot result to both players
        io.to(roomCode).emit("shotResult", result);

        // Emit gameOver if this shot ended the game
        if (newState.phase === "gameOver") {
          const opponentId = getOpponentId(newState, playerId);
          io.to(roomCode).emit("gameOver", {
            winner: newState.winner!,
            reason: "allSunk",
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Shot failed";
        socket.emit("error", { message: msg, code: "SHOT_FAILED" });
      }
    });

    // ==========================================================
    // 7. requestReconnect
    // ==========================================================
    socket.on("requestReconnect", (data) => {
      try {
        const { roomCode, playerId } = data;
        const state = getRoom(roomCode);

        if (!state) {
          socket.emit("reconnectResult", { success: false });
          return;
        }

        const player = state.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit("reconnectResult", { success: false });
          return;
        }

        // Update socket mapping (old socket is gone, new socket joins)
        socket.data = { roomCode, playerId };
        registerPlayer(socket.id, roomCode, playerId);
        void socket.join(roomCode);

        // Clear any active grace timer for this player
        clearGraceTimer(playerId);

        // Send full game state to reconnecting client
        socket.emit("reconnectResult", { success: true, gameState: state });

        // Notify room that the player is back
        io.to(roomCode).emit("playerReconnected", { playerId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Reconnect failed";
        socket.emit("error", { message: msg, code: "RECONNECT_FAILED" });
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
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Play again failed";
        socket.emit("error", { message: msg, code: "PLAY_AGAIN_FAILED" });
      }
    });

    // ==========================================================
    // 9. disconnect (built-in) — per game_spec.md §8
    // ==========================================================
    socket.on("disconnect", () => {
      const info = getPlayerInfo(socket.id);
      if (!info) return; // socket not associated with any room

      const { roomCode, playerId } = info;
      const state = getRoom(roomCode);
      if (!state) return;

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
        }, RECONNECT_GRACE_MS);

        setGraceTimer(playerId, timer);
        return;
      }

      if (state.phase === "gameOver") {
        // Game is already over — no grace timer needed, just notify.
        io.to(roomCode).emit("playerDisconnected", { playerId });
        return;
      }
    });
  });
}
