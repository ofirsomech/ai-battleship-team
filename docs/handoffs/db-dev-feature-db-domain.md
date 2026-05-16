agent: db-dev
branch: feature/db-domain
status: COMPLETED
files_changed:
  - server/src/domain/board.ts
  - server/src/domain/match.ts
  - server/src/domain/__tests__/board.test.ts
  - server/src/domain/__tests__/match.test.ts
  - server/package.json
contract_compliance: true
tests_added: 57
notes: |
  Delivered pure domain logic with zero I/O imports. All types imported from @battleship/shared.
  board.ts exports createEmptyBoard, placeShip, randomLayout, applyShipsToBoard, and getShipCells.
  match.ts exports createGameState, addPlayerToGameState, applyShot, isFleetSunk, and getOpponentId.
  57 unit tests (32 board + 25 match) all pass via vitest. tsc --noEmit is clean. Reviewed and
  APPROVED by db-reviewer; merged to dev.
```
