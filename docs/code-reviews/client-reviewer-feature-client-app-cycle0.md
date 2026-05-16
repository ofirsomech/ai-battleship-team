# Client Review — `feature/client-app` (Cycle 0)

**Reviewer**: `client-reviewer`  
**Date**: 2026-05-16T21:50:00Z  
**Branch**: `feature/client-app`  
**Status**: **REJECT**

---

## 1. Verification Checklist

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | TypeScript build (`npm --workspace client run build`) | ✅ PASS | `tsc && vite build` — 71 modules transformed, no errors |
| 2 | No inline `style={}` — Tailwind only | ❌ FAIL | 1 instance at [`client/src/components/ShipPalette.tsx:67`](client/src/components/ShipPalette.tsx:67) |
| 3 | No `useState`/`useEffect`/`useReducer` in `components/ui/` | ✅ PASS | Zero matches in all 6 UI files |
| 4 | No Socket.IO (`socket`, `emit`, `on(`) in `components/ui/` | ✅ PASS | Zero matches in all 6 UI files |
| 5 | Coordinates render as a–j × 1–10 | ✅ PASS | [`store.ts:323-324`](client/src/store.ts:323) defines COL_LABELS/ROW_LABELS; Board/Cell use them consistently |
| 6 | All Socket.IO events match contract | ✅ PASS | All 11 server→client events + 8 client→server events verified (see §3) |
| 7 | Cleanup on unmount | ✅ PASS | [`App.tsx:165-168`](client/src/App.tsx:165) — `removeAllListeners()` + `disconnect()` |

---

## 2. Findings

### ❌ REJECT — Issue 1: Inline `style={{}}` in ShipPalette

- **File**: [`client/src/components/ShipPalette.tsx:67-70`](client/src/components/ShipPalette.tsx:67)
- **Violation**: `.roo/rules/01-tech-stack.md` — *"No CSS-in-JS, no inline `style={}`. Tailwind classes only."*
- **Code**:
  ```tsx
  <div
    className="flex gap-1"
    style={{
      flexDirection:
        currentOrientation === "horizontal" ? "row" : "column",
    }}
  >
  ```
- **Required fix**: Replace the inline `style` with conditional Tailwind classes:
  ```tsx
  <div className={`flex gap-1 ${currentOrientation === "horizontal" ? "flex-row" : "flex-col"}`}>
  ```
  The `flex-direction` defaults to `row` in CSS, so `flex-row` is technically redundant but explicit. Alternatively, just toggle `flex-col`:
  ```tsx
  <div className={`flex gap-1${currentOrientation === "vertical" ? " flex-col" : ""}`}>
  ```

### ⚠️ WARNING — Issue 2: Stale closure in `lobbyNotice` handler

- **File**: [`client/src/App.tsx:152-158`](client/src/App.tsx:152)
- **Details**: The `lobbyNotice` socket handler reads `state.phase` from the closure captured when the `useEffect` ran (first render, `[]` deps). At that time, `state.phase === "lobby"`. When the server sends a `lobbyNotice` during the placement phase (opponent disconnected), the condition on line 156 (`state.phase === "placement"`) will evaluate with a stale value and **not** dispatch `SET_PHASE("lobby")`.
- **Impact**: The notice message still displays via `SET_NOTICE`. The auto-transition back to the lobby screen will not fire, but the user can manually navigate or refresh. AC-12 (disconnect) remains reachable.
- **Suggested fix**: Use a ref (`phaseRef.current`) that's kept in sync with `state.phase` via a separate `useEffect`, or include `state.phase` in the deps array (with careful socket reconnection handling).

### ℹ️ INFO — Issue 3: Unused `Button` component

- **File**: [`client/src/components/ui/Button.tsx`](client/src/components/ui/Button.tsx)
- **Details**: The `Button` component exists but is never imported or rendered. All buttons in the app use CSS utility classes (`.btn`, `.btn-primary`, etc.) defined in [`styles/index.css`](client/src/styles/index.css:195-214). Not a violation — just dead code.

---

## 3. Socket Event Mapping (Contract Compliance)

### Server→Client Events (listeners in App.tsx)

| # | Contract Event | Listener Location | Match |
|---|---|---|---|
| 2 | `roomCreated` | [`App.tsx:66`](client/src/App.tsx:66) | ✅ |
| 4 | `playerJoined` | [`App.tsx:72`](client/src/App.tsx:72) | ✅ |
| 8 | `opponentReady` | [`App.tsx:90`](client/src/App.tsx:90) | ✅ |
| 9 | `battleStart` | [`App.tsx:96`](client/src/App.tsx:96) | ✅ |
| 11 | `shotResult` | [`App.tsx:102`](client/src/App.tsx:102) | ✅ |
| 12 | `gameOver` | [`App.tsx:115`](client/src/App.tsx:115) | ✅ |
| 14 | `reconnectResult` | [`App.tsx:121`](client/src/App.tsx:121) | ✅ |
| 15 | `playerDisconnected` | [`App.tsx:134`](client/src/App.tsx:134) | ✅ |
| 16 | `playerReconnected` | [`App.tsx:140`](client/src/App.tsx:140) | ✅ |
| 18 | `error` | [`App.tsx:146`](client/src/App.tsx:146) | ✅ |
| 19 | `lobbyNotice` | [`App.tsx:152`](client/src/App.tsx:152) | ✅ |
| — | `connect` (built-in) | [`App.tsx:54`](client/src/App.tsx:54) | ✅ |
| — | `disconnect` (built-in) | [`App.tsx:60`](client/src/App.tsx:60) | ✅ |

### Client→Server Events (emits)

| # | Contract Event | Emit Location | Match |
|---|---|---|---|
| 1 | `createRoom` | [`Lobby.tsx:33`](client/src/components/Lobby.tsx:33) | ✅ |
| 3 | `joinRoom` | [`Lobby.tsx:40`](client/src/components/Lobby.tsx:40), [`App.tsx:275`](client/src/App.tsx:275) | ✅ |
| 5 | `placeShips` | [`App.tsx:176`](client/src/App.tsx:176) | ✅ |
| 6 | `randomizeShips` | [`App.tsx:189-198`](client/src/App.tsx:189) (untyped emit with ack callback) | ✅ |
| 7 | `playerReady` | [`App.tsx:204`](client/src/App.tsx:204) | ✅ |
| 10 | `shoot` | [`App.tsx:208`](client/src/App.tsx:208) | ✅ |
| 13 | `requestReconnect` | [`App.tsx:244`](client/src/App.tsx:244) | ✅ |
| 17 | `playAgain` | [`App.tsx:217-226`](client/src/App.tsx:217) (untyped emit with ack callback) | ✅ |

---

## 4. Acceptance Criteria Coverage

| AC | Description | Coverage | Evidence |
|----|-------------|----------|----------|
| AC-1 | Player 1 creates room, gets 6-char code | ✅ Reachable | Lobby "Create Room" → `createRoom` → `roomCreated` → displays `roomCode` |
| AC-2 | Player 2 joins by code | ✅ Reachable | Lobby join input → `joinRoom` → `playerJoined` → transitions to placement |
| AC-3 | Drag-and-drop placement with rotation | ✅ Reachable | ShipPalette draggable + Board drop targets + R key rotation |
| AC-4 | Randomize button → valid layout | ✅ Reachable | BoardSetup Randomize button → `randomizeShips` ack |
| AC-5 | Placement validation (no overlap, in-bounds) | ✅ Reachable | `isValidPlacement()` in BoardSetup checks bounds + overlap |
| AC-6 | Battle starts when both Ready | ✅ Reachable | Ready button → `playerReady` → `opponentReady` → `battleStart` |
| AC-7 | Clear turn indicator | ✅ Reachable | TurnIndicator shows Your Turn / Opponent's Turn |
| AC-8 | Shot updates both clients | ✅ Reachable | `shoot` → `shotResult` broadcast → SHOT_RESULT reducer updates both boards |
| AC-9 | Hit V (red), Miss x (gray), Sunk highlight | ✅ Reachable | Cell.tsx displays V/x + CSS classes `.cell.hit`, `.cell.miss`, `.cell.sunk` |
| AC-10 | Re-shoot rejection | ✅ Reachable | Game.tsx:39 returns early if cell already hit/miss/sunk |
| AC-11 | gameOver event + both boards reveal | ✅ Reachable | `gameOver` → GAME_OVER reducer + GameOverModal |
| AC-12 | Disconnect/reconnect (30s grace) | ✅ Reachable | Debug Disconnect/Reconnect buttons + `requestReconnect` + `reconnectResult` |
| AC-13 | Play Again returns to Placement | ✅ Reachable | GameOverModal Play Again → `playAgain` ack → RESET_FOR_NEW_GAME |

---

## 5. Summary

The client implementation is **well-structured and contract-compliant**. All 13 ACs are reachable, all Socket.IO events map correctly to the API contract, the build compiles cleanly, UI components are properly separated from business logic, and coordinates use a–j × 1–10 notation.

**One hard rule violation prevents approval**: an inline `style={{}}` at [`client/src/components/ShipPalette.tsx:67`](client/src/components/ShipPalette.tsx:67) violates the "Tailwind only, no inline styles" rule from [`.roo/rules/01-tech-stack.md`](.roo/rules/01-tech-stack.md).

The fix is a one-line CSS class change. Recommend re-spawning `client-dev` or `template-dev` for a quick cycle-1 patch.
