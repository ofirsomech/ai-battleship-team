# Code Review — bug-squasher @ fix/ship-placement-state

| Field | Value |
|---|---|
| **Reviewer** | orchestrator |
| **Branch** | fix/ship-placement-state |
| **Status** | ✅ APPROVE |
| **Contract Compliance** | true |
| **Date** | 2026-05-17T05:31:00Z |

## Bug Summary

Placing a new ship corrupted previously placed ships. Root cause in `client/src/components/BoardSetup.tsx:109-138`.

## Criteria Check

| # | Criterion | Result |
|---|-----------|--------|
| 1 | First cell of each ship recorded as start (not last) | ✅ PASS |
| 2 | `npm --workspace client run build` passes | ✅ PASS |
| 3 | QA runner Test 4 (Select Ship Regression) passes | ✅ PASS |
| 4 | No new regressions introduced | ✅ PASS |

## Fix Details

| File | Line | Change |
|------|------|--------|
| `client/src/components/BoardSetup.tsx` | 119 | Added `if (newPlaced.has(shipType)) continue;` |

The `useEffect` rebuilding `placedShips` from `ownBoard` iterated all cells, calling `newPlaced.set()` for every cell matching a ship type. For a Carrier at a1-a5, it recorded a5 (the last cell) as the start position. `placeShipOnBoard()` then placed from a5 going right into a5-a9, corrupting the position.

## Verdict

Fix correct and minimal. Only the first cell of each ship type is now recorded. Build clean. Regression test passes. Approved for merge to dev.
