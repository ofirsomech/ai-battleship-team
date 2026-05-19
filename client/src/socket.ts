// ============================================================
// socket.ts — Typed Socket.IO client wrapper
// ============================================================

import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@battleship/shared";
import type { AppAction } from "./store";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Create a typed Socket.IO client connected to the Vite dev proxy.
 * In production, connects to the same origin.
 */
export function createSocket(
  dispatch?: (action: AppAction) => void
): TypedSocket {
  const socket: TypedSocket = io({
    autoConnect: false,
  });

  // Listen for AI thinking event from server
  socket.on("aiThinking", (data: { thinking: string; coordinate: unknown }) => {
    dispatch?.({ type: "SET_AI_THINKING", thinking: data.thinking });
  });

  return socket;
}
