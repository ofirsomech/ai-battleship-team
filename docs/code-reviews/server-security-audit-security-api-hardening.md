# Security Audit — Battleship Server

**Branch**: `security/api-hardening`
**Date**: 2026-05-18
**Scope**: `server/src/socket.ts`, `server/src/rooms.ts`, `server/src/index.ts`

---

## Findings

### F-001: No rate limiting on any Socket.IO event handler
- **Severity**: High
- **File**: [`server/src/socket.ts:107-544`](server/src/socket.ts:107)
- **Description**: None of the 8 Socket.IO event handlers — [`createRoom`](server/src/socket.ts:112), [`joinRoom`](server/src/socket.ts:138), [`placeShips`](server/src/socket.ts:172), [`randomizeShips`](server/src/socket.ts:221), [`playerReady`](server/src/socket.ts:270), [`shoot`](server/src/socket.ts:338), [`requestReconnect`](server/src/socket.ts:376), [`playAgain`](server/src/socket.ts:417) — imposes any throttling, debouncing, or per-socket rate limit. A single socket can emit any event at unlimited frequency.
- **Exploitation**: An attacker can:
  - Spam [`createRoom`](server/src/socket.ts:112) to exhaust the `rooms` Map and degrade `generateRoomCode()` performance (the while-loop at [`rooms.ts:39-42`](server/src/rooms.ts:39) scans the growing Map each iteration).
  - Spam [`shoot`](server/src/socket.ts:338) during their turn — while `applyShot()` validates turn/phases, each call still clones boards, iterates grids, and emits to the room, wasting CPU.
  - Spam [`joinRoom`](server/src/socket.ts:138) to brute-force room codes.
  - Spam [`requestReconnect`](server/src/socket.ts:376) to probe room existence and player IDs.
- **Recommendation**: Implement a per-socket rate limiter (e.g., a `Map<socketId, { count, windowStart }>` checked in a wrapper). Alternatively, use `socket.use()` middleware with a token-bucket or sliding-window algorithm. Enforce stricter limits on mutating events (`shoot`, `createRoom`) vs. idempotent queries.

---

### F-002: No input validation on `playerName` or `roomCode` strings
- **Severity**: High
- **File**: [`server/src/socket.ts:138-141`](server/src/socket.ts:138)
- **Description**: The [`joinRoom`](server/src/socket.ts:138) handler destructures `{ roomCode, playerName }` from client data without any validation. There are no length limits, character allowlists, or sanitization. An empty string, a 10 MB string, or strings containing control characters, HTML, or SQL-like payloads are all accepted and stored into the `Player` object.
- **Exploitation**:
  - A 10 MB `playerName` bloats the in-memory `GameState`, inflating memory usage and making the `rooms` Map massive.
  - Unsanitized `playerName` values are broadcast to other clients via [`playerJoined`](server/src/socket.ts:162) and may cause XSS if the client renders them unsafely (defense-in-depth failure).
  - Null bytes or control characters in `roomCode` could interfere with Socket.IO room joining or Map lookups.
- **Recommendation**: Validate both fields — enforce a max length (e.g., 30 chars for `playerName`, exactly 6 uppercase alphanumeric chars for `roomCode`), trim whitespace, reject empty strings, and sanitize against control characters. Add a reusable `validatePlayerName()` and `validateRoomCode()` helper.

---

### F-003: No runtime type validation on client payloads — TypeScript types are compile-time only
- **Severity**: High
- **File**: [`server/src/socket.ts:172-213`](server/src/socket.ts:172), [`server/src/socket.ts:338-371`](server/src/socket.ts:338), [`server/src/socket.ts:376-409`](server/src/socket.ts:376)
- **Description**: Socket.IO events are typed at compile time via `ClientToServerEvents`, but at runtime a malicious or buggy client can send arbitrary JSON. Several handlers destructure deeply without guards:
  - [`placeShips`](server/src/socket.ts:194): `const { ships: placements } = data;` — if `data` is `null`, `{}` or `{ ships: "evil" }`, the destructure produces `undefined` or a string, and [`validateAndPlaceAllShips`](server/src/socket.ts:195) crashes on `placements.length`.
  - [`shoot`](server/src/socket.ts:353): `data.coordinate` is passed directly to [`applyShot()`](server/src/domain/match.ts:143) which accesses `targetCoordinate.col` and `targetCoordinate.row` — if `coordinate` is `null` or `{ col: -5, row: 99 }`, the grid access `grid[row][col]` throws a RangeError.
  - [`requestReconnect`](server/src/socket.ts:378): `data.roomCode` and `data.playerId` — if either is `undefined`, Map lookups silently fail, but empty/undefined strings still create entries in `socketToPlayer`.
  - [`joinRoom`](server/src/socket.ts:140): `data.playerName` — if `undefined`, becomes the string literal `"undefined"` in the `Player` record.
- **Exploitation**: Sending malformed payloads can trigger uncaught exceptions (the `try/catch` blocks catch them but waste CPU), pollute internal Maps, or produce nonsensical game states. A crafted `shoot` with `{ col: -1, row: -1 }` bypasses the turn check and throws a RangeError from `board.grid[row][col]`.
- **Recommendation**: Add a runtime validation layer. Use a lightweight schema library (zod, joi, or hand-rolled type guards) to validate every incoming payload before destructuring. At minimum, add `Array.isArray(placements)` and coordinate bounds checks (col/row in 0–9 range).

---

### F-004: `Math.random()` used for room code generation — predictable codes
- **Severity**: Medium
- **File**: [`server/src/rooms.ts:40`](server/src/rooms.ts:40)
- **Description**: [`generateRoomCode()`](server/src/rooms.ts:37-43) uses `Math.random()` to produce 6-character alphanumeric room codes. `Math.random()` is not cryptographically secure; its output is predictable if an attacker can seed or observe its state (e.g., via V8's XorShift128+ PRNG in Node.js).
- **Exploitation**: An attacker who can predict future room codes can:
  - Pre-compute codes and join a room immediately after it's created, stealing the second slot.
  - Brute-force the PRNG seed from observed codes and predict all future codes.
- **Recommendation**: Replace `Math.random()` with `crypto.randomUUID()` or `crypto.randomBytes(4).toString('hex')` for entropy that is not predictable.

---

### F-005: `requestReconnect` trusts client-supplied `playerId` — identity spoofing
- **Severity**: Critical
- **File**: [`server/src/socket.ts:376-379`](server/src/socket.ts:376)
- **Description**: The [`requestReconnect`](server/src/socket.ts:376) handler accepts `{ roomCode, playerId }` directly from the client payload and uses them to look up the player. It does not verify that the requesting socket previously owned that `playerId`, nor does it require any authentication token or session secret. The handler then overwrites [`socket.data`](server/src/socket.ts:393) and calls [`registerPlayer()`](server/src/socket.ts:394) to remap the new socket to the old `playerId`.
- **Exploitation**:
  1. Attacker connects to the server and observes a game in progress (requires knowing the `roomCode` — see F-004 for code prediction; or the attacker was originally in the room).
  2. Attacker calls `requestReconnect({ roomCode: "ABC123", playerId: "<victim's playerId>" })`.
  3. The server remaps the attacker's socket to the victim's identity and emits the full [`gameState`](server/src/socket.ts:401) to the attacker.
  4. The attacker can now emit `shoot`, `playerReady`, or `playAgain` as the victim.
- **Recommendation**: Require a reconnect token — a one-time random string generated at connection time, stored in `socket.data` and in the `Player` object, sent to the client on `roomCreated`/`playerJoined`, and verified on `requestReconnect`. Alternatively, use the Socket.IO `auth` handshake with signed tokens.

---

### F-006: `socket.id` is the sole identity mechanism with no token or secret
- **Severity**: Medium
- **File**: [`server/src/socket.ts:116`](server/src/socket.ts:116), [`server/src/socket.ts:153`](server/src/socket.ts:153)
- **Description**: Both [`createRoom`](server/src/socket.ts:112) and [`joinRoom`](server/src/socket.ts:138) assign `const playerId = socket.id`. There is no authentication handshake, no token exchange, and no server-provided secret. The entire identity model relies on `socket.id` being unguessable and immutable.
- **Exploitation**: Socket.IO's `socket.id` is generated server-side (currently a random string), but it is not intended as a security boundary. If a future Socket.IO version change makes IDs predictable, or if an attacker gains access to a socket ID (e.g., via logs or client debugging), they cannot be revoked or rotated.
- **Recommendation**: Generate a server-side player UUID via `crypto.randomUUID()` at connection time and store it in `socket.data.playerId`. Use that UUID for all game logic. This decouples identity from the transport-layer socket ID.

---

### F-007: `rooms` Map never shrinks — battle and gameOver rooms leak permanently
- **Severity**: High
- **File**: [`server/src/rooms.ts:11`](server/src/rooms.ts:11), [`server/src/socket.ts:494-543`](server/src/socket.ts:494)
- **Description**: [`deleteRoom()`](server/src/rooms.ts:61) is only called during disconnect in the `lobby` and `placement` phases ([line 504](server/src/socket.ts:504)). Rooms that reach the `battle` or `gameOver` phase are never deleted — even after both players disconnect permanently. The room, its `GameState`, and all associated data persist in memory until the server process restarts.
- **Exploitation**: An attacker creates rooms, places ships, readies both slots (using two sockets), and disconnects. Each such room consumes memory indefinitely. Over time, the server's memory footprint grows without bound (memory leak DoS).
- **Recommendation**: Implement a room TTL mechanism. On disconnect during `battle`, after the 30 s grace timer fires and the forfeit is processed, schedule room cleanup after an additional cooldown (e.g., 5 minutes). On disconnect during `gameOver`, schedule cleanup immediately or after a short delay. Also add a periodic garbage-collection sweep for rooms with no connected sockets.

---

### F-008: No limit on concurrent rooms or total players
- **Severity**: Medium
- **File**: [`server/src/rooms.ts:11`](server/src/rooms.ts:11), [`server/src/index.ts:31-35`](server/src/index.ts:31)
- **Description**: There is no cap on the number of rooms a single socket (or IP) may create, nor a global room count ceiling. The `rooms` Map, `socketToPlayer` Map, `graceTimers` Map, `playAgainRequests` Map, and `playAgainCallbacks` Map all grow without bound.
- **Exploitation**: A script opening many WebSocket connections can create thousands of rooms, each consuming a `GameState`, two `Board` objects (20×20 `Cell` objects each = 400 cells × ~5 fields), and Map entries. At ~5 KB per room, 100,000 rooms = ~500 MB memory.
- **Recommendation**: Add a global room limit (e.g., 1000). Add a per-IP or per-socket creation limit (e.g., 5 rooms per connection). Reject `createRoom` with a clear error when limits are reached.

---

### F-009: Missing `maxHttpBufferSize` on Socket.IO server
- **Severity**: Medium
- **File**: [`server/src/index.ts:31-35`](server/src/index.ts:31)
- **Description**: The Socket.IO `Server` constructor at [`index.ts:31`](server/src/index.ts:31) does not set `maxHttpBufferSize`. The default is 1 MB per message, which is excessive for a game where the largest payload (`placeShips` with 5 ship placements) is under 1 KB.
- **Exploitation**: An attacker can send a 1 MB payload on any event (e.g., a `playerName` string or a fake `ships` array), consuming server memory and bandwidth. A coordinated attack from multiple sockets can saturate the server's memory.
- **Recommendation**: Set `maxHttpBufferSize: 4096` (4 KB) in the Socket.IO `Server` options. This is more than enough for all legitimate game payloads while blocking oversized malicious messages.

---

### F-010: Zero logging — no audit trail, no error tracking, no observability
- **Severity**: High
- **File**: [`server/src/index.ts:43`](server/src/index.ts:43) (only log in entire codebase)
- **Description**: The entire server has exactly one `console.log` — the startup message at [`index.ts:43`](server/src/index.ts:43). There is no logging for:
  - Room creation/joining/deletion
  - Ship placement or randomization
  - Shots fired (who shot whom, at what coordinate, with what result)
  - Game start, game over, forfeits
  - Player disconnects and reconnects
  - Errors caught in any `try/catch` block — errors are emitted to the client but **never logged server-side**
  - Rate-limiting violations (none exist, but when added)
- **Exploitation**: Without logs, it is impossible to:
  - Detect an ongoing attack (room creation spam, brute-force room codes)
  - Investigate a post-mortem after a security incident
  - Debug production issues
  - Audit game integrity disputes ("did that shot really hit?")
- **Recommendation**: Add structured logging (JSON format with timestamps, correlation IDs, event types) at minimum for: every error caught, every room lifecycle event, every shot (with coordinate and result), every disconnect/reconnect, and every security-relevant rejection (wrong phase, not your turn, invalid placement). Use `pino` or `winston` for production-grade logging. Log to stdout for containerized environments.

---

### F-011: Error messages leak room existence and game state — room enumeration possible
- **Severity**: Medium
- **File**: [`server/src/socket.ts:143-151`](server/src/socket.ts:143), [`server/src/socket.ts:180-192`](server/src/socket.ts:180), [`server/src/socket.ts:284-290`](server/src/socket.ts:284)
- **Description**: Several handlers return distinct error messages that allow an attacker to probe game state:
  - [`joinRoom`](server/src/socket.ts:143-151): `"Room not found"` vs `"Room is full"` — an attacker can brute-force room codes and distinguish valid vs. invalid codes by the error message.
  - [`placeShips`](server/src/socket.ts:186-192): `"Can only place ships during placement phase"` leaks the current phase.
  - [`playerReady`](server/src/socket.ts:284-289): Distinct errors for `"Can only ready during placement phase"` and `"Must place all 5 ships before readying"` reveal internal state.
  - [`shoot`](server/src/socket.ts:346-371): Errors from [`applyShot()`](server/src/domain/match.ts:146-168) — `"Not in battle phase"`, `"Not your turn"`, `"Cell already shot"` — all leak game state.
  - [`playAgain`](server/src/socket.ts:435-441): `"Can only play again after game over"` reveals the current phase.
  - **Exception**: [`requestReconnect`](server/src/socket.ts:376-409) correctly returns generic `{ success: false }` without distinguishing reasons.
- **Exploitation**: An attacker can enumerate valid room codes by calling `joinRoom` with various codes and observing whether the error is `ROOM_NOT_FOUND` or `ROOM_FULL`.
- **Recommendation**: Return generic error messages to unauthenticated or unassociated clients. For clients already in a room, detailed game-state errors are acceptable. For `joinRoom`, return a single generic message like `"Cannot join room"` regardless of whether the room doesn't exist or is full.

---

### F-012: Grace timer not cleaned from Map after firing
- **Severity**: Low
- **File**: [`server/src/socket.ts:513-533`](server/src/socket.ts:513), [`server/src/rooms.ts:20`](server/src/rooms.ts:20)
- **Description**: When a player disconnects during battle, a 30-second grace timer is created via `setTimeout` and stored in the `graceTimers` Map via [`setGraceTimer(playerId, timer)`](server/src/socket.ts:535). If the timer fires (player did not reconnect), the forfeit logic runs but the timer reference is **never removed from `graceTimers`**. The `clearGraceTimer` function is only called on reconnect.
- **Exploitation**: This is a minor memory leak — each forfeited disconnect leaves a stale `NodeJS.Timeout` reference in the `graceTimers` Map. Over many games, this accumulates. The leaked entries are small (a few bytes each), so practical impact is low.
- **Recommendation**: In the timer callback at [`socket.ts:513`](server/src/socket.ts:513), add `graceTimers.delete(playerId)` after the forfeit logic. Alternatively, use a self-clearing pattern in `setGraceTimer`.

---

### F-013: Orphaned playAgain data on gameOver disconnect
- **Severity**: Low
- **File**: [`server/src/socket.ts:539-543`](server/src/socket.ts:539), [`server/src/rooms.ts:26-32`](server/src/rooms.ts:26)
- **Description**: When a player disconnects during the `gameOver` phase, the handler only emits `playerDisconnected` — it does **not** clean up `playAgainRequests` or `playAgainCallbacks` for the room. If neither player calls `playAgain` (both just leave), those Map entries persist forever (see also F-007).
- **Exploitation**: Low practical impact — the leaked data is small. Combined with F-007, contributes to unbounded memory growth.
- **Recommendation**: On any disconnect, check if the room now has zero connected sockets; if so, schedule room cleanup (including `clearPlayAgainRequests` and `playAgainCallbacks.delete`).

---

### F-014: No explicit `pingTimeout` / `pingInterval` / `connectTimeout` configuration
- **Severity**: Low
- **File**: [`server/src/index.ts:31-35`](server/src/index.ts:31)
- **Description**: The Socket.IO `Server` relies entirely on defaults for heartbeat and connection timeout parameters (`pingTimeout`: 20000 ms, `pingInterval`: 25000 ms, `connectTimeout`: 45000 ms). While reasonable, they are not explicitly tuned and may not match the application's reconnect-grace window (30 s).
- **Exploitation**: A `pingTimeout` of 20 s means a genuinely disconnected client is detected earlier than the 30 s grace period — this is actually protective. However, if `connectTimeout` were lower, legitimate clients on slow networks could be rejected. Currently low risk since defaults are reasonable.
- **Recommendation**: Explicitly set `pingTimeout: 35000` (slightly above `RECONNECT_GRACE_MS` to avoid race conditions), `pingInterval: 10000`, and `connectTimeout: 10000` in the `Server` options. This makes the configuration explicit and reviewable.

---

### F-015: No connection limit — DoS via socket flood
- **Severity**: Medium
- **File**: [`server/src/index.ts:29`](server/src/index.ts:29)
- **Description**: There is no limit on the number of concurrent Socket.IO connections. Node.js can handle thousands of idle WebSocket connections with minimal overhead, but each connection allocates a `Socket` object and participates in heartbeat exchanges.
- **Exploitation**: An attacker can open thousands of connections and leave them idle. While this doesn't directly crash the server, it degrades performance, increases memory pressure, and can exhaust file descriptors or ephemeral ports.
- **Recommendation**: Set a connection limit at the HTTP server level (`httpServer.maxConnections`) or via middleware. Alternatively, use the `connection` event to track and reject connections above a threshold (e.g., 5000).

---

### F-016: `playerName` stored and broadcast without sanitization — potential XSS vector
- **Severity**: Medium
- **File**: [`server/src/socket.ts:121`](server/src/socket.ts:121), [`server/src/socket.ts:162`](server/src/socket.ts:162)
- **Description**: The default `playerName` `"Player 1"` is hardcoded for the room host, and `playerName` from `joinRoom` is stored directly. Both are broadcast to other clients via [`playerJoined`](server/src/socket.ts:162) and embedded in the `GameState` object that flows to the client. No HTML entity encoding or sanitization is applied server-side.
- **Exploitation**: If the client renders `playerName` using `dangerouslySetInnerHTML` or `innerHTML`, an attacker who sets `playerName: "<img src=x onerror=alert(1)>"` could execute scripts in the opponent's browser. While this is primarily a client concern, the server should apply defense-in-depth by sanitizing user-supplied strings that will be rendered in a browser context.
- **Recommendation**: Strip or encode HTML special characters (`<`, `>`, `"`, `'`, `&`) from `playerName` before storing it. Add a `sanitizeString()` helper and apply it at the boundary (in the socket handler, before the string enters the domain layer).

---

## Summary

| # | Severity | Finding | File |
|---|----------|---------|------|
| F-001 | High | No rate limiting on any Socket.IO event handler | [`server/src/socket.ts:107-544`](server/src/socket.ts:107) |
| F-002 | High | No input validation on `playerName` or `roomCode` | [`server/src/socket.ts:138-141`](server/src/socket.ts:138) |
| F-003 | High | No runtime type validation on client payloads | [`server/src/socket.ts:172-213`](server/src/socket.ts:172) |
| F-004 | Medium | `Math.random()` for room codes — predictable | [`server/src/rooms.ts:40`](server/src/rooms.ts:40) |
| F-005 | **Critical** | `requestReconnect` trusts client-supplied `playerId` | [`server/src/socket.ts:376-379`](server/src/socket.ts:376) |
| F-006 | Medium | `socket.id` only identity — no token/secret | [`server/src/socket.ts:116`](server/src/socket.ts:116) |
| F-007 | High | `rooms` Map leaks battle/gameOver rooms | [`server/src/rooms.ts:11`](server/src/rooms.ts:11) |
| F-008 | Medium | No limit on concurrent rooms or players | [`server/src/rooms.ts:11`](server/src/rooms.ts:11) |
| F-009 | Medium | Missing `maxHttpBufferSize` — 1 MB default | [`server/src/index.ts:31-35`](server/src/index.ts:31) |
| F-010 | High | Zero logging — no audit trail or error tracking | [`server/src/index.ts:43`](server/src/index.ts:43) |
| F-011 | Medium | Error messages leak room existence and game state | [`server/src/socket.ts:143-151`](server/src/socket.ts:143) |
| F-012 | Low | Grace timer not removed from Map after firing | [`server/src/socket.ts:513-533`](server/src/socket.ts:513) |
| F-013 | Low | Orphaned playAgain data on gameOver disconnect | [`server/src/socket.ts:539-543`](server/src/socket.ts:539) |
| F-014 | Low | No explicit heartbeat/timeout configuration | [`server/src/index.ts:31-35`](server/src/index.ts:31) |
| F-015 | Medium | No connection limit — socket flood DoS | [`server/src/index.ts:29`](server/src/index.ts:29) |
| F-016 | Medium | `playerName` stored/broadcast without sanitization | [`server/src/socket.ts:121`](server/src/socket.ts:121) |

### Severity Distribution
- **Critical**: 1 (F-005)
- **High**: 4 (F-001, F-002, F-003, F-007, F-010)
- **Medium**: 7 (F-004, F-006, F-008, F-009, F-011, F-015, F-016)
- **Low**: 4 (F-012, F-013, F-014)

### Top 3 Priorities for Remediation
1. **F-005 (Critical)**: Fix identity spoofing via `requestReconnect` — this allows complete account takeover.
2. **F-001 + F-002 + F-003 (High)**: Add rate limiting and input validation — these are the first line of defense against DoS and malformed-input attacks.
3. **F-007 + F-010 (High)**: Add room cleanup and logging — without these, the server cannot be monitored or operated in production.
