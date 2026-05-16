// ============================================================
// socket.ts — Typed Socket.IO client wrapper
// ============================================================

import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@battleship/shared";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Create a typed Socket.IO client connected to the Vite dev proxy.
 * In production, connects to the same origin.
 */
export function createSocket(): TypedSocket {
  const socket: TypedSocket = io({
    autoConnect: false,
  });
  return socket;
}
