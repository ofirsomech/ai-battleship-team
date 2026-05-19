// ============================================================
// aiClient.ts — HTTP client for the Python AI decision service
// POSTs game state, validates response, falls back to random
// ============================================================

import type { GameState, Coordinate, Board, ColIndex, RowIndex } from "@battleship/shared";
import { AI_DECISION_TIMEOUT_MS } from "@battleship/shared";
import { logger } from "./logging.js";

// ---- Types ----------------------------------------------------

/** Payload sent to the AI decision service. */
interface AIDecisionPayload {
  myBoard: Board;
  trackingBoard: Board;
  ships: {
    type: string;
    length: number;
    hits: number;
  }[];
}

// ---- Validation -----------------------------------------------

/**
 * Validate that an unknown value is a legal Coordinate AND the cell
 * has not already been shot on the AI's tracking board.
 */
function isValidAIResponse(
  coord: unknown,
  trackingBoard: Board
): coord is Coordinate {
  if (!coord || typeof coord !== "object") return false;
  const c = coord as Record<string, unknown>;
  if (typeof c.col !== "number" || c.col < 0 || c.col > 9) return false;
  if (typeof c.row !== "number" || c.row < 0 || c.row > 9) return false;

  // Must NOT be a cell already shot
  const cell = trackingBoard.grid[c.row][c.col];
  return (
    cell.status !== "hit" &&
    cell.status !== "miss" &&
    cell.status !== "sunk"
  );
}

// ---- Fallback -------------------------------------------------

/** Return a random un-shot cell from the AI's tracking board. */
function getRandomUnshotCell(trackingBoard: Board): Coordinate {
  const available: Coordinate[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const cell = trackingBoard.grid[row][col];
      if (
        cell.status !== "hit" &&
        cell.status !== "miss" &&
        cell.status !== "sunk"
      ) {
        available.push({
          col: col as ColIndex,
          row: row as RowIndex,
        });
      }
    }
  }

  if (available.length === 0) {
    // Should never happen: the game would already be over
    throw new Error("No available cells to shoot — fleet should be sunk");
  }

  return available[Math.floor(Math.random() * available.length)];
}

// ---- Export ---------------------------------------------------

/**
 * Request a move decision from the external AI service.
 *
 * POSTs the AI player's perspective (own board, tracking board, ships)
 * to the Python AI service at `http://localhost:5000/api/decide`.
 *
 * Falls back to a random un-shot cell if:
 * - The service is unreachable
 * - The response is not valid JSON
 * - The returned coordinate is out-of-bounds or already shot
 * - The request times out (> AI_DECISION_TIMEOUT_MS)
 */
export async function getAIDecision(
  gameState: GameState,
  aiPlayerId: string
): Promise<Coordinate> {
  const aiPlayer = gameState.players.find((p) => p.id === aiPlayerId);
  if (!aiPlayer) {
    throw new Error(`AI player ${aiPlayerId} not found in game state`);
  }

  const payload: AIDecisionPayload = {
    myBoard: aiPlayer.board,
    trackingBoard: aiPlayer.trackingBoard,
    ships: aiPlayer.ships.map((s) => ({
      type: s.type,
      length: s.length,
      hits: s.hits,
    })),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_DECISION_TIMEOUT_MS);

  try {
    const response = await fetch("http://localhost:5000/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!isValidAIResponse(data, aiPlayer.trackingBoard)) {
      throw new Error("AI returned invalid or already-shot coordinate");
    }

    logger.info("AI_DECISION", "AI service returned valid coordinate", {
      aiPlayerId,
      coordinate: data,
    });

    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : String(err);

    logger.warn(
      "AI_FALLBACK_RANDOM",
      `AI service unavailable (${reason}) — falling back to random shot`,
      { aiPlayerId, reason }
    );

    return getRandomUnshotCell(aiPlayer.trackingBoard);
  }
}
