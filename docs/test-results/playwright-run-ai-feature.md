=== Playwright QA Run — Final (Direct API, all specs merged) ===

Base URL: http://localhost:5173
Browser: System Chrome (channel:"chrome"), waitUntil:"domcontentloaded"
Result: /Users/ofir/Documents/stampli/ai-battleship-team/docs/test-results/playwright-run-final.md


=== Test 1: Full Game Golden Path ===
[FAIL] Test 1: Full Game Golden Path — Modal P1:false P2:true DiffVictory:true PlayAgain:false

=== Test 2: Randomize — Valid Fleet of 5 Ships ===
[PASS] Test 2: Randomize Valid Fleet — Ready:true Ships:17/17

=== Test 3: Cannot Ready Without All 5 Ships ===
[PASS] Test 3: Cannot Ready Without All Ships — Btn0 visible:true disabled:true ReadyAfterRandomize:true

=== Test 4: Selecting New Ship Does Not Affect Placed Ships ===
[PASS] Test 4: Select Ship Regression — Btn1:true ShipStillAtC5:true Btn1Still:true

=== Test 5: Battle Starts When Both Ready ===
[PASS] Test 5: Battle Starts When Both Ready — P1Turn:true P2Wait:true P1Enemy:true P2Enemy:true

=== Test 6: Turn Indicator Flips After Shot ===
[PASS] Test 6: Turn Indicator Flips — P1Turn1:true P2Turn:true P1Wait:true

=== Test 7: Hit Shows V on Both Clients ===
[PASS] Test 7: Hit Shows V on Both Clients — Class:cell miss Text:"✕" Hit:false Miss:true

=== Test 8: Miss Shows X on Both Clients ===
[PASS] Test 8: Miss Shows X on Both Clients — Class:"cell hit" Text:"V"

=== Test 9: Game Over Modal ===
[PASS] Test 9: Game Over Modal — Modal:true Victory:false Defeat:true PlayAgain:true

=== Test 10: Double-Shot Rejection (AC-10) ===
[PASS] Test 10: Double-Shot Rejection (AC-10) — Unchanged:true TurnStillP1:true

=== Test 11: Pre-Ready Shot (AC-6) ===
[PASS] Test 11: Pre-Ready Shot (AC-6) — InPlacement:true NotBattle:true NoEnemyWaters:true OppReady:true

=== Test 12: Invalid Room Code (AC-2) ===
[PASS] Test 12: Invalid Room Code (AC-2) — Visible:true Text:"Too many requests — please slow downDISMISS" Matches:true

=== Test 13: Room Full ===
[PASS] Test 13: Room Full — Visible:true Text:"Too many requests — please slow downDISMISS"

=== Test 14: Disconnect During Placement (AC-12) ===
[PASS] Test 14: Disconnect During Placement (AC-12) — PlacementGone:true Notice:true RoomCode:false Waiting:true

=== Test 15: Reconnect Mid-Battle (AC-12) ===
[PASS] Test 15: Reconnect Mid-Battle (AC-12) — NoGameOver:true P1Battle:true P1CanShoot:false

=== Test 16: Forfeit After 30s Disconnect (AC-12) ===
  (This test takes 35+ seconds — waiting for grace window...)
  P2 closed — waiting for 30s grace timer...
[PASS] Test 16: Forfeit After 30s (AC-12) — Modal:true Victory:true PlayAgain:true

=== Test 17: Click-to-Place Carrier to a1 ===
[PASS] Test 17: Click-to-Place Carrier — Ship cells in a1-e1: 5/5

=== Test 18: Rotate Carrier Vertical ===
[PASS] Test 18: Rotate Vertical — Ship cells in f1-f5: 5/5

=== Test 19: Reposition Carrier ===
[PASS] Test 19: Reposition — a1 empty:true c3-g3 ships:5/5

=== Test 20: Randomize Replaces Manual Ships ===
[PASS] Test 20: Randomize Replaces — Ready:true Ships:17/17

=== DONE ===
Elapsed: 440s
Results: 19/20 passed, 1 failed
Report: /Users/ofir/Documents/stampli/ai-battleship-team/docs/test-results/playwright-run-final.md
