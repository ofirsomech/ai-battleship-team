# Security Hardening Plan — Battleship Server

## Pre-Check Audit

| Check | Status |
|-------|--------|
| orchestration_log.md up to date | ✅ All phases 0–6 logged |
| All handoff files complete | ✅ 32 handoff files, all with status |
| All code review files present | ✅ 13 code review files |
| Git log matches documented work | ✅ All commits accounted for |
| Gaps found | None |

---

## Security Vulnerabilities Identified

### Critical
1. **No rate limiting** — Any socket can emit events (`shoot`, `placeShips`, `randomizeShips`, `playerReady`, `playAgain`) at unlimited frequency. A single client can spam 1000 shots/second, DoSing the server or corrupting game state.
   - File: `server/src/socket.ts` — all handlers
   - Risk: DoS, game state corruption

2. **Unbounded memory growth** — The `rooms` Map in `rooms.ts` grows indefinitely. Rooms are never garbage-collected or expired. A client can create unlimited rooms, exhausting server memory.
   - File: `server/src/rooms.ts:11`
   - Risk: DoS, memory exhaustion

3. **Client-trusted playerId on reconnect** — `requestReconnect` accepts `playerId` from client data. A malicious actor can reconnect as any player in any room.
   - File: `server/src/socket.ts:376-378`
   - Risk: Identity spoofing, game takeover

### High
4. **No input validation on string fields** — `playerName` and `roomCode` accepted with no length limits or content validation. Room codes can be injected with arbitrary strings.
   - File: `server/src/socket.ts:138-140` (joinRoom)
   - Risk: Injection, DoS via oversized inputs

5. **No per-player event validation** — A socket can operate on a room after being removed (stale `socket.data`). Once in a room, the socket's roomCode is never validated against current room state.
   - File: `server/src/socket.ts` — all handlers use `socket.data` without re-validation
   - Risk: Cross-room tampering

### Medium
6. **No logging** — Zero server-side logging. No request logs, error logs, or audit trail. Impossible to debug abuse or trace issues.
   - File: `server/src/socket.ts`, `index.ts`, `rooms.ts`
   - Risk: No observability, harder debugging

7. **Error messages leak implementation details** — Error codes like `"ROOM_NOT_FOUND"` tell attackers valid room codes don't exist, enabling room-code enumeration.
   - File: `server/src/socket.ts` — all error emits
   - Risk: Information disclosure

8. **No connection limits** — A single IP can open unlimited Socket.IO connections, each creating rooms.
   - File: `server/src/index.ts:31` — no `maxHttpBufferSize` or `connectTimeout`
   - Risk: DoS via connection exhaustion

### Low / Accepted Risk
9. **Predictable room codes** (`Math.random()`) — Acceptable for a home exercise; not a production concern.
10. **No HTTPS** — Acceptable; localhost-only in this exercise.

---

## Logging Decision

**Logging IS a security concern.** Without it, there is no way to:
- Detect abuse patterns (spam, room flooding)
- Debug production incidents
- Audit game events

**Strategy**: A dedicated `logging.ts` module will be added. The fix agent will include it. What gets logged:

| Level | Event |
|-------|-------|
| INFO | Room created, player joined, game started, game ended |
| WARN | Invalid events, rate-limit hits, validation failures |
| ERROR | Caught exceptions, malformed data |

Log format: Structured JSON to stdout (container-friendly).
```
{"ts":"ISO","level":"INFO","event":"room_created","room":"ABC123","player":"socket-123"}
```

---

## Agent Plan

### Agent 1: `server-security-audit`
- **Role**: Read-only audit. Produce vulnerability report.
- **Deliverable**: `docs/code-reviews/server-security-audit-security-api-hardening.md`
- **Branch**: `security/api-hardening`
- **Mode**: Read-only (read + command, no edit)
- Defined in `.roomodes` as custom mode

### Agent 2: `server-security-fix`
- **Role**: Apply fixes for all confirmed vulnerabilities.
- **Deliverables**:
  - Rate limiting middleware for Socket.IO events
  - Input validation for all user-supplied strings
  - Room cleanup/expiry mechanism
  - Reconnect identity hardening
  - `server/src/logging.ts` — structured logging
  - Log calls added to all handlers
- **Branch**: `security/api-hardening`

### Agent 3: `server-security-verify`
- **Role**: Re-run audit checklist, confirm all findings resolved.
- **Deliverable**: `docs/code-reviews/server-security-verify-security-api-hardening.md`
- **Branch**: `security/api-hardening`
- **Mode**: Read-only

---

## Remediation Cycle

```
audit → report findings → fix agent applies fixes → verify agent confirms → APPROVE
                                                                              ↓
                                                                         REJECT → fix again
```

---

## Branch Strategy
- Work on `security/api-hardening` (off `main`)
- Never touch `dev` or `main` during work
- Present summary + ask for user confirmation before pushing to `dev`
- User separately approves PR to `dev`, then `dev` → `main`

---

## Status: PENDING APPROVAL
