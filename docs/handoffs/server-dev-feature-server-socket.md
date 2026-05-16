agent: server-dev
branch: feature/server-socket
status: COMPLETED
files_changed:
  - server/src/index.ts
  - server/src/rooms.ts
  - server/src/socket.ts
contract_compliance: true
tests_added: 0
notes: |
  All 8 client→server Socket.IO events from docs/api_contract.md are wired with full input validation, domain delegation, and proper typed emits. Disconnect handling follows game_spec.md §8: immediate drop during lobby/placement, 30s grace window during battle with forfeit on expiry. Room state machine (lobby → placement → battle → gameOver → placement) enforced via phase guards. Host (players[0]) shoots first per §5. randomizeShips and playAgain use Socket.IO acknowledgement callbacks for client notification. No business logic in handlers — all game logic delegated to domain/board.ts and domain/match.ts. Manual smoke test confirmed: createRoom → joinRoom → placeShips → playerReady → battleStart flow works end-to-end.
```
