# Play vs AI — Architecture Plan

## Overview

Add a "Play vs AI" single-player mode. The AI opponent uses CrewAI + OpenRouter to make strategic decisions. A Python microservice handles AI logic, communicating with the Node.js server via HTTP.

---

## Architecture

```
┌─────────────┐     Socket.IO     ┌──────────────┐     HTTP POST     ┌───────────────┐
│  Browser    │ ◄──────────────► │  Node.js      │ ◄──────────────► │  Python/CrewAI │
│  (React)    │                   │  Express +    │    /api/decide    │  (Flask)       │
│             │                   │  Socket.IO    │                   │  Port 5000     │
└─────────────┘                   └──────────────┘                   └───────────────┘
                                                                             │
                                                                     ┌───────┴───────┐
                                                                     │  OpenRouter    │
                                                                     │  (LLM API)     │
                                                                     └───────────────┘
```

### Key Design Decisions

1. **AI service is a separate Python process** — clean separation, independently testable
2. **Communication via HTTP (not Socket.IO)** — simpler, request/response model fits AI turn-taking
3. **Server acts as bridge** — human's Socket.IO events → server → Python HTTP → back to Socket.IO broadcast
4. **No Socket.IO contract changes** — existing events work identically; AI mode is a server-side implementation detail
5. **AI "plays" as Player 2** — always the opponent, not the host

---

## Changes by Layer

### Client (`client/src/`)
- **Lobby.tsx**: Add "Play vs AI" button alongside existing "Create Room"
- **App.tsx**: Track `gameMode: "multiplayer" | "ai"` in state
- **Store.ts**: Add `gameMode` field — no other changes
- No changes to Board, Cell, Game, or any battle components

### Server (`server/src/`)
- **New: `ai.ts`** — thin wrapper: `async function getAIDecision(gameState: GameState): Promise<Coordinate>`
  - POSTs to `http://localhost:5000/api/decide` with game state JSON
  - Timeout: 15 seconds
  - Fallback: random valid cell (not previously shot) if AI service unavailable
- **New: `aiClient.ts`** — HTTP client helper using `fetch()`
- **socket.ts**: Add `createAIGame` handler:
  - Creates room like `createRoom` but auto-joins AI as Player 2
  - AI's board is auto-randomized (no placement wait)
  - AI auto-readies immediately
  - During battle, when `currentTurn === aiPlayerId`, the server calls `getAIDecision()`
  - Receives coordinate, calls `applyShot()` with AI's playerId, broadcasts `shotResult`
  - Emits `battleStart` immediately after AI joins (both players ready)
- **rooms.ts**: Add `isAIGame` flag to room state; AI player marked
- **index.ts**: Start Python service as child process (optional — or user runs separately)

### Python Service (`ai-service/`)
- **`ai-service/server.py`** — Flask HTTP server on port 5000
  - `POST /api/decide` — accepts game state JSON, returns `{ coordinate: "a5" }`
  - `GET /health` — health check
- **`ai-service/crew.py`** — CrewAI agent setup
  - Uses OpenRouter with model `openai/gpt-4o` or similar
  - Agent prompt: naval warfare strategist, plans next shot based on board state
  - Returns coordinate in format `{col: a-j, row: 1-10}`
- **`ai-service/requirements.txt`** — crewai, flask, openai, etc.

### Shared (`shared/types.ts`)
- Add `gameMode?: "multiplayer" | "ai"` to relevant interfaces (optional field, backward-compatible)
- Add `AI_DECISION_TIMEOUT_MS = 15_000` constant

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| AI service down | Server returns random valid un-shot cell as fallback |
| AI returns invalid coordinate | Server validates; if invalid, uses random fallback |
| AI returns already-shot cell | Server validates double-shot; uses random fallback if invalid |
| AI takes too long (>15s) | Timeout → random fallback |
| Human disconnects mid-game | Same as multiplayer — game drops, no grace period needed |
| Reconnection | Not supported for AI games (single player) |
| Play Again | Human clicks → server auto-readies AI, resets boards |
| Multiple concurrent AI games | Each game sends game state to Python; CrewAI processes independently |
| OpenRouter rate limit | CrewAI retries once; fallback to random on failure |

---

## AI Strategy (CrewAI)

The AI must NOT be random. CrewAI agent will:
1. Parse the tracking board — what cells have been hit/missed/sunk
2. Use a "hunt-and-target" strategy:
   - If a hit was scored and ship not sunk → target adjacent cells (probability)
   - Otherwise → use parity-based or checkerboard pattern to maximize coverage
3. The LLM (via OpenRouter) receives: board state, previous shots, and a strategy prompt
4. Output: a single coordinate in JSON format

The CrewAI agent's role definition:
```
You are a naval warfare AI playing Battleship. You have access to your tracking board
showing hits, misses, and sunk ships. Analyze the board and choose the optimal next
shot using hunt-and-target strategy. Return ONLY a JSON object: {"col": "a-j", "row": 1-10}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenRouter API unavailable | Medium | High | Random fallback; game continues |
| CrewAI slow response | Medium | Medium | 15s timeout; fallback |
| Python service crashes | Low | High | Random fallback per-turn; auto-restart |
| Cost of OpenRouter API calls | Low | Low | ~$0.01/game with small model; user controls API key |
| Existing multi-player tests break | Low | High | AI mode is additive; no existing handlers modified |
| AI makes poor strategic choices | Medium | Low | Acceptable; it's about fun, not optimal play |

---

## Agent Plan

| Order | Agent | Branch | Role |
|-------|-------|--------|------|
| 1 | `db-dev` | `feature/play-vs-ai` | Add types to `shared/types.ts` (gameMode field) |
| 2 | `server-dev` | `feature/play-vs-ai` | Server-side: ai.ts, aiClient.ts, AI room logic in socket.ts, rooms.ts |
| 3 | `client-dev` | `feature/play-vs-ai` | Client-side: Play vs AI button in Lobby, gameMode tracking |
| 4 | Python service | Manual/direct | `ai-service/` directory with Flask + CrewAI |
| 5 | `db-reviewer` | `feature/play-vs-ai` | Review type changes |
| 6 | `server-reviewer` | `feature/play-vs-ai` | Review server changes |
| 7 | `client-reviewer` | `feature/play-vs-ai` | Review client changes |
| 8 | `qa-impl` | `feature/play-vs-ai` | Add AI-mode e2e tests |

---

## Status: PENDING APPROVAL
