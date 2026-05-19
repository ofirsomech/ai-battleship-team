// ============================================================
// App.tsx — Root component with naval-themed connection bar
// ============================================================

import React, { useEffect, useReducer, useRef, useState, useCallback } from "react";
import type { ShipPlacement, ColIndex, RowIndex, Board } from "@battleship/shared";
import { SHIP_LENGTHS } from "@battleship/shared";
import { createSocket, TypedSocket } from "./socket";
import { appReducer, initialState, createEmptyBoard } from "./store";
import Lobby from "./components/Lobby";
import BoardSetup from "./components/BoardSetup";
import Game from "./components/Game";
import GameOverModal from "./components/GameOverModal";

// ---- Helpers --------------------------------------------------

/** Reconstruct a Board from ShipPlacement[] locally */
function buildBoardFromPlacements(placements: ShipPlacement[]): Board {
  let board = createEmptyBoard();
  for (const p of placements) {
    const len = SHIP_LENGTHS[p.shipType];
    const newGrid = board.grid.map((r) => [...r]);
    for (let i = 0; i < len; i++) {
      const c = p.orientation === "horizontal" ? p.start.col + i : p.start.col;
      const r = p.orientation === "vertical" ? p.start.row + i : p.start.row;
      if (c >= 0 && c < 10 && r >= 0 && r < 10) {
        newGrid[r][c] = { status: "ship", shipType: p.shipType };
      }
    }
    board = { grid: newGrid };
  }
  return board;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- App ------------------------------------------------------

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState());
  const socketRef = useRef<TypedSocket | null>(null);
  const [playAgainRequested, setPlayAgainRequested] = useState(false);
  const mountedRef = useRef(true);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase; // keep ref in sync with state

  // ---- Socket lifecycle ---------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    const socket = createSocket(dispatch);
    socketRef.current = socket;

    // ---- Connection events ------------------------------------
    socket.on("connect", () => {
      if (!mountedRef.current) return;
      dispatch({ type: "SET_CONNECTED", isConnected: true });
      dispatch({ type: "SET_PLAYER_ID", playerId: socket.id ?? "unknown" });
    });

    socket.on("disconnect", () => {
      if (!mountedRef.current) return;
      dispatch({ type: "SET_CONNECTED", isConnected: false });
    });

    // ---- roomCreated ------------------------------------------
    socket.on("roomCreated", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "ROOM_CREATED", roomCode: data.roomCode });
    });

    // ---- playerJoined -----------------------------------------
    socket.on("playerJoined", (data) => {
      if (!mountedRef.current) return;
      const myId = socket.id;
      if (data.playerId !== myId) {
        dispatch({
          type: "PLAYER_JOINED",
          playerId: data.playerId,
          playerName: data.playerName,
        });
      } else {
        dispatch({ type: "SET_PHASE", phase: "placement" });
      }
    });

    // ---- opponentReady ----------------------------------------
    socket.on("opponentReady", () => {
      if (!mountedRef.current) return;
      dispatch({ type: "OPPONENT_READY" });
    });

    // ---- battleStart ------------------------------------------
    socket.on("battleStart", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "BATTLE_START", currentTurn: data.currentTurn });
    });

    // ---- shotResult -------------------------------------------
    socket.on("shotResult", (data) => {
      if (!mountedRef.current) return;
      dispatch({
        type: "SHOT_RESULT",
        coordinate: data.coordinate,
        result: data.result,
        sunkShip: data.sunkShip,
        nextTurn: data.nextTurn,
        winner: data.winner,
      });
    });

    // ---- gameOver ---------------------------------------------
    socket.on("gameOver", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "GAME_OVER", winner: data.winner, reason: data.reason });
    });

    // ---- reconnectResult --------------------------------------
    socket.on("reconnectResult", (data) => {
      if (!mountedRef.current) return;
      if (data.success && data.gameState) {
        dispatch({ type: "RECONNECT_RESULT", gameState: data.gameState });
      } else {
        dispatch({
          type: "SET_ERROR",
          error: "Reconnect failed. Room may no longer exist.",
        });
      }
    });

    // ---- playerDisconnected -----------------------------------
    socket.on("playerDisconnected", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "PLAYER_DISCONNECTED", playerId: data.playerId });
    });

    // ---- playerReconnected ------------------------------------
    socket.on("playerReconnected", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "PLAYER_RECONNECTED", playerId: data.playerId });
    });

    // ---- error ------------------------------------------------
    socket.on("error", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "SET_ERROR", error: data.message });
    });

    // ---- lobbyNotice ------------------------------------------
    socket.on("lobbyNotice", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "SET_NOTICE", notice: data.message });
      if (phaseRef.current === "placement") {
        dispatch({ type: "SET_PHASE", phase: "lobby" });
      }
    });

    // ---- aiThinking -------------------------------------------
    socket.on("aiThinking", (data) => {
      if (!mountedRef.current) return;
      dispatch({ type: "SET_AI_THINKING", thinking: data.thinking });
    });

    // ---- Connect ----------------------------------------------
    socket.connect();

    // ---- Cleanup ----------------------------------------------
    return () => {
      mountedRef.current = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Handlers -----------------------------------------------

  const handlePlaceShips = useCallback((ships: ShipPlacement[]) => {
    socketRef.current?.emit("placeShips", { ships });
    const board = buildBoardFromPlacements(ships);
    dispatch({ type: "SET_OWN_BOARD", board });
  }, []);

  const handleRandomize = useCallback(
    (callback: (placements: ShipPlacement[]) => void) => {
      const socket = socketRef.current;
      if (!socket) return;

      (socket as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit(
        "randomizeShips",
        (result: { placements: ShipPlacement[] }) => {
          if (!mountedRef.current) return;
          callback(result.placements);
          const board = buildBoardFromPlacements(result.placements);
          dispatch({ type: "SET_OWN_BOARD", board });
        }
      );
    },
    []
  );

  const handleReady = useCallback(() => {
    socketRef.current?.emit("playerReady");
  }, []);

  const handleShoot = useCallback((col: ColIndex, row: RowIndex) => {
    socketRef.current?.emit("shoot", { coordinate: { col, row } });
  }, []);

  const handlePlayAgain = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    setPlayAgainRequested(true);

    (socket as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit(
      "playAgain",
      (result: { success: boolean }) => {
        if (!mountedRef.current) return;
        if (result.success) {
          dispatch({ type: "RESET_FOR_NEW_GAME" });
          setPlayAgainRequested(false);
        }
      }
    );
  }, []);

  const handleClearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", error: null });
  }, []);

  const handleCreateAIGame = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    dispatch({ type: "SET_GAME_MODE", gameMode: "ai" });

    (socket as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit(
      "createAIGame"
    );
  }, []);

  // ---- Manual reconnect for testing AC-12 ---------------------
  const handleReconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (!state.roomCode || !state.playerId) return;

    socket.connect();
    sleep(300).then(() => {
      if (!mountedRef.current) return;
      socket.emit("requestReconnect", {
        roomCode: state.roomCode!,
        playerId: state.playerId!,
      });
    });
  }, [state.roomCode, state.playerId]);

  // ---- Render -------------------------------------------------

  const { phase } = state;

  return (
    <div
      className="min-h-screen"
      data-phase={phase}
      data-winner={state.winner || ""}
      style={{ backgroundColor: "var(--color-navy-deep)", color: "var(--color-warm-gray-bright)" }}
    >
      {/* Connection status bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        <div
          className="h-full transition-colors"
          style={{
            backgroundColor: state.isConnected
              ? "var(--color-radar-green)"
              : "var(--color-copper)",
          }}
        />
      </div>

      {/* Lobby */}
      {phase === "lobby" && (
        <Lobby
          socket={socketRef.current!}
          roomCode={state.roomCode}
          error={state.error}
          notice={state.notice}
          onRoomCreated={() => {}}
          onJoined={(roomCode, playerName) => {
            socketRef.current?.emit("joinRoom", { roomCode, playerName });
          }}
          onClearError={handleClearError}
          onCreateAIGame={handleCreateAIGame}
        />
      )}

      {/* Placement */}
      {phase === "placement" && (
        <BoardSetup
          ownBoard={state.ownBoard}
          opponentReady={!!state.notice}
          error={state.error}
          onPlaceShips={handlePlaceShips}
          onRandomize={handleRandomize}
          onReady={handleReady}
          onClearError={handleClearError}
        />
      )}

      {/* Battle + GameOver */}
      {(phase === "battle" || phase === "gameOver") && (
        <Game
          ownBoard={state.ownBoard}
          trackingBoard={state.trackingBoard}
          currentTurn={state.currentTurn}
          playerId={state.playerId}
          playerName={state.playerName}
          opponentName={state.opponentName}
          winner={state.winner}
          gameMode={state.gameMode}
          aiLastThinking={state.aiLastThinking}
          onShoot={handleShoot}
          error={state.error}
        />
      )}

      {/* Game Over Modal */}
      {(phase === "gameOver" || !!state.winner) && (
        <GameOverModal
          winner={state.winner!}
          myPlayerId={state.playerId}
          myName={state.playerName}
          opponentName={state.opponentName}
          reason="allSunk"
          onPlayAgain={handlePlayAgain}
          playAgainRequested={playAgainRequested}
        />
      )}

      {/* Debug: Disconnect/Reconnect buttons for testing AC-12 */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 flex gap-2 opacity-30 hover:opacity-100 transition-opacity z-40">
          <button
            className="btn btn-secondary text-xs"
            onClick={() => socketRef.current?.disconnect()}
          >
            DISCONNECT
          </button>
          <button
            className="btn btn-secondary text-xs"
            onClick={handleReconnect}
          >
            RECONNECT
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
