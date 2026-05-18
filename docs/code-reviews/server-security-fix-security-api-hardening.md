# Code Review — server-security-fix @ security/api-hardening

| Field | Value |
|---|---|
| **Reviewer** | server-security-fix |
| **Branch** | security/api-hardening |
| **Status** | ✅ COMPLETED |
| **Contract Compliance** | n/a |
| **Date** | 2026-05-18T23:11:00Z |

## Remediations Applied

| Finding | Severity | Fix | File |
|---------|----------|-----|------|
| F-001 | High | Per-event rate limiting (500ms-5s windows) | `server/src/socket.ts` |
| F-002 | High | `playerName` 1-20 chars, `roomCode` 6 alphanumeric | `server/src/socket.ts` |
| F-003 | High | Runtime type guards for all event payloads | `server/src/socket.ts` |
| F-004 | Medium | `crypto.randomBytes()` room codes | `server/src/rooms.ts` |
| F-005 | Critical | CSPRNG reconnect tokens + rotation | `server/src/rooms.ts`, `server/src/socket.ts` |
| F-006 | Medium | Accepted — mitigated by F-005 | — |
| F-007 | High | Periodic idle-room sweep + gameOver cleanup | `server/src/rooms.ts` |
| F-008 | Medium | Max 100 rooms, 5 conns/IP | `server/src/rooms.ts` |
| F-009 | Medium | `maxHttpBufferSize: 1e5` | `server/src/index.ts` |
| F-010 | High | Structured JSON logger (INFO/WARN/ERROR) | `server/src/logging.ts` |
| F-011 | Medium | Generic "Cannot join room" errors | `server/src/socket.ts` |
| F-012 | Low | Grace timer Map cleanup after fire | `server/src/rooms.ts` |
| F-013 | Low | PlayAgain data cleanup on disconnect | `server/src/rooms.ts` |
| F-014 | Low | Explicit heartbeat config (ping/pong) | `server/src/index.ts` |
| F-015 | Medium | `maxConnections: 5000` | `server/src/index.ts` |
| F-016 | Medium | HTML special char stripping on playerName | `server/src/socket.ts` |

## Verification

- `npm --workspace server test`: 57/57 pass
- `npm --workspace server run build`: exits zero
- No change to domain logic or game rules

## Verdict

15 of 16 findings fixed, 1 mitigated. All security remediations applied without breaking existing functionality.
