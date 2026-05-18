=== Playwright QA Run — Final (Direct API, all specs merged) ===

Base URL: http://localhost:5173
Browser: System Chrome (channel:"chrome"), waitUntil:"domcontentloaded"
Result: /Users/ofir/Documents/stampli/ai-battleship-team/docs/test-results/playwright-run-final.md


=== Test 1: Full Game Golden Path ===
[FAIL] Test 1: Full Game Golden Path — Exception: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for locator('text=Room Code') to be visible[22m


=== Test 2: Randomize — Valid Fleet of 5 Ships ===
[FAIL] Test 2: Randomize Valid Fleet — Exception: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for locator('text=Room Code') to be visible[22m


=== Test 3: Cannot Ready Without All 5 Ships ===
[FAIL] Test 3: Cannot Ready Without All Ships — Exception: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for locator('text=Room Code') to be visible[22m


=== Test 4: Selecting New Ship Does Not Affect Placed Ships ===
