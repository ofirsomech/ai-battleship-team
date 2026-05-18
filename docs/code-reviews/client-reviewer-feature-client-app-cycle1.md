# Client Review — `feature/client-app` (Cycle 1 Re-review)

**Reviewer**: `client-reviewer`  
**Date**: 2026-05-16T22:05:00Z  
**Branch**: `feature/client-app`  
**Status**: **APPROVE**

---

## 1. Cycle 0 REJECT Resolution

| # | Cycle 0 Issue | File | Fix Applied | Status |
|---|---------------|------|-------------|--------|
| 1 | Inline `style={{ flexDirection: ... }}` | [`ShipPalette.tsx:66`](client/src/components/ShipPalette.tsx:66) | Replaced with `className={`flex gap-1 ${currentOrientation === "vertical" ? "flex-col" : ""}`}` | ✅ RESOLVED |
| 2 | Stale closure in `lobbyNotice` handler | [`App.tsx:46-47`](client/src/App.tsx:46), [`App.tsx:158`](client/src/App.tsx:158) | Added `phaseRef = useRef(state.phase)` synced on each render; handler reads `phaseRef.current` | ✅ RESOLVED |

---

## 2. Verification Checklist

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | TypeScript build (`npm --workspace client run build`) | ✅ PASS | `tsc && vite build` — 71 modules, 0 errors |
| 2 | No inline `style={}` in `client/src/` — Tailwind only | ✅ PASS | `grep -rn "style={" client/src/` returned zero matches |
| 3 | ShipPalette fix confirmed | ✅ PASS | Line 66 uses `className={`flex gap-1 ${...}`}` — Tailwind `flex-col` class toggle |
| 4 | App.tsx stale closure fix confirmed | ✅ PASS | `phaseRef` declared at line 46, synced at line 47, read at line 158 |
| 5 | No `useState`/`useEffect`/`useReducer` in `components/ui/` | ✅ PASS | Zero matches in all 6 UI files |
| 6 | No Socket.IO (`socket`, `emit`, `on(`) in `components/ui/` | ✅ PASS | Zero matches in all 6 UI files |
| 7 | Coordinates render as a–j × 1–10 | ✅ PASS | [`store.ts:323-324`](client/src/store.ts:323) — `COL_LABELS` / `ROW_LABELS` |
| 8 | All Socket.IO events match contract | ✅ PASS | All 19 events verified (see §3) |
| 9 | Cleanup on unmount | ✅ PASS | [`App.tsx:167-171`](client/src/App.tsx:167) + [`BoardSetup.tsx:303`](client/src/components/BoardSetup.tsx:303) |
| 10 | No `any` types | ✅ PASS | Only `unknown` + narrowing pattern for ack callbacks |

---

## 3. Socket Event Mapping (Contract Compliance)

### Server→Client Events (listeners in App.tsx)

| # | Contract Event | Listener Location | Match |
|---|----------------|-------------------|-------|
| 2 | `roomCreated` | [`App.tsx:68`](client/src/App.tsx:68) | ✅ |
| 4 | `playerJoined` | [`App.tsx:74`](client/src/App.tsx:74) | ✅ |
| 8 | `opponentReady` | [`App.tsx:92`](client/src/App.tsx:92) | ✅ |
| 9 | `battleStart` | [`App.tsx:98`](client/src/App.tsx:98) | ✅ |
| 11 | `shotResult` | [`App.tsx:104`](client/src/App.tsx:104) | ✅ |
| 12 | `gameOver` | [`App.tsx:117`](client/src/App.tsx:117) | ✅ |
| 14 | `reconnectResult` | [`App.tsx:123`](client/src/App.tsx:123) | ✅ |
| 15 | `playerDisconnected` | [`App.tsx:136`](client/src/App.tsx:136) | ✅ |
| 16 | `playerReconnected` | [`App.tsx:142`](client/src/App.tsx:142) | ✅ |
| 18 | `error` | [`App.tsx:148`](client/src/App.tsx:148) | ✅ |
| 19 | `lobbyNotice` | [`App.tsx:154`](client/src/App.tsx:154) | ✅ |
| — | `connect` (built-in) | [`App.tsx:56`](client/src/App.tsx:56) | ✅ |
| — | `disconnect` (built-in) | [`App.tsx:62`](client/src/App.tsx:62) | ✅ |

### Client→Server Events (emits)

| # | Contract Event | Emit Location | Match |
|---|----------------|---------------|-------|
| 1 | `createRoom` | [`Lobby.tsx:33`](client/src/components/Lobby.tsx:33) | ✅ |
| 3 | `joinRoom` | [`Lobby.tsx:40`](client/src/components/Lobby.tsx:40), [`App.tsx:277`](client/src/App.tsx:277) | ✅ |
| 5 | `placeShips` | [`App.tsx:178`](client/src/App.tsx:178) | ✅ |
| 6 | `randomizeShips` | [`App.tsx:191`](client/src/App.tsx:191) (untyped emit with ack callback) | ✅ |
| 7 | `playerReady` | [`App.tsx:206`](client/src/App.tsx:206) | ✅ |
| 10 | `shoot` | [`App.tsx:210`](client/src/App.tsx:210) | ✅ |
| 13 | `requestReconnect` | [`App.tsx:246`](client/src/App.tsx:246) | ✅ |
| 17 | `playAgain` | [`App.tsx:219`](client/src/App.tsx:219) (untyped emit with ack callback) | ✅ |

---

## 4. Acceptance Criteria Coverage

| AC | Description | Coverage | Evidence |
|----|-------------|----------|----------|
| AC-1 | Player 1 creates room, gets 6-char code | ✅ Reachable | Lobby "Create Room" → `createRoom` → `roomCreated` → displays `roomCode` |
| AC-2 | Player 2 joins by code | ✅ Reachable | Lobby join input → `joinRoom` → `playerJoined` → transitions to placement |
| AC-3 | Drag-and-drop placement with rotation | ✅ Reachable | ShipPalette draggable + Board drop targets + R key / button rotation |
| AC-4 | Randomize button → valid layout | ✅ Reachable | BoardSetup Randomize button → `randomizeShips` ack → rebuilds board |
| AC-5 | Placement validation (no overlap, in-bounds) | ✅ Reachable | `isValidPlacement()` in BoardSetup checks bounds + overlap; server validates |
| AC-6 | Battle starts when both Ready | ✅ Reachable | Ready button → `playerReady` → `opponentReady` → `battleStart` |
| AC-7 | Clear turn indicator | ✅ Reachable | TurnIndicator shows "Your Turn" / "Opponent's Turn" with color coding |
| AC-8 | Shot updates both clients | ✅ Reachable | `shoot` → `shotResult` broadcast → SHOT_RESULT updates ownBoard + trackingBoard |
| AC-9 | Hit V (red), Miss x (gray), Sunk highlight | ✅ Reachable | Cell.tsx displays V/x + CSS `.cell.hit` (pulse), `.cell.miss`, `.cell.sunk` (sunk-reveal) |
| AC-10 | Re-shoot rejection | ✅ Reachable | Game.tsx:39 returns early if cell already hit/miss/sunk; server validates |
| AC-11 | gameOver event + both boards reveal | ✅ Reachable | `gameOver` → GAME_OVER reducer + GameOverModal; Game shows both boards |
| AC-12 | Disconnect/reconnect (30s grace) | ✅ Reachable | Debug DC/RC buttons + `requestReconnect` + `reconnectResult` + `playerReconnected` |
| AC-13 | Play Again returns to Placement | ✅ Reachable | GameOverModal Play Again → `playAgain` ack → RESET_FOR_NEW_GAME |

---

## 5. Component Inventory

| File | Purpose | Tailwind | Hooks | Socket |
|------|---------|----------|-------|--------|
| [`App.tsx`](client/src/App.tsx) | Root: socket wiring, phase routing, state | ✅ | useReducer, useRef, useState, useEffect, useCallback | ✅ |
| [`store.ts`](client/src/store.ts) | AppState + appReducer + coordinate helpers | n/a | n/a | — |
| [`socket.ts`](client/src/socket.ts) | Typed Socket.IO client factory | n/a | n/a | ✅ |
| [`Board.tsx`](client/src/components/Board.tsx) | 10×10 grid with labels | ✅ | — | — |
| [`BoardSetup.tsx`](client/src/components/BoardSetup.tsx) | Placement phase: drag-drop, randomize, ready | ✅ | useState, useCallback, useEffect, useRef | — |
| [`Cell.tsx`](client/src/components/Cell.tsx) | Individual grid cell | ✅ | — | — |
| [`Game.tsx`](client/src/components/Game.tsx) | Battle phase: boards + turn indicator | ✅ | useCallback | — |
| [`GameOverModal.tsx`](client/src/components/GameOverModal.tsx) | End-of-game overlay | ✅ | — | — |
| [`Lobby.tsx`](client/src/components/Lobby.tsx) | Create/Join room UI | ✅ | useState | ✅ (emit only) |
| [`ShipPalette.tsx`](client/src/components/ShipPalette.tsx) | Draggable ship list | ✅ | — | — |
| [`TurnIndicator.tsx`](client/src/components/TurnIndicator.tsx) | Whose-turn banner | ✅ | — | — |
| [`Button.tsx`](client/src/components/ui/Button.tsx) | Dumb button (unused) | ✅ | — | — |
| [`IconHit.tsx`](client/src/components/ui/IconHit.tsx) | Hit icon (unused) | ✅ | — | — |
| [`IconMiss.tsx`](client/src/components/ui/IconMiss.tsx) | Miss icon (unused) | ✅ | — | — |
| [`Modal.tsx`](client/src/components/ui/Modal.tsx) | Overlay modal (unused) | ✅ | — | — |
| [`ShipBlock.tsx`](client/src/components/ui/ShipBlock.tsx) | Ship segment block (unused) | ✅ | — | — |
| [`Toast.tsx`](client/src/components/ui/Toast.tsx) | Notification toast (unused) | ✅ | — | — |

---

## 6. Notes (Non-Blocking)

1. **Unused UI components**: [`Button.tsx`](client/src/components/ui/Button.tsx), [`IconHit.tsx`](client/src/components/ui/IconHit.tsx), [`IconMiss.tsx`](client/src/components/ui/IconMiss.tsx), [`Modal.tsx`](client/src/components/ui/Modal.tsx), [`ShipBlock.tsx`](client/src/components/ui/ShipBlock.tsx), [`Toast.tsx`](client/src/components/ui/Toast.tsx) exist but are never imported. The app uses CSS utility classes (`.btn`, `.btn-primary`, etc.) directly instead. These are dead code — not a violation of any rule, but worth a cleanup pass before `main`.

2. **Animation class mismatch in unused components**: [`IconHit.tsx:19`](client/src/components/ui/IconHit.tsx:19) references `animate-pulse-hit` and [`ShipBlock.tsx:33`](client/src/components/ui/ShipBlock.tsx:33) references `animate-sunk-reveal`, but the CSS defines `@keyframes pulse-hit` and `@keyframes sunk-reveal` without the `animate-` prefixed utility classes. Since neither component is imported, this has zero runtime impact.

3. **`randomizeShips` and `playAgain` use untyped emit**: These two events include acknowledgment callbacks which aren't part of the typed Socket.IO interface. The code correctly casts through `unknown` (not `any`, per rules) at [`App.tsx:191`](client/src/App.tsx:191) and [`App.tsx:219`](client/src/App.tsx:219). This pattern is acceptable given Socket.IO's type system limitations with ack callbacks.

---

## 7. Summary

Both Cycle 0 blockers are resolved:

- **Blocker #1** (inline `style={{}}` in ShipPalette): Replaced with Tailwind `flex-col` conditional class. Verified via `grep` — zero `style={` matches in the entire `client/src/` tree.
- **Warning #2** (stale closure in `lobbyNotice` handler): Fixed with `phaseRef` pattern — ref synced on every render, handler reads `phaseRef.current`.

All 13 acceptance criteria remain reachable. All 19 Socket.IO events from the API contract have matching client implementations. The build compiles cleanly. Component architecture respects the UI/business-logic separation. Zero inline styles, zero `any` types.

**Verdict: APPROVE** — the Cycle 0 reject conditions are satisfied. Ready for merge to `dev`.
