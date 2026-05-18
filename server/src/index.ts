// ============================================================
// index.ts — Express + Socket.IO bootstrap
// Security hardening: F-009, F-014, F-015
// ============================================================

import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@battleship/shared";
import { registerHandlers } from "./socket.js";
import { logger } from "./logging.js";

// ---- Express -------------------------------------------------

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// ---- Health Check --------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ---- HTTP + Socket.IO ----------------------------------------

const httpServer = createServer(app);

// F-015: Limit max concurrent HTTP/Socket.IO connections
httpServer.maxConnections = 5000;

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // F-009: Limit max payload size to 100 KB (default is 1 MB)
  maxHttpBufferSize: 1e5,
  // F-014: Explicit heartbeat and timeout configuration
  pingTimeout: 35_000, // slightly above RECONNECT_GRACE_MS (30s) to avoid races
  pingInterval: 10_000,
  connectTimeout: 10_000,
  cors: {
    origin: "http://localhost:5173",
  },
});

registerHandlers(io);

// ---- Start ---------------------------------------------------

const PORT = 3001;
httpServer.listen(PORT, () => {
  logger.info("SERVER_STARTED", `Battleship server listening on http://localhost:${PORT}`, {
    port: PORT,
  });
});
