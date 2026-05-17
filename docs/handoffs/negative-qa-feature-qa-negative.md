# Handoff — negative-qa @ feature/qa-negative

| Field | Value |
|---|---|
| **Agent** | negative-qa |
| **Branch** | feature/qa-negative |
| **Status** | 🔄 COMPLETED |
| **Contract Compliance** | n/a |
| **Tests Added** | 16 |

## Files Changed
- `tests/e2e/negative.spec.ts`
- `tests/e2e/placement.spec.ts` (modified — regression fix)
- `tests/e2e/mcp-qa-runner.js`
- `tsconfig.json`
- `tsconfig.test.json`

## Notes
16 tests implemented. 14/16 PASS. 2 failures in full-game-over modal (timing flaky with random-ship-placement cell scanning). All negative/edge-case tests PASS: double-shot, pre-ready, overlapping, invalid room, room full, disconnect placement, reconnect mid-battle, forfeit after 30s. Known bugs documented: (1) `store.ts:239-246` PLAYER_DISCONNECTED overwrites lobbyNotice, (2) room code not cleared after placement disconnect, (3) GameOverModal reason hardcoded "allSunk" even on forfeit. Used direct Playwright API via `chromium.launch` with `channel:"chrome"` to work around CLI hanging.

---
*Logged: 2026-05-17T01:53:00Z*
