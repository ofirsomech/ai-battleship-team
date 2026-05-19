// ============================================================
// aiClient.ts — HTTP client for the Python AI decision service
// POSTs game state, validates response, falls back to random
// ============================================================

import type { GameState, Coordinate, Board, ColIndex, RowIndex } from "@battleship/shared";
import { AI_DECISION_TIMEOUT_MS } from "@battleship/shared";
import { logger } from "./logging.js";

// ---- Types ----------------------------------------------------

/** Returned by `getAIDecision` — coordinate plus AI reasoning. */
export interface AIDecision {
  coordinate: Coordinate;
  thinking: string;
}

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

// ---- Parsing --------------------------------------------------

/** Default thinking message used when AI reasoning is unavailable. */
const DEFAULT_THINKING = "Analyzing board patterns for optimal targeting...";

/**
 * Parse the Python AI service response into an AIDecision.
 * Expects `{ coordinate: "a5", thinking: "..." }`.
 * Validates that the parsed coordinate is in-bounds and not already shot.
 */
function parseAIDecisionResponse(
  data: unknown,
  trackingBoard: Board
): AIDecision | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const coordStr = typeof d.coordinate === "string" ? d.coordinate.trim().toLowerCase() : "";
  const thinking = typeof d.thinking === "string" && d.thinking.length > 0
    ? d.thinking
    : DEFAULT_THINKING;

  // Parse coordinate string "a5" → { col: 0, row: 4 }
  if (coordStr.length < 2 || coordStr.length > 3) return null;
  const colLetter = coordStr.charAt(0);
  const rowStr = coordStr.slice(1);
  if (colLetter < "a" || colLetter > "j") return null;

  const col = colLetter.charCodeAt(0) - 97; // 'a' → 0, 'j' → 9
  const row = parseInt(rowStr, 10);
  if (isNaN(row) || row < 1 || row > 10) return null;

  const rowIndex = row - 1;

  // Must NOT be a cell already shot
  const cell = trackingBoard.grid[rowIndex]?.[col];
  if (!cell) return null;
  if (cell.status === "hit" || cell.status === "miss" || cell.status === "sunk") {
    return null;
  }

  return {
    coordinate: { col: col as ColIndex, row: rowIndex as RowIndex },
    thinking,
  };
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
 * to the Python AI service. URL configured via `AI_SERVICE_URL` env var
 * (defaults to `http://localhost:5002/api/decide`).
 *
 * The Python service returns `{ coordinate: "a5", thinking: "..." }`.
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
): Promise<AIDecision> {
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
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:5005/api/decide";
    const response = await fetch(aiServiceUrl, {
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

    const decision = parseAIDecisionResponse(data, aiPlayer.trackingBoard);
    if (!decision) {
      throw new Error("AI returned invalid or already-shot coordinate");
    }

    logger.info("AI_DECISION", "AI service returned valid coordinate", {
      aiPlayerId,
      coordinate: decision.coordinate,
    });

    return decision;
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

    return {
      coordinate: getRandomUnshotCell(aiPlayer.trackingBoard),
      thinking: `AI service unavailable (${reason}) — using random targeting.`,
    };
  }
}
