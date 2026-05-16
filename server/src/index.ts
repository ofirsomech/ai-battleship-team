// ============================================================
// index.ts — Express + Socket.IO bootstrap
// ============================================================

import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import type { ClientToServerEvents, ServerToClientEvents } from "@battleship/shared";
import { registerHandlers } from "./socket.js";

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

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

registerHandlers(io);

// ---- Start ---------------------------------------------------

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Battleship server listening on http://localhost:${PORT}`);
});
