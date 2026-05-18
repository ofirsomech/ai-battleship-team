# Playwright QA Run — Final Results

> **Run at:** 2026-05-18T22:35:00.770Z
> **Elapsed:** 200s
> **Base URL:** http://localhost:5173
> **Method:** Playwright direct API (`chromium.launch`), `channel:"chrome"`

## Summary

| Metric | Count |
|---|---|
| Total | 20 |
| ✅ Passed | 20 |
| ❌ Failed | 0 |

## Detailed Results

### ✅ Test 1: Full Game Golden Path

- **Detail:** Modal P1:true P2:true DiffVictory:true PlayAgain:true
- **Screenshot:** `test-full-game.png`

### ✅ Test 2: Randomize Valid Fleet

- **Detail:** Ready:true Ships:17/17
- **Screenshot:** `test-randomize-fleet.png`

### ✅ Test 3: Cannot Ready Without All Ships

- **Detail:** Btn0 visible:true disabled:true ReadyAfterRandomize:true
- **Screenshot:** `test-cannot-ready.png`

### ✅ Test 4: Select Ship Regression

- **Detail:** Btn1:true ShipStillAtC5:true Btn1Still:true
- **Screenshot:** `test-select-ship-regression.png`

### ✅ Test 5: Battle Starts When Both Ready

- **Detail:** P1Turn:true P2Wait:true P1Enemy:true P2Enemy:true
- **Screenshot:** `test-battle-starts.png`

### ✅ Test 6: Turn Indicator Flips

- **Detail:** P1Turn1:true P2Turn:true P1Wait:true
- **Screenshot:** `test-turn-flip.png`

### ✅ Test 7: Hit Shows V on Both Clients

- **Detail:** Class:cell hit Text:"V" Hit:true Miss:false
- **Screenshot:** `test-hit-marker.png`

### ✅ Test 8: Miss Shows X on Both Clients

- **Detail:** Class:"cell miss" Text:"x"
- **Screenshot:** `test-miss-marker.png`

### ✅ Test 9: Game Over Modal

- **Detail:** Modal:true Victory:false Defeat:true PlayAgain:true
- **Screenshot:** `test-game-over.png`

### ✅ Test 10: Double-Shot Rejection (AC-10)

- **Detail:** Unchanged:true TurnStillP1:true
- **Screenshot:** `test-double-shot.png`

### ✅ Test 11: Pre-Ready Shot (AC-6)

- **Detail:** InPlacement:true NotBattle:true NoEnemyWaters:true OppReady:true
- **Screenshot:** `test-pre-ready.png`

### ✅ Test 12: Invalid Room Code (AC-2)

- **Detail:** Visible:true Text:"Room not foundDismiss" Matches:true
- **Screenshot:** `test-invalid-room.png`

### ✅ Test 13: Room Full

- **Detail:** Visible:true Text:"Room is fullDismiss"
- **Screenshot:** `test-room-full.png`

### ✅ Test 14: Disconnect During Placement (AC-12)

- **Detail:** PlacementGone:true Notice:true RoomCode:false Waiting:true
- **Screenshot:** `test-disconnect-placement.png`

### ✅ Test 15: Reconnect Mid-Battle (AC-12)

- **Detail:** NoGameOver:true P1Battle:true P1CanShoot:false
- **Screenshot:** `test-reconnect.png`

### ✅ Test 16: Forfeit After 30s (AC-12)

- **Detail:** Modal:true Victory:true PlayAgain:true
- **Screenshot:** `test-forfeit.png`

### ✅ Test 17: Click-to-Place Carrier

- **Detail:** Ship cells in a1-e1: 5/5
- **Screenshot:** `test-drag-drop.png`

### ✅ Test 18: Rotate Vertical

- **Detail:** Ship cells in f1-f5: 5/5
- **Screenshot:** `test-rotate.png`

### ✅ Test 19: Reposition

- **Detail:** a1 empty:true c3-g3 ships:5/5
- **Screenshot:** `test-reposition.png`

### �
=== DONE ===
Elapsed: 200s
Results: 20/20 passed, 0 failed
Report: /Users/ofir/Documents/stampli/ai-battleship-team/docs/test-results/playwright-run-final.md
