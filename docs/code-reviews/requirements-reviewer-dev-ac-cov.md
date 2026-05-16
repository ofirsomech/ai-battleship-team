# Requirements Review — `dev` Branch AC Coverage

> **Agent**: Requirements AI (`requirements-reviewer`)  
> **Date**: 2026-05-16T22:15:00Z  
> **Branch**: `dev`  
> **Status**: AC_COV — all 13 acceptance criteria verified as reachable

---

## Methodology

Each AC from [`docs/game_spec.md`](../game_spec.md:84-100) was traced through:

1. **Client source** — verifying UI entry points, user gestures, component rendering, store state transitions.
2. **Server source** — verifying event handlers, domain validation, room management, disconnect/reconnect logic.
3. **Shared types** — verifying all Socket.IO events match `docs/api_contract.md`.
4. **Unit tests** — `server/src/domain/__tests__/` (57 passing) confirm domain logic.

---

## Per-AC Trace

### AC-1 — Player 1 lands on `/`, sees "Create room" CTA, receives 6-char code

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| UI render | [`client/src/components/Lobby.tsx:62-67`](../client/src/components/Lobby.tsx:62) | "Create Room" button rendered in initial lobby state (`!roomCode && !isJoining`) |
| Event emit | [`client/src/components/Lobby.tsx:31-34`](../client/src/components/Lobby.tsx:31) | `socket.emit("createRoom")` on button click |
| Server handler | [`server/src/socket.ts:112-133`](../server/src/socket.ts:112) | `createRoom` → `generateRoomCode()` → `roomCreated` emit |
| Code gen | [`server/src/rooms.ts:37-43`](../server/src/rooms.ts:37) | 6-char uppercase alphanumeric via `Math.random().toString(36).substring(2, 8).toUpperCase()` |
| Client receive | [`client/src/App.tsx:68-71`](../client/src/App.tsx:68) | `roomCreated` → `ROOM_CREATED` dispatch |
| Store update | [`client/src/store.ts:107-114`](../client/src/store.ts:107) | Sets `roomCode`, `playerName: "Player 1"`, stays in `lobby` phase |
| Code display | [`client/src/components/Lobby.tsx:107-112`](../client/src/components/Lobby.tsx:107) | Room code displayed in styled card with "Share this code" prompt |

✅ **Verdict**: Reachable. Full code path from button click to room code display.

---

### AC-2 — Player 2 enters code on `/` and joins the same room

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| UI render | [`client/src/components/Lobby.tsx:77-101`](../client/src/components/Lobby.tsx:77) | Join input (max 6 chars, uppercase) + name field + "Join Room" button |
| Event emit | [`client/src/components/Lobby.tsx:40-44`](../client/src/components/Lobby.tsx:40) | `socket.emit("joinRoom", { roomCode, playerName })` |
| Server validation | [`server/src/socket.ts:138-167`](../server/src/socket.ts:138) | Room existence (`ROOM_NOT_FOUND`) + capacity (`ROOM_FULL`) checks |
| State transition | [`server/src/socket.ts:154`](../server/src/socket.ts:154) | `addPlayerToGameState` → phase transitions to `placement` (2 players) |
| Broadcast | [`server/src/socket.ts:162`](../server/src/socket.ts:162) | `io.to(roomCode).emit("playerJoined", ...)` |
| Client receive (host) | [`client/src/App.tsx:74-83`](../client/src/App.tsx:74) | Player 1 sees `PLAYER_JOINED` → opponent set + phase → `placement` |
| Client receive (joiner) | [`client/src/App.tsx:85-88`](../client/src/App.tsx:85) | Player 2 → `SET_PHASE` to `placement` |

✅ **Verdict**: Reachable. Both players transition to placement after join.

---

### AC-3 — Each player can place all 5 ships via drag-and-drop with rotation

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| Ship palette (drag) | [`client/src/components/ShipPalette.tsx:50-72`](../client/src/components/ShipPalette.tsx:50) | 5 ships rendered with `draggable`, `onDragStart` sets shipType in dataTransfer |
| Ship palette (click) | [`client/src/components/ShipPalette.tsx:54`](../client/src/components/ShipPalette.tsx:54) | `onClick` selects ship for click-to-place flow |
| Board drop target | [`client/src/components/Board.tsx:63-96`](../client/src/components/Board.tsx:63) | Each cell wired with `onDragOver`, `onDragLeave`, `onDrop` handlers |
| Drop handler | [`client/src/components/BoardSetup.tsx:238-249`](../client/src/components/BoardSetup.tsx:238) | `handleCellDrop` → extracts shipType → calls `handlePlaceShip` |
| Click handler | [`client/src/components/BoardSetup.tsx:197-204`](../client/src/components/BoardSetup.tsx:197) | `handleCellClick` → places ship if `placingShip` is set |
| Place logic | [`client/src/components/BoardSetup.tsx:159-195`](../client/src/components/BoardSetup.tsx:159) | `handlePlaceShip` validates + updates board + emits to server |
| Rotation (button) | [`client/src/components/ShipPalette.tsx:37-42`](../client/src/components/ShipPalette.tsx:37) | "Rotate (R)" button toggles `orientation` in BoardSetup |
| Rotation (keyboard) | [`client/src/components/BoardSetup.tsx:291-304`](../client/src/components/BoardSetup.tsx:291) | 'R' key event listener toggles orientation |
| Preview on hover | [`client/src/components/BoardSetup.tsx:251-267`](../client/src/components/BoardSetup.tsx:251) | `handleHoverCell` shows ghost preview of ship placement |
| Preview on drag-over | [`client/src/components/BoardSetup.tsx:206-228`](../client/src/components/BoardSetup.tsx:206) | `handleCellDragOver` shows ghost preview respecting current orientation |
| Server receive | [`client/src/App.tsx:177-182`](../client/src/App.tsx:177) | `handlePlaceShips` emits `placeShips` event + syncs local `ownBoard` |

✅ **Verdict**: Reachable. Both drag-and-drop and click-to-place supported with rotation.

---

### AC-4 — Each player can click "Randomize" and receive a valid fleet layout

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| UI button | [`client/src/components/BoardSetup.tsx:356-361`](../client/src/components/BoardSetup.tsx:356) | "🎲 Randomize" button |
| Client handler | [`client/src/components/BoardSetup.tsx:273-288`](../client/src/components/BoardSetup.tsx:273) | `handleRandomize` → calls `onRandomize(callback)` |
| Event emit | [`client/src/App.tsx:184-203`](../client/src/App.tsx:184) | Untyped emit with ack callback for `randomizeShips` |
| Server handler | [`server/src/socket.ts:221-265`](../server/src/socket.ts:221) | Validates placement phase → calls `randomLayout()` → returns placements via ack |
| Domain logic | [`server/src/domain/board.ts:115-165`](../server/src/domain/board.ts:115) | Places all 5 ship types in descending length order, 1000-retry guarantee |
| Validation: no overlap | [`server/src/domain/board.ts:146-147`](../server/src/domain/board.ts:146) | `occupied` Set check prevents cell re-use |
| Validation: in-bounds | [`server/src/domain/board.ts:136-137`](../server/src/domain/board.ts:136) | `maxCol`/`maxRow` constrained to keep ships within grid |
| Client sync | [`client/src/App.tsx:191-199`](../client/src/App.tsx:191) | Ack callback receives placements → builds board → dispatches `SET_OWN_BOARD` |

✅ **Verdict**: Reachable. Server generates valid random layout and returns to client.

---

### AC-5 — Placement validates: no overlap, all cells inside the grid

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| **Server: bounds check** | [`server/src/domain/board.ts:85-87`](../server/src/domain/board.ts:85) | `if (col < 0 || col > 9 || row < 0 || row > 9) → "Ship out of bounds"` |
| **Server: overlap check** | [`server/src/domain/board.ts:93-97`](../server/src/domain/board.ts:93) | `if (board.grid[row][col].status !== "empty") → "Ship overlaps"` |
| **Server: comprehensive validation** | [`server/src/socket.ts:71-103`](../server/src/socket.ts:71) | `validateAndPlaceAllShips`: 5 ships required, unique types, delegates to `placeShip` per-ship |
| **Server: phase guard** | [`server/src/socket.ts:186-191`](../server/src/socket.ts:186) | Refuses placement if not in `placement` phase |
| **Client: local guard** | [`client/src/components/BoardSetup.tsx:31-52`](../client/src/components/BoardSetup.tsx:31) | `isValidPlacement`: bounds check (c<0, c>9, r<0, r>9) + overlap check (cell.status !== "ship") |
| **Client: visual feedback** | [`client/src/components/BoardSetup.tsx:105`](../client/src/components/BoardSetup.tsx:105) | `previewCells` shows valid positions in blue; invalid drops silently rejected |
| Unit test: bounds | [`server/src/domain/__tests__/board.test.ts`](../server/src/domain/__tests__/board.test.ts) | Board test suite (32 tests) covers `placeShip` bounds/overlap edge cases |
| Unit test: overlap | [`server/src/domain/__tests__/board.test.ts`](../server/src/domain/__tests__/board.test.ts) | Board test suite covers overlapping placement rejection |

✅ **Verdict**: Reachable. Dual validation (client-local + server-authoritative) enforces bounds and non-overlap.

---

### AC-6 — Battle starts only when both players click "Ready"

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| UI: Ready button disabled | [`client/src/components/BoardSetup.tsx:363-369`](../client/src/components/BoardSetup.tsx:363) | `disabled={!allPlaced}` — button inactive until `placedShips.size === 5` |
| UI: allPlaced computed | [`client/src/components/BoardSetup.tsx:306`](../client/src/components/BoardSetup.tsx:306) | `const allPlaced = placedShips.size === 5` |
| Client emit | [`client/src/App.tsx:205-207`](../client/src/App.tsx:205) | `socket.current?.emit("playerReady")` |
| Server: ship count guard | [`server/src/socket.ts:298-303`](../server/src/socket.ts:298) | Refuses ready if `player.ships.length !== 5` → `SHIPS_NOT_PLACED` error |
| Server: phase guard | [`server/src/socket.ts:284-289`](../server/src/socket.ts:284) | Refuses ready if not in `placement` phase |
| Server: mark ready | [`server/src/socket.ts:307-309`](../server/src/socket.ts:307) | Sets `isReady: true` on player |
| Server: opponent notify | [`server/src/socket.ts:314`](../server/src/socket.ts:314) | `socket.broadcast.to(roomCode).emit("opponentReady")` |
| **Server: both-ready check** | [`server/src/socket.ts:317-326`](../server/src/socket.ts:317) | `bothReady = updatedPlayers.every(p => p.isReady)` → `battleStart` to all |
| Client: opponentReady | [`client/src/App.tsx:92-95`](../client/src/App.tsx:92) | `OPPONENT_READY` → notice "Opponent is ready!" |
| Client: battleStart | [`client/src/App.tsx:98-101`](../client/src/App.tsx:98) | `BATTLE_START` → phase = "battle", host shoots first |
| Client: opponent ready indicator | [`client/src/components/BoardSetup.tsx:373-377`](../client/src/components/BoardSetup.tsx:373) | Green notice bar when opponent is ready |

✅ **Verdict**: Reachable. Both must place 5 ships and click Ready; battle starts only on dual confirmation.

---

### AC-7 — Turn indicator clearly shows whose turn it is

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| Component render | [`client/src/components/TurnIndicator.tsx:14-36`](../client/src/components/TurnIndicator.tsx:14) | Three distinct states rendered |
| Your turn | [`client/src/components/TurnIndicator.tsx:30-31`](../client/src/components/TurnIndicator.tsx:30) | `"🎯 Your Turn — Shoot!"` with green pulse animation |
| Opponent's turn | [`client/src/components/TurnIndicator.tsx:32`](../client/src/components/TurnIndicator.tsx:32) | `"⏳ <name>'s Turn"` with gray background |
| Game over | [`client/src/components/TurnIndicator.tsx:20-25`](../client/src/components/TurnIndicator.tsx:20) | `"🏆 Game Over"` when winner is set |
| isMyTurn computation | [`client/src/components/Game.tsx:33`](../client/src/components/Game.tsx:33) | `currentTurn === playerId && !winner` |
| CSS styles | [`client/src/styles/index.css:141-151`](../client/src/styles/index.css:141) | `.my-turn` (green pulse) vs `.opponent-turn` (gray static) |
| Server turn tracking | [`server/src/domain/match.ts:276`](../server/src/domain/match.ts:276) | `currentTurn` alternates each shot via `nextTurn` |

✅ **Verdict**: Reachable. Turn indicator with three distinct visual states + animation.

---

### AC-8 — Shooting a cell updates both clients in under 500 ms

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| Client emit | [`client/src/App.tsx:209-211`](../client/src/App.tsx:209) | `socket.emit("shoot", { coordinate: { col, row } })` |
| Client local guard | [`client/src/components/Game.tsx:38-41`](../client/src/components/Game.tsx:38) | Prevents click if cell already shot (UX guard) |
| Server handler | [`server/src/socket.ts:338-371`](../server/src/socket.ts:338) | `shoot` event → delegates to `applyShot` domain function |
| Domain: in-memory | [`server/src/domain/match.ts:140-289`](../server/src/domain/match.ts:140) | Pure in-memory operations: validation + board traversal + cloning |
| **Single broadcast** | [`server/src/socket.ts:357`](../server/src/socket.ts:357) | `io.to(roomCode).emit("shotResult", result)` — one call updates both |
| Client receive | [`client/src/App.tsx:104-113`](../client/src/App.tsx:104) | `shotResult` → `SHOT_RESULT` dispatch |
| Store: both boards | [`client/src/store.ts:164-210`](../client/src/store.ts:164) | Updates `trackingBoard` (shooter) AND `ownBoard` (target) |
| No artificial delay | — | No `setTimeout`, no DB queries, no external network calls |

✅ **Verdict**: Reachable. Single in-memory broadcast, no latency-inducing operations. Expect << 500 ms.

---

### AC-9 — Hits show `V`, misses show `x`, sunk ships highlighted distinctly

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| Hit display | [`client/src/components/Cell.tsx:76`](../client/src/components/Cell.tsx:76) | `display = "V"` for `status === "hit"` |
| Miss display | [`client/src/components/Cell.tsx:78`](../client/src/components/Cell.tsx:78) | `display = "x"` for `status === "miss"` |
| Sunk display | [`client/src/components/Cell.tsx:80`](../client/src/components/Cell.tsx:80) | `display = "V"` for `status === "sunk"` (same symbol, visually distinct via CSS) |
| Hit CSS | [`client/src/styles/index.css:85-88`](../client/src/styles/index.css:85) | `bg-red-600 border-red-400 text-white` + `pulse-hit` animation (red glow) |
| Miss CSS | [`client/src/styles/index.css:90-92`](../client/src/styles/index.css:90) | `bg-gray-600 text-gray-400` (muted gray) |
| **Sunk CSS (distinct)** | [`client/src/styles/index.css:95-98`](../client/src/styles/index.css:95) | `bg-red-950 border-red-500 text-white line-through` + `sunk-reveal` animation (border sweep) |
| Sunk domain logic | [`server/src/domain/match.ts:218-233`](../server/src/domain/match.ts:218) | All cells of a sunk ship marked `"sunk"` on both boards |
| Server: sunkShip in payload | [`server/src/domain/match.ts:197`](../server/src/domain/match.ts:197) | `sunkShip: shipType` included in `ShotResultPayload` |

✅ **Verdict**: Reachable. Hit=`V` (red+pulse), Miss=`x` (gray), Sunk=`V` with strikethrough (dark red+sweep animation) — three visually distinct states.

---

### AC-10 — Re-shooting a previously shot cell is rejected by the server

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| **Server: double-shot check** | [`server/src/domain/match.ts:162-169`](../server/src/domain/match.ts:162) | Checks `trackingCell.status` — if `hit`/`miss`/`sunk` → throws "Cell already shot" |
| Server: error emission | [`server/src/socket.ts:367-370`](../server/src/socket.ts:367) | Catch block emits `error` with `code: "SHOT_FAILED"` |
| Client: error display | [`client/src/App.tsx:148-151`](../client/src/App.tsx:148) | `error` event → `SET_ERROR` dispatch |
| Client: error UI | [`client/src/components/Game.tsx:88-92`](../client/src/components/Game.tsx:88) | Error banner rendered in battle phase |
| Client: local guard | [`client/src/components/Game.tsx:38-41`](../client/src/components/Game.tsx:38) | Returns early if cell already `hit`/`miss`/`sunk` — prevents unnecessary emit |
| Unit test: double-shot | [`server/src/domain/__tests__/match.test.ts`](../server/src/domain/__tests__/match.test.ts) | Match test suite (25 tests) covers re-shooting rejection |

✅ **Verdict**: Reachable. Server authoritatively rejects re-shoots; client has UX guard too.

---

### AC-11 — Winning fires a `gameOver` event; both boards reveal

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| Win detection | [`server/src/domain/match.ts:268-278`](../server/src/domain/match.ts:268) | `isFleetSunk` → phase = `"gameOver"`, `winner = shooterPlayerId` |
| gameOver emit (sinking) | [`server/src/socket.ts:360-366`](../server/src/socket.ts:360) | `io.to(roomCode).emit("gameOver", { winner, reason: "allSunk" })` |
| gameOver emit (forfeit) | [`server/src/socket.ts:529-532`](../server/src/socket.ts:529) | Disconnect timeout → `gameOver` with `reason: "forfeit"` |
| Client receive | [`client/src/App.tsx:117-120`](../client/src/App.tsx:117) | `gameOver` → `GAME_OVER` dispatch |
| Store update | [`client/src/store.ts:212-218`](../client/src/store.ts:212) | Phase → `gameOver`, sets winner, clears currentTurn |
| **Both boards visible** | [`client/src/App.tsx:295`](../client/src/App.tsx:295) | `(phase === "battle" || phase === "gameOver")` — Game component renders ownBoard + trackingBoard after game over too |
| Victory/defeat modal | [`client/src/components/GameOverModal.tsx:28-69`](../client/src/components/GameOverModal.tsx:28) | Conditional text: "🎉 Victory!" or "💀 Defeat" + reason shown |
| forfeit reason display | [`client/src/components/GameOverModal.tsx:41-45`](../client/src/components/GameOverModal.tsx:41) | "Opponent disconnected — win by forfeit." |

✅ **Verdict**: Reachable. gameOver emitted to both, both boards remain rendered, modal shows winner.

---

### AC-12 — Disconnect mid-battle triggers the 30 s reconnect window

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| disconnect handler | [`server/src/socket.ts:483-544`](../server/src/socket.ts:483) | Built-in `disconnect` event → phase-dependent handling |
| Battle: emit disconnect | [`server/src/socket.ts:511`](../server/src/socket.ts:511) | `io.to(roomCode).emit("playerDisconnected", { playerId })` |
| **Battle: 30 s timer** | [`server/src/socket.ts:513-533`](../server/src/socket.ts:513) | `setTimeout(..., RECONNECT_GRACE_MS)` where `RECONNECT_GRACE_MS = 30_000` |
| Timer expiry → forfeit | [`server/src/socket.ts:521-532`](../server/src/socket.ts:521) | On expiry: phase = `gameOver`, winner = survivor, emits `gameOver` with `reason: "forfeit"` |
| Grace timer storage | [`server/src/rooms.ts:87-98`](../server/src/rooms.ts:87) | `setGraceTimer`/`clearGraceTimer` keyed by playerId |
| Reconnect handler | [`server/src/socket.ts:376-409`](../server/src/socket.ts:376) | `requestReconnect` validates room+player → clears grace timer → sends full `GameState` |
| Reconnect broadcast | [`server/src/socket.ts:404`](../server/src/socket.ts:404) | `io.to(roomCode).emit("playerReconnected", { playerId })` |
| Client: disconnect notice | [`client/src/App.tsx:136-139`](../client/src/App.tsx:136) | `PLAYER_DISCONNECTED` → notice "Opponent disconnected. Waiting for reconnect..." |
| Client: reconnect notice | [`client/src/App.tsx:142-145`](../client/src/App.tsx:142) | `PLAYER_RECONNECTED` → notice "Opponent reconnected!" |
| Client: reconnect logic | [`client/src/App.tsx:236-251`](../client/src/App.tsx:236) | `handleReconnect`: socket.connect() → sleep(300) → `requestReconnect` |
| Client: rebuild state | [`client/src/store.ts:220-237`](../client/src/store.ts:220) | `RECONNECT_RESULT` rebuilds full UI from server `GameState` |
| Dev test buttons | [`client/src/App.tsx:323-338`](../client/src/App.tsx:323) | Dev-only Disconnect/Reconnect buttons for testing |
| Placement/Lobby: immediate drop | [`server/src/socket.ts:494-506`](../server/src/socket.ts:494) | Non-battle phases: `deleteRoom` immediately + `lobbyNotice` |

✅ **Verdict**: Reachable. 30 s grace window with forfeit on expiry; full state restore on reconnect.

---

### AC-13 — Play Again returns both players to fresh Placement phase in the same room

| Layer | File:Line | Evidence |
|-------|-----------|----------|
| UI: Play Again button | [`client/src/components/GameOverModal.tsx:54-59`](../client/src/components/GameOverModal.tsx:54) | "Play Again" button → disabled when already requested |
| Client emit | [`client/src/App.tsx:213-229`](../client/src/App.tsx:213) | Untyped emit `playAgain` with ack callback |
| Server: phase guard | [`server/src/socket.ts:435-440`](../server/src/socket.ts:435) | Only in `gameOver` phase → `WRONG_PHASE` error otherwise |
| Server: request tracking | [`server/src/rooms.ts:110-116`](../server/src/rooms.ts:110) | `addPlayAgainRequest` per-room Set |
| Server: callback storage | [`server/src/rooms.ts:124-133`](../server/src/rooms.ts:124) | `storePlayAgainCallback` saves per-player ack callbacks |
| **Server: both opt-in** | [`server/src/socket.ts:450-472`](../server/src/socket.ts:450) | When `optInCount === 2`: creates fresh boards, resets phase to `placement` |
| Server: fresh boards | [`server/src/socket.ts:452-458`](../server/src/socket.ts:452) | Each player gets `createEmptyBoard()` for both board and trackingBoard, ships=[], isReady=false |
| Server: same room | [`server/src/socket.ts:468`](../server/src/socket.ts:468) | `setRoom(roomCode, newState)` — same roomCode reused |
| Server: callback invocation | [`server/src/socket.ts:472`](../server/src/socket.ts:472) | `invokePlayAgainCallbacks(roomCode)` → both clients notified |
| Client: reset handler | [`client/src/App.tsx:223-226`](../client/src/App.tsx:223) | On ack success → `RESET_FOR_NEW_GAME` dispatch |
| **Client: state reset** | [`client/src/store.ts:279-292`](../client/src/store.ts:279) | `RESET_FOR_NEW_GAME`: phase=`placement`, fresh boards, but **keeps** roomCode, playerId, playerName, opponentName, opponentId |
| Client: button state | [`client/src/App.tsx:217`](../client/src/App.tsx:217) | `setPlayAgainRequested(true)` → button shows "Waiting for opponent..." |

✅ **Verdict**: Reachable. Both players must opt in; server creates fresh boards in same room; client resets to placement keeping identifiers.

---

## Event Contract Compliance

All 8 client→server events from [`docs/api_contract.md`](../api_contract.md) are wired:

| # | Event | Server Handler | Client Emit |
|---|-------|---------------|-------------|
| 1 | `createRoom` | [`socket.ts:112`](../server/src/socket.ts:112) | [`Lobby.tsx:33`](../client/src/components/Lobby.tsx:33) |
| 2 | `joinRoom` | [`socket.ts:138`](../server/src/socket.ts:138) | [`Lobby.tsx:40-43`](../client/src/components/Lobby.tsx:40) |
| 3 | `placeShips` | [`socket.ts:172`](../server/src/socket.ts:172) | [`App.tsx:178`](../client/src/App.tsx:178) |
| 4 | `randomizeShips` | [`socket.ts:221`](../server/src/socket.ts:221) | [`App.tsx:191-200`](../client/src/App.tsx:191) |
| 5 | `playerReady` | [`socket.ts:270`](../server/src/socket.ts:270) | [`App.tsx:206`](../client/src/App.tsx:206) |
| 6 | `shoot` | [`socket.ts:338`](../server/src/socket.ts:338) | [`App.tsx:210`](../client/src/App.tsx:210) |
| 7 | `requestReconnect` | [`socket.ts:376`](../server/src/socket.ts:376) | [`App.tsx:246-249`](../client/src/App.tsx:246) |
| 8 | `playAgain` | [`socket.ts:417`](../server/src/socket.ts:417) | [`App.tsx:219-228`](../client/src/App.tsx:219) |

All server→client events are handled in [`App.tsx:56-161`](../client/src/App.tsx:56).

All types are imported from `@battleship/shared` — no local redefinitions found.

## Unit Test Coverage

| Test File | Tests | Domain Module |
|-----------|-------|--------------|
| [`server/src/domain/__tests__/board.test.ts`](../server/src/domain/__tests__/board.test.ts) | 32 | Board creation, ship placement, bounds, overlap, random layout |
| [`server/src/domain/__tests__/match.test.ts`](../server/src/domain/__tests__/match.test.ts) | 25 | Game state, player management, shot logic, fleet sunk, re-shoot rejection |
| **Total** | **57** | All pass ✅ |

## Summary

All 13 acceptance criteria from [`docs/game_spec.md` §10](../game_spec.md:84-100) are traceable through the codebase with concrete file:line evidence. No AC failures found.
