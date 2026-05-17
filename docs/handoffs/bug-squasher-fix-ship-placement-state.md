# Handoff — client-dev @ fix/ship-placement-state

| Field | Value |
|---|---|
| **Agent** | client-dev (Bug Squasher) |
| **Branch** | fix/ship-placement-state |
| **Status** | 🔄 COMPLETED |
| **Contract Compliance** | true |
| **Tests Added** | 0 |

## Files Changed
- `client/src/components/BoardSetup.tsx`

## Notes
Fixed useEffect at line 118 — added `if (newPlaced.has(shipType)) continue;` so only the FIRST cell of each ship is recorded as the start position. Previously it overwrote with every subsequent cell, causing a Carrier at a1-a5 to be stored with start=a5, which `placeShipOnBoard()` then extended to a5-a9, corrupting previously placed ships. Build passes. QA runner shows Test 4 (Select Ship Regression) PASSED with `ShipStillAtC5:true`.

---
*Logged: 2026-05-17T05:31:00Z*
