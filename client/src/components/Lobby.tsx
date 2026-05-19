// ============================================================
// Lobby.tsx — Radar sweep background, stamped naval typography
// ============================================================

import React, { useState } from "react";
import type { TypedSocket } from "../socket";

interface LobbyProps {
  socket: TypedSocket;
  roomCode: string | null;
  error: string | null;
  notice: string | null;
  onRoomCreated: (roomCode: string) => void;
  onJoined: (roomCode: string, playerName: string) => void;
  onClearError: () => void;
  onCreateAIGame: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  socket,
  roomCode,
  error,
  notice,
  onRoomCreated,
  onJoined,
  onClearError,
  onCreateAIGame,
}) => {
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("Player 2");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    onClearError();
    socket.emit("createRoom");
  };

  const handleCreateAIGame = () => {
    onClearError();
    onCreateAIGame();
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    onClearError();
    setIsJoining(true);
    socket.emit("joinRoom", {
      roomCode: joinCode.trim().toUpperCase(),
      playerName: playerName.trim() || "Player 2",
    });
    onJoined(joinCode.trim().toUpperCase(), playerName.trim() || "Player 2");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isJoining) {
      handleJoinRoom();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 relative overflow-hidden">
      {/* Radar sweep overlay — local to lobby */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 330deg, rgba(57,255,20,0.04) 340deg, rgba(57,255,20,0.10) 350deg, rgba(57,255,20,0.22) 357deg, rgba(57,255,20,0.05) 360deg)",
          animation: "radar-sweep 4s linear infinite",
        }}
      />

      {/* Center radar ring decoration */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        style={{
          width: "min(80vmin, 600px)",
          height: "min(80vmin, 600px)",
          borderRadius: "50%",
          border: "1px solid rgba(57,255,20,0.06)",
          boxShadow: "0 0 60px 20px rgba(57,255,20,0.015)",
        }}
      />

      <h1
        className="text-4xl font-bold tracking-[0.25em] animate-stamp-reveal z-10 relative"
        style={{
          fontFamily: "'Crimson Text', serif",
          color: "var(--color-brass)",
          textShadow: "0 2px 6px rgba(0,0,0,0.7), 0 0 30px rgba(201,168,76,0.2)",
        }}
      >
        ⚓ BATTLESHIP
      </h1>

      <p
        className="text-xs tracking-[0.3em] -mt-4 z-10 relative"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: "var(--color-warm-gray-dim)",
          textTransform: "uppercase",
        }}
      >
        NAVAL COMMAND
      </p>

      {!roomCode && !isJoining && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm z-10 relative">
          {/* Create Room */}
          <button
            className="btn btn-primary w-full text-lg py-3"
            onClick={handleCreateRoom}
          >
            CREATE ROOM
          </button>

          {/* Play vs AI */}
          <button
            className="btn w-full text-lg py-3"
            style={{
              background: "linear-gradient(135deg, rgba(57,255,20,0.08), rgba(57,255,20,0.15))",
              borderColor: "var(--color-radar-green)",
              color: "var(--color-radar-green)",
              textShadow: "0 0 8px rgba(57,255,20,0.4)",
            }}
            onClick={handleCreateAIGame}
          >
            🤖 PLAY VS AI
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full">
            <hr className="brass-rule flex-1" />
            <span
              className="text-sm tracking-[0.1em]"
              style={{
                fontFamily: "'Crimson Text', serif",
                fontStyle: "italic",
                color: "var(--color-warm-gray-dim)",
              }}
            >
              or join existing
            </span>
            <hr className="brass-rule flex-1" />
          </div>

          {/* Join Room */}
          <div className="flex flex-col gap-3 w-full">
            <input
              className="input text-center text-lg tracking-[0.3em]"
              type="text"
              maxLength={6}
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
            />
            <input
              className="input"
              type="text"
              placeholder="YOUR NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="btn btn-success w-full"
              onClick={handleJoinRoom}
              disabled={!joinCode.trim()}
            >
              JOIN ROOM
            </button>
          </div>
        </div>
      )}

      {/* Room Created — Waiting for opponent */}
      {roomCode && !isJoining && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm z-10 relative">
          <div className="w-full p-6 text-center relative panel">
            <p
              className="text-sm mb-2 tracking-[0.15em] uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: "var(--color-warm-gray-dim)",
              }}
            >
              Room Code
            </p>
            <p
              className="text-4xl font-bold tracking-[0.4em] mb-4 animate-stamp-reveal"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: "var(--color-brass)",
                textShadow: "0 0 12px rgba(201,168,76,0.3)",
              }}
            >
              {roomCode}
            </p>
            <p
              className="text-sm tracking-[0.05em]"
              style={{
                fontFamily: "'Crimson Text', serif",
                fontStyle: "italic",
                color: "var(--color-warm-gray)",
              }}
            >
              Transmit this code to your opponent
            </p>
          </div>

          <div className="flex items-center gap-3" style={{ color: "var(--color-brass)" }}>
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--color-radar-green)" }}
            />
            <span
              className="text-sm tracking-[0.08em]"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: "var(--color-warm-gray)",
              }}
            >
              AWAITING OPPONENT...
            </span>
          </div>

          {/* Copy button */}
          <button
            className="btn btn-secondary w-full"
            onClick={() => {
              navigator.clipboard.writeText(roomCode).catch(() => {});
            }}
          >
            📋 COPY ROOM CODE
          </button>
        </div>
      )}

      {/* Joining */}
      {isJoining && (
        <div className="flex flex-col items-center gap-4 z-10 relative">
          <div
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: "var(--color-brass-dim)",
              borderTopColor: "transparent",
            }}
          />
          <p
            className="text-sm tracking-[0.1em]"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: "var(--color-warm-gray)",
            }}
          >
            JOINING {joinCode}...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="max-w-sm text-center border px-4 py-2 text-sm z-10 relative toast-error"
        >
          {error}
          <button
            className="block mx-auto mt-1 text-xs underline opacity-60 hover:opacity-100 transition-opacity"
            onClick={onClearError}
            style={{ color: "var(--color-copper)" }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div
          className="max-w-sm text-center border px-4 py-2 text-sm z-10 relative toast-success"
        >
          {notice}
        </div>
      )}
    </div>
  );
};

export default Lobby;
