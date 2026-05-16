agent: db-reviewer
branch: feature/db-domain
status: APPROVE
files_changed:
  - server/src/domain/board.ts
  - server/src/domain/match.ts
  - server/src/domain/__tests__/board.test.ts
  - server/src/domain/__tests__/match.test.ts
contract_compliance: true
tests_added: 57
notes: |
  All DoD criteria met. 57/57 tests pass, zero tsc errors, zero I/O imports, all 10 exports covered,
  edge cases validated (OOB placement, overlap, double-shot, wrong-turn, wrong-phase, unknown-shooter,
  game-over transition). Types all from @battleship/shared; PlaceShipResult is a domain-local discriminator.
  Approved for merge to dev.
```
