# Playwright QA Run — Final Results

> **Run at:** 2026-05-17T01:51:27.939Z
> **Elapsed:** 194s
> **Base URL:** http://localhost:5173
> **Method:** Playwright direct API (`chromium.launch`), `channel:"chrome"`

## Summary

| Metric | Count |
|---|---|
| Total | 16 |
| ✅ Passed | 14 |
| ❌ Failed | 2 |

## Detailed Results

### ❌ Test 1: Full Game Golden Path

- **Detail:** Modal P1:false P2:false DiffVictory:false PlayAgain:false
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

- **Detail:** Class:cell miss Text:"x" Hit:false Miss:true
- **Screenshot:** `test-hit-marker.png`

### ✅ Test 8: Miss Shows X on Both Clients

- **Detail:** Class:"cell miss" Text:"x"
- **Screenshot:** `test-miss-marker.png`

### ❌ Test 9: Game Over Modal

- **Detail:** Modal:false Victory:false Defeat:false PlayAgain:false
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

- **Detail:*
=== DONE ===
Elapsed: 194s
Results: 14/16 passed, 2 failed
Report: /Users/ofir/Documents/stampli/ai-battleship-team/docs/test-results/playwright-run-final.md
