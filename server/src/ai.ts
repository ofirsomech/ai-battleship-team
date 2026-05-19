// ============================================================
// ai.ts — AI turn orchestration
// Handles the full AI turn flow: think → decide → shoot → result
// ============================================================

import type { GameState, ShotResultPayload } from "@battleship/shared";
import { getAIDecision } from "./aiClient.js";
import type { AIDecision } from "./aiClient.js";
import { applyShot } from "./domain/match.js";

// ---- Constants ------------------------------------------------

/** Minimum simulated thinking delay (ms). */
const AI_THINK_MIN_MS = 500;
/** Maximum additional simulated thinking delay (ms). */
const AI_THINK_RANGE_MS = 1500; // total max = 500 + 1500 = 2000

// ---- Export ---------------------------------------------------

/**
 * Execute a full AI turn:
 * 1. Simulate a thinking delay (500–2000 ms random)
 * 2. Request a move decision from the AI service (or fallback)
 * 3. Apply the shot via domain [`applyShot()`](server/src/domain/match.ts:140)
 * 4. Return the new game state, shot result, and AI reasoning
 */
export async function processAITurn(
  state: GameState,
  aiPlayerId: string
): Promise<{ newState: GameState; result: ShotResultPayload; thinking: string }> {
  // 1. Simulated thinking delay
  const delay = AI_THINK_MIN_MS + Math.floor(Math.random() * AI_THINK_RANGE_MS);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));

  // 2. Get AI decision (service or fallback) — includes reasoning
  const decision: AIDecision = await getAIDecision(state, aiPlayerId);

  // 3. Apply the shot via domain logic
  const { newState, result } = applyShot(state, aiPlayerId, decision.coordinate);
  return { newState, result, thinking: decision.thinking };
}
