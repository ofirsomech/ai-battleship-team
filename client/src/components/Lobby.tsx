// ============================================================
// Lobby.tsx — Create room / Join room screen
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
}

const Lobby: React.FC<LobbyProps> = ({
  socket,
  roomCode,
  error,
  notice,
  onRoomCreated,
  onJoined,
  onClearError,
}) => {
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("Player 2");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    onClearError();
    socket.emit("createRoom");
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-4xl font-bold text-blue-400 tracking-wider">
        ⚓ BATTLESHIP
      </h1>

      {!roomCode && !isJoining && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          {/* Create Room */}
          <button
            className="btn btn-primary w-full text-lg py-3"
            onClick={handleCreateRoom}
          >
            Create Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full">
            <hr className="flex-1 border-gray-600" />
            <span className="text-gray-500 text-sm">or join existing</span>
            <hr className="flex-1 border-gray-600" />
          </div>

          {/* Join Room */}
          <div className="flex flex-col gap-3 w-full">
            <input
              className="input text-center text-lg tracking-widest"
              type="text"
              maxLength={6}
              placeholder="Room Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
            />
            <input
              className="input"
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="btn btn-success w-full"
              onClick={handleJoinRoom}
              disabled={!joinCode.trim()}
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Room Created — Waiting for opponent */}
      {roomCode && !isJoining && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-600 w-full">
            <p className="text-sm text-gray-400 mb-2">Room Code</p>
            <p className="text-4xl font-bold tracking-[0.5em] text-blue-400 mb-4">
              {roomCode}
            </p>
            <p className="text-sm text-gray-400">
              Share this code with your opponent
            </p>
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            <span>Waiting for opponent to join...</span>
          </div>

          {/* Copy button */}
          <button
            className="btn btn-secondary w-full"
            onClick={() => {
              navigator.clipboard.writeText(roomCode).catch(() => {});
            }}
          >
            📋 Copy Room Code
          </button>
        </div>
      )}

      {/* Joining */}
      {isJoining && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Joining room {joinCode}...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900 border border-red-600 rounded-lg px-4 py-2 text-sm text-red-200 max-w-sm text-center">
          {error}
          <button
            className="block mx-auto mt-1 text-xs text-red-400 hover:text-red-300 underline"
            onClick={onClearError}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg px-4 py-2 text-sm text-yellow-200 max-w-sm text-center">
          {notice}
        </div>
      )}
    </div>
  );
};

export default Lobby;
