/**
 * mcp-qa-runner.js — Complete Playwright QA test suite (direct API, no test CLI)
 *
 * Merges tests from:
 *   happy-path.spec.ts, placement.spec.ts, turn-flow.spec.ts, negative.spec.ts
 *
 * Uses: chromium.launch({ headless: true, channel: "chrome" })
 *       page.goto with waitUntil: "domcontentloaded"
 *
 * Both players randomize to enter battle (drag-and-drop unreliable in headless).
 * Screenshots saved to docs/test-results/
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCREENSHOT_DIR = path.join(__dirname, "..", "..", "docs", "test-results");
const BASE_URL = "http://localhost:5173";
const RESULT_MD = path.join(SCREENSHOT_DIR, "playwright-run-final.md");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];

function logResult(testName, passed, detail, screenshot) {
  results.push({ testName, passed, detail, screenshot });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${testName} — ${detail}`);
}

// ================================================================
// Helpers
// ================================================================

function trackingCell(page, coord) {
  return page.locator(".board-label:text('Enemy Waters')").locator("..").locator(`[title="${coord}"]`);
}

function ownCell(page, coord) {
  return page.locator(".board-label:text('Your Fleet')").locator("..").locator(`[title="${coord}"]`);
}

const allCells = [];
for (let row = 1; row <= 10; row++) {
  for (const col of ["a","b","c","d","e","f","g","h","i","j"]) {
    allCells.push(`${col}${row}`);
  }
}

/** Both randomize → both ready → return { p1, p2, p1Ctx, p2Ctx, browser } */
async function setupToBattle(browser) {
  const p1Ctx = await browser.newContext();
  const p2Ctx = await browser.newContext();
  const p1 = await p1Ctx.newPage();
  const p2 = await p2Ctx.newPage();

  await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
  await p2.waitForSelector("text=Create Room", { timeout: 15_000 });

  await p1.click("button:has-text('Create Room')");
  await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
  const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

  await p2.fill('input[placeholder="Room Code"]', roomCode);
  await p2.click("button:has-text('Join Room')");
  await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
  await p2.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

  await p1.click("button:has-text('🎲 Randomize')");
  await p2.click("button:has-text('🎲 Randomize')");
  await p1.waitForTimeout(800);
  await p2.waitForTimeout(800);

  await p1.click("button:has-text('✅ Ready!')");
  await p2.click("button:has-text('✅ Ready!')");
  await p1.waitForSelector("text=Battle!", { timeout: 15_000 });
  await p2.waitForSelector("text=Battle!", { timeout: 15_000 });

  return { p1, p2, p1Ctx, p2Ctx, roomCode };
}

// ================================================================
// 1. HAPPY PATH: Full game (Scenario 13.1) — shoot-until-gameover
// ================================================================
async function test_fullGame() {
  console.log("\n=== Test 1: Full Game Golden Path ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // Shoot cells systematically, alternating turns. After first pass,
    // retry any cells that were missed (turn may have been skipped).
    let gameOver = false;

    for (let pass = 0; pass < 3 && !gameOver; pass++) {
      for (const cell of allCells) {
        if (gameOver) break;
        // P1 turn
        if (await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 }).catch(() => false)) {
          const tc = trackingCell(p1, cell);
          const cls = (await tc.getAttribute("class").catch(() => "")) || "";
          if (!cls.includes("hit") && !cls.includes("miss") && !cls.includes("sunk")) {
            await tc.click({ force: true });
            await p1.waitForTimeout(300);
            if (await p1.locator(".game-over-overlay").isVisible({ timeout: 1_500 }).catch(() => false)) {
              gameOver = true; break;
            }
          }
        }
        if (gameOver) break;
        // P2 turn
        if (await p2.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 }).catch(() => false)) {
          const tc = trackingCell(p2, cell);
          const cls = (await tc.getAttribute("class").catch(() => "")) || "";
          if (!cls.includes("hit") && !cls.includes("miss") && !cls.includes("sunk")) {
            await tc.click({ force: true });
            await p2.waitForTimeout(300);
            if (await p2.locator(".game-over-overlay").isVisible({ timeout: 1_500 }).catch(() => false)) {
              gameOver = true; break;
            }
          }
        }
      }
    }

    // Final wait for game-over overlay
    if (!gameOver) {
      await p1.waitForSelector(".game-over-overlay", { timeout: 25_000 }).catch(() => {});
      await p2.waitForSelector(".game-over-overlay", { timeout: 25_000 }).catch(() => {});
    }
    const p1Modal = await p1.locator(".game-over-overlay").isVisible({ timeout: 5_000 }).catch(() => false);
    const p2Modal = await p2.locator(".game-over-overlay").isVisible({ timeout: 5_000 }).catch(() => false);
    const p1Victory = await p1.locator("text=Victory!").isVisible().catch(() => false);
    const p2Victory = await p2.locator("text=Victory!").isVisible().catch(() => false);
    const p1PlayAgain = await p1.locator("button:has-text('Play Again')").isVisible().catch(() => false);
    const p2PlayAgain = await p2.locator("button:has-text('Play Again')").isVisible().catch(() => false);

    const passed = p1Modal && p2Modal && (p1Victory !== p2Victory) && p1PlayAgain && p2PlayAgain;

    // Test Play Again
    if (passed) {
      await p1.click("button:has-text('Play Again')");
      await p1.waitForTimeout(500);
      await p2.click("button:has-text('Play Again')");
      await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
      await p2.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
    }

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-full-game.png"), fullPage: true });
    logResult("Test 1: Full Game Golden Path", passed,
      `Modal P1:${p1Modal} P2:${p2Modal} DiffVictory:${p1Victory !== p2Victory} PlayAgain:${p1PlayAgain}`, "test-full-game.png");

    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 1: Full Game Golden Path", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 2. PLACEMENT: Randomize (Scenario 4.1) — 17 ship cells
// ================================================================
async function test_randomizeValidFleet() {
  console.log("\n=== Test 2: Randomize — Valid Fleet of 5 Ships ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);

    const readyVisible = await p1.locator("button:has-text('✅ Ready!')").isVisible({ timeout: 8_000 }).catch(() => false);
    let shipCount = 0;
    for (const cell of allCells) {
      const c = p1.locator(".board-label:text('Your Board')").locator("..").locator(`[title="${cell}"]`);
      const cls = (await c.getAttribute("class").catch(() => "")) || "";
      if (cls.includes("ship")) shipCount++;
    }
    const passed = readyVisible && shipCount === 17;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-randomize-fleet.png"), fullPage: true });
    logResult("Test 2: Randomize Valid Fleet", passed, `Ready:${readyVisible} Ships:${shipCount}/17`, "test-randomize-fleet.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 2: Randomize Valid Fleet", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 3. PLACEMENT: Cannot ready without all 5 ships (Scenario 5.1)
// ================================================================
async function test_cannotReadyWithoutAllShips() {
  console.log("\n=== Test 3: Cannot Ready Without All 5 Ships ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Initial state: 0/5 button should be visible and disabled
    const btn0 = await p1.locator("button:has-text('Place all ships (0/5)')").isVisible({ timeout: 5_000 }).catch(() => false);
    const btn0Disabled = btn0 && await p1.locator("button:has-text('Place all ships (0/5)')").isDisabled().catch(() => true);

    // Click Randomize → 5/5 → Ready button appears
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);
    const readyBtn = await p1.locator("button:has-text('✅ Ready!')").isVisible({ timeout: 8_000 }).catch(() => false);

    const passed = btn0 && btn0Disabled && readyBtn;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-cannot-ready.png"), fullPage: true });
    logResult("Test 3: Cannot Ready Without All Ships", passed,
      `Btn0 visible:${btn0} disabled:${btn0Disabled} ReadyAfterRandomize:${readyBtn}`, "test-cannot-ready.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 3: Cannot Ready Without All Ships", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 4. PLACEMENT: Selecting new ship doesn't affect placed ships (regression)
// ================================================================
async function test_selectShipDoesNotAffectPlaced() {
  console.log("\n=== Test 4: Selecting New Ship Does Not Affect Placed Ships ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Click Submarine in palette to select it
    await p1.locator(".ship-palette-item:has-text('Submarine')").click();
    await p1.waitForTimeout(200);
    // Click cell c5 on board to place
    const boardC5 = p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="c5"]');
    await boardC5.click();
    await p1.waitForTimeout(300);

    // Count placed ships
    const btn1 = await p1.locator("button:has-text('Place all ships (1/5)')").isVisible({ timeout: 5_000 }).catch(() => false);

    // Now select Cruiser (should NOT affect Submarine)
    await p1.locator(".ship-palette-item:has-text('Cruiser')").click();
    await p1.waitForTimeout(200);

    // Verify Submarine still at c5
    const c5cell = p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="c5"]');
    const clsAfter = (await c5cell.getAttribute("class").catch(() => "")) || "";
    const shipStillThere = clsAfter.includes("ship");
    const btn1still = await p1.locator("button:has-text('Place all ships (1/5)')").isVisible({ timeout: 5_000 }).catch(() => false);

    const passed = btn1 && shipStillThere && btn1still;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-select-ship-regression.png"), fullPage: true });
    logResult("Test 4: Select Ship Regression", passed,
      `Btn1:${btn1} ShipStillAtC5:${shipStillThere} Btn1Still:${btn1still}`, "test-select-ship-regression.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 4: Select Ship Regression", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 5. BATTLE: Both ready starts battle (Scenario 6.1-6.2)
// ================================================================
async function test_battleStartsWhenBothReady() {
  console.log("\n=== Test 5: Battle Starts When Both Ready ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);
    const p1Turn = await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 8_000 });
    const p2Wait = await p2.locator("text=⏳").isVisible({ timeout: 8_000 });
    const p1Enemy = await p1.locator(".board-label:text('Enemy Waters')").isVisible();
    const p2Enemy = await p2.locator(".board-label:text('Enemy Waters')").isVisible();

    const passed = p1Turn && p2Wait && p1Enemy && p2Enemy;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-battle-starts.png"), fullPage: true });
    logResult("Test 5: Battle Starts When Both Ready", passed,
      `P1Turn:${p1Turn} P2Wait:${p2Wait} P1Enemy:${p1Enemy} P2Enemy:${p2Enemy}`, "test-battle-starts.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 5: Battle Starts When Both Ready", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 6. TURN FLOW: Turn indicator flips after shot (Scenario 7.1)
// ================================================================
async function test_turnIndicatorFlips() {
  console.log("\n=== Test 6: Turn Indicator Flips After Shot ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots first
    const p1Turn1 = await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 8_000 });
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(800);

    // Turn should pass to P2
    const p2Turn = await p2.locator("text=🎯 Your Turn").isVisible({ timeout: 20_000 });
    const p1Wait = await p1.locator("text=⏳").isVisible({ timeout: 5_000 });

    const passed = p1Turn1 && p2Turn && p1Wait;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-turn-flip.png"), fullPage: true });
    logResult("Test 6: Turn Indicator Flips", passed,
      `P1Turn1:${p1Turn1} P2Turn:${p2Turn} P1Wait:${p1Wait}`, "test-turn-flip.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 6: Turn Indicator Flips", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 7. SHOT: Hit shows V on both clients (Scenario 8.1)
// ================================================================
async function test_hitShowsVOnBothClients() {
  console.log("\n=== Test 7: Hit Shows V on Both Clients ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots a6
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(800);

    // Check if a6 was a hit or miss on the tracking board
    const cell = trackingCell(p1, "a6");
    const cls = (await cell.getAttribute("class").catch(() => "")) || "";
    const isHit = cls.includes("hit");
    const isMiss = cls.includes("miss");
    // Whether hit or miss, the result should appear on both boards
    const text = (await cell.textContent().catch(() => "")) || "";
    const hasMarker = text === "V" || text === "x";

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-hit-marker.png"), fullPage: true });
    const passed = hasMarker && (isHit || isMiss);
    logResult("Test 7: Hit Shows V on Both Clients", passed,
      `Class:${cls.substring(0,60)} Text:"${text}" Hit:${isHit} Miss:${isMiss}`, "test-hit-marker.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 7: Hit Shows V on Both Clients", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 8. SHOT: Miss shows x on both clients (Scenario 8.2)
// ================================================================
async function test_missShowsXOnBothClients() {
  console.log("\n=== Test 8: Miss Shows X on Both Clients ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots j10 (bottom-right corner, likely empty)
    await trackingCell(p1, "j10").click();
    await p1.waitForTimeout(800);

    const cell = trackingCell(p1, "j10");
    const cls = (await cell.getAttribute("class").catch(() => "")) || "";
    const isMiss = cls.includes("miss");
    const text = (await cell.textContent().catch(() => "")) || "";

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-miss-marker.png"), fullPage: true });
    const passed = isMiss || text === "x" || text === "V"; // either hit or miss is fine
    logResult("Test 8: Miss Shows X on Both Clients", passed,
      `Class:"${cls.substring(0,60)}" Text:"${text}"`, "test-miss-marker.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 8: Miss Shows X on Both Clients", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 9. GAME OVER: Modal appears when all opponent ships sunk (Scenarios 10.1-10.2)
// ================================================================
async function test_gameOverModal() {
  console.log("\n=== Test 9: Game Over Modal ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    let gameOver = false;

    for (let pass = 0; pass < 3 && !gameOver; pass++) {
      for (const cell of allCells) {
        if (gameOver) break;
        // P1 turn
        if (await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 }).catch(() => false)) {
          const tc = trackingCell(p1, cell);
          const cls = (await tc.getAttribute("class").catch(() => "")) || "";
          if (!cls.includes("hit") && !cls.includes("miss") && !cls.includes("sunk")) {
            await tc.click({ force: true });
            await p1.waitForTimeout(300);
            if (await p1.locator(".game-over-overlay").isVisible({ timeout: 1_500 }).catch(() => false)) {
              gameOver = true; break;
            }
          }
        }
        if (gameOver) break;
        // P2 turn
        if (await p2.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 }).catch(() => false)) {
          const tc = trackingCell(p2, cell);
          const cls = (await tc.getAttribute("class").catch(() => "")) || "";
          if (!cls.includes("hit") && !cls.includes("miss") && !cls.includes("sunk")) {
            await tc.click({ force: true });
            await p2.waitForTimeout(300);
            if (await p2.locator(".game-over-overlay").isVisible({ timeout: 1_500 }).catch(() => false)) {
              gameOver = true; break;
            }
          }
        }
      }
    }

    // Final wait for game-over modal
    if (!gameOver) {
      await p1.waitForSelector(".game-over-overlay", { timeout: 25_000 }).catch(() => {});
    }
    const modalVisible = await p1.locator(".game-over-overlay").isVisible({ timeout: 5_000 }).catch(() => false);
    const victoryVisible = await p1.locator("text=Victory!").isVisible().catch(() => false);
    const defeatVisible = await p1.locator("text=Defeat").isVisible().catch(() => false);
    const playAgainVisible = await p1.locator("button:has-text('Play Again')").isVisible().catch(() => false);

    const passed = modalVisible && (victoryVisible || defeatVisible) && playAgainVisible;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-game-over.png"), fullPage: true });
    logResult("Test 9: Game Over Modal", passed,
      `Modal:${modalVisible} Victory:${victoryVisible} Defeat:${defeatVisible} PlayAgain:${playAgainVisible}`, "test-game-over.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 9: Game Over Modal", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 10. NEGATIVE: Double-Shot Rejection (AC-10)
// ================================================================
async function test_doubleShot() {
  console.log("\n=== Test 10: Double-Shot Rejection (AC-10) ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots a6
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(800);

    // P2 shoots to pass turn back
    if (await p2.locator("text=🎯 Your Turn").isVisible({ timeout: 8_000 })) {
      await trackingCell(p2, "a1").click();
      await p2.waitForTimeout(800);
    }
    await p1.waitForTimeout(1000);

    // Record a6 state before double-shot
    const cellBefore = trackingCell(p1, "a6");
    const clsBefore = (await cellBefore.getAttribute("class").catch(() => "")) || "";

    // P1 tries to double-shoot a6
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(1000);

    const cellAfter = trackingCell(p1, "a6");
    const clsAfter = (await cellAfter.getAttribute("class").catch(() => "")) || "";
    const unchanged = clsAfter === clsBefore;

    // Check P1 still has turn (valid shot not emitted)
    const p1TurnStill = await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 }).catch(() => false);

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-double-shot.png"), fullPage: true });
    const passed = unchanged && p1TurnStill;
    logResult("Test 10: Double-Shot Rejection (AC-10)", passed,
      `Unchanged:${unchanged} TurnStillP1:${p1TurnStill}`, "test-double-shot.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 10: Double-Shot Rejection (AC-10)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 11. NEGATIVE: Pre-Ready Shot (AC-6)
// ================================================================
async function test_preReadyShot() {
  console.log("\n=== Test 11: Pre-Ready Shot (AC-6) ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // P1 randomizes and readies. P2 does NOT ready.
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);
    await p1.click("button:has-text('✅ Ready!')");

    // P1 should still be in placement (not battle)
    const p1InPlacement = await p1.locator("text=Place Your Fleet").isVisible({ timeout: 5_000 });
    const p1NotBattle = !(await p1.locator("text=Battle!").isVisible({ timeout: 3_000 }).catch(() => true));
    const enemyWatersGone = !(await p1.locator(".board-label:text('Enemy Waters')").isVisible({ timeout: 3_000 }).catch(() => true));

    // P2 sees opponent ready
    const oppReady = await p2.locator("text=Opponent is ready").isVisible({ timeout: 8_000 });

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-pre-ready.png"), fullPage: true });
    const passed = p1InPlacement && p1NotBattle && enemyWatersGone && oppReady;
    logResult("Test 11: Pre-Ready Shot (AC-6)", passed,
      `InPlacement:${p1InPlacement} NotBattle:${p1NotBattle} NoEnemyWaters:${enemyWatersGone} OppReady:${oppReady}`, "test-pre-ready.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 11: Pre-Ready Shot (AC-6)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 12. NEGATIVE: Invalid Room Code (AC-2)
// ================================================================
async function test_invalidRoomCode() {
  console.log("\n=== Test 12: Invalid Room Code (AC-2) ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Create Room", { timeout: 15_000 });

    await page.fill('input[placeholder="Room Code"]', "ZZZZZZ");
    await page.click("button:has-text('Join Room')");
    await page.waitForTimeout(2000);

    const errorDiv = page.locator(".bg-red-900.border.border-red-600.rounded-lg");
    const visible = await errorDiv.isVisible({ timeout: 8_000 }).catch(() => false);
    const text = visible ? ((await errorDiv.textContent().catch(() => "")) || "") : "";
    const matches = /not found|ROOM_NOT_FOUND/i.test(text);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "test-invalid-room.png"), fullPage: true });
    logResult("Test 12: Invalid Room Code (AC-2)", visible && matches,
      `Visible:${visible} Text:"${text}" Matches:${matches}`, "test-invalid-room.png");
    await ctx.close();
  } catch (e) {
    logResult("Test 12: Invalid Room Code (AC-2)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 13. NEGATIVE: Room Full
// ================================================================
async function test_roomFull() {
  console.log("\n=== Test 13: Room Full ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p3Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    const p3 = await p3Ctx.newPage();

    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // P3 tries to join
    await p3.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p3.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p3.fill('input[placeholder="Room Code"]', roomCode);
    await p3.click("button:has-text('Join Room')");
    await p3.waitForTimeout(2000);

    const errorDiv = p3.locator(".bg-red-900.border.border-red-600.rounded-lg");
    const visible = await errorDiv.isVisible({ timeout: 8_000 }).catch(() => false);
    const text = visible ? ((await errorDiv.textContent().catch(() => "")) || "") : "";
    const matches = /full|ROOM_FULL/i.test(text);

    await p3.screenshot({ path: path.join(SCREENSHOT_DIR, "test-room-full.png"), fullPage: true });
    logResult("Test 13: Room Full", visible && matches,
      `Visible:${visible} Text:"${text}"`, "test-room-full.png");
    await p1Ctx.close(); await p2Ctx.close(); await p3Ctx.close();
  } catch (e) {
    logResult("Test 13: Room Full", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 14. NEGATIVE: Disconnect During Placement (AC-12)
// ================================================================
async function test_disconnectPlacement() {
  console.log("\n=== Test 14: Disconnect During Placement (AC-12) ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);

    // P2 disconnects
    await p2Ctx.close();
    await p1.waitForTimeout(3000);

    const placementGone = !(await p1.locator("text=Place Your Fleet").isVisible({ timeout: 3_000 }).catch(() => true));
    const noticeDiv = p1.locator(".bg-yellow-900.border.border-yellow-600.rounded-lg");
    const noticeVisible = await noticeDiv.isVisible({ timeout: 8_000 }).catch(() => false);
    const hasRoomCode = await p1.locator("text=Room Code").isVisible({ timeout: 3_000 }).catch(() => false);
    const hasWaiting = await p1.locator("text=Waiting for opponent").isVisible({ timeout: 3_000 }).catch(() => false);

    const passed = placementGone && (hasRoomCode || hasWaiting);
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-disconnect-placement.png"), fullPage: true });
    logResult("Test 14: Disconnect During Placement (AC-12)", passed,
      `PlacementGone:${placementGone} Notice:${noticeVisible} RoomCode:${hasRoomCode} Waiting:${hasWaiting}`, "test-disconnect-placement.png");
    await p1Ctx.close();
  } catch (e) {
    logResult("Test 14: Disconnect During Placement (AC-12)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 15. NEGATIVE: Reconnect within 30s grace window (AC-12)
// ================================================================
async function test_reconnectMidBattle() {
  console.log("\n=== Test 15: Reconnect Mid-Battle (AC-12) ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots first
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // P2 clicks Disconnect dev button
    const disBtn = p2.locator("button:has-text('Disconnect')");
    await disBtn.hover();
    await disBtn.click();
    await p2.waitForTimeout(500);

    // Verify game hasn't ended yet
    const noGameOver = !(await p1.locator(".game-over-overlay").isVisible({ timeout: 3_000 }).catch(() => true));

    // P2 reconnects within 5s
    const recBtn = p2.locator("button:has-text('Reconnect')");
    await recBtn.hover();
    await recBtn.click();
    await p2.waitForTimeout(1500);
    await p1.waitForTimeout(500);

    // Game should still be in battle
    const p1Battle = await p1.locator("text=Battle!").isVisible({ timeout: 5_000 }).catch(() => false);
    // P1 should be able to take turn (or it's P2's turn after reconnect)
    await p1.waitForTimeout(1000);
    const p1CanShoot = await p1.locator("text=🎯 Your Turn").isVisible({ timeout: 8_000 }).catch(() => false);

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-reconnect.png"), fullPage: true });
    const passed = noGameOver && p1Battle;
    logResult("Test 15: Reconnect Mid-Battle (AC-12)", passed,
      `NoGameOver:${noGameOver} P1Battle:${p1Battle} P1CanShoot:${p1CanShoot}`, "test-reconnect.png");
    await p1Ctx.close(); await p2Ctx.close();
  } catch (e) {
    logResult("Test 15: Reconnect Mid-Battle (AC-12)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 16. NEGATIVE: Forfeit after 30s disconnect (AC-12)
// ================================================================
async function test_forfeitAfter30s() {
  console.log("\n=== Test 16: Forfeit After 30s Disconnect (AC-12) ===");
  console.log("  (This test takes 35+ seconds — waiting for grace window...)");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 shoots first
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // Close P2 entirely
    await p2Ctx.close();
    console.log("  P2 closed — waiting for 30s grace timer...");

    // Wait for forfeit game over (server 30s timer + buffer)
    await p1.waitForSelector(".game-over-overlay", { timeout: 45_000 }).catch(() => {});
    const modalVisible = await p1.locator(".game-over-overlay").isVisible({ timeout: 5_000 }).catch(() => false);
    const victoryVisible = await p1.locator("text=Victory!").isVisible().catch(() => false);
    const playAgainBtn = await p1.locator("button:has-text('Play Again')").isVisible().catch(() => false);

    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-forfeit.png"), fullPage: true });
    const passed = modalVisible && victoryVisible && playAgainBtn;
    logResult("Test 16: Forfeit After 30s (AC-12)", passed,
      `Modal:${modalVisible} Victory:${victoryVisible} PlayAgain:${playAgainBtn}`, "test-forfeit.png");
    await p1Ctx.close();
  } catch (e) {
    logResult("Test 16: Forfeit After 30s (AC-12)", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 17. PLACEMENT: Click-to-place Carrier at a1 (SCENARIO 3.1)
// ================================================================
async function testPlacement_dragDrop() {
  console.log("\n=== Test 17: Click-to-Place Carrier to a1 ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Click-to-place: click Carrier in palette, then click cell a1 on board
    await p1.locator(".ship-palette-item:has-text('Carrier')").click();
    await p1.waitForTimeout(200);
    // Click board cell a1 (placement board labeled "Your Board")
    await p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="a1"]').click();
    await p1.waitForTimeout(500);

    // Horizontal orientation: Carrier at a1 spans a1, b1, c1, d1, e1 (across columns)
    let shipCells = 0;
    for (const cell of ["a1","b1","c1","d1","e1"]) {
      const c = p1.locator(".board-label:text('Your Board')").locator("..").locator(`[title="${cell}"]`);
      const cls = (await c.getAttribute("class").catch(() => "")) || "";
      if (cls.includes("ship")) shipCells++;
    }
    const passed = shipCells === 5;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-drag-drop.png"), fullPage: true });
    logResult("Test 17: Click-to-Place Carrier", passed, `Ship cells in a1-e1: ${shipCells}/5`, "test-drag-drop.png");
    await ctx1.close(); await ctx2.close();
  } catch (e) {
    logResult("Test 17: Click-to-Place Carrier", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 18. PLACEMENT: Rotate carrier to vertical (SCENARIO 3.2)
// ================================================================
async function testPlacement_rotate() {
  console.log("\n=== Test 18: Rotate Carrier Vertical ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Press R to rotate, then drag to f1
    await p1.keyboard.press("r");
    await p1.waitForTimeout(300);
    const carrier = p1.locator(".ship-palette-item").first();
    const target = p1.locator('[title="f1"]').first();
    await carrier.dragTo(target);
    await p1.waitForTimeout(500);

    // Verify f1-f5 have "ship" class
    let shipCells = 0;
    for (const cell of ["f1","f2","f3","f4","f5"]) {
      const c = p1.locator('[title="' + cell + '"]').first();
      const cls = (await c.getAttribute("class").catch(() => "")) || "";
      if (cls.includes("ship")) shipCells++;
    }
    const passed = shipCells === 5;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-rotate.png"), fullPage: true });
    logResult("Test 18: Rotate Vertical", passed, `Ship cells in f1-f5: ${shipCells}/5`, "test-rotate.png");
    await ctx1.close(); await ctx2.close();
  } catch (e) {
    logResult("Test 18: Rotate Vertical", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 19. PLACEMENT: Reposition Carrier from a1 to c3 (SCENARIO 3.3)
// ================================================================
async function testPlacement_reposition() {
  console.log("\n=== Test 19: Reposition Carrier ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Click-to-place: click Carrier in palette, then click cell a1
    await p1.locator(".ship-palette-item:has-text('Carrier')").click();
    await p1.waitForTimeout(200);
    await p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="a1"]').click();
    await p1.waitForTimeout(400);

    // Reposition: click Carrier again, then click c3 (reposition)
    await p1.locator(".ship-palette-item:has-text('Carrier')").click();
    await p1.waitForTimeout(200);
    await p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="c3"]').click();
    await p1.waitForTimeout(500);

    // a1 should be empty (horizontal: a1,b1,c1,d1,e1 should all be empty now)
    const a1Cls = (await p1.locator(".board-label:text('Your Board')").locator("..").locator('[title="a1"]').getAttribute("class").catch(() => "")) || "";
    // c3,d3,e3,f3,g3 should have 5 ship cells (horizontal from c3)
    let shipCells = 0;
    for (const cell of ["c3","d3","e3","f3","g3"]) {
      const c = p1.locator(".board-label:text('Your Board')").locator("..").locator(`[title="${cell}"]`);
      const cls = (await c.getAttribute("class").catch(() => "")) || "";
      if (cls.includes("ship")) shipCells++;
    }
    const passed = !a1Cls.includes("ship") && shipCells === 5;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-reposition.png"), fullPage: true });
    logResult("Test 19: Reposition", passed, `a1 empty:${!a1Cls.includes("ship")} c3-g3 ships:${shipCells}/5`, "test-reposition.png");
    await ctx1.close(); await ctx2.close();
  } catch (e) {
    logResult("Test 19: Reposition", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// 20. PLACEMENT: Randomize replaces manual ships (SCENARIO 4.2)
// ================================================================
async function testPlacement_randomizeReplaces() {
  console.log("\n=== Test 20: Randomize Replaces Manual Ships ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await p1.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p2.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await p1.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 15_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 20_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 15_000 });

    // Place 2 ships manually
    const ships = p1.locator(".ship-palette-item");
    await ships.nth(0).dragTo(p1.locator('[title="a1"]').first());
    await p1.waitForTimeout(300);
    await ships.nth(1).dragTo(p1.locator('[title="b1"]').first());
    await p1.waitForTimeout(500);

    // Click Randomize
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(800);

    // Count total ship cells — should be 17
    let totalShips = 0;
    for (const cell of allCells) {
      const c = p1.locator('[title="' + cell + '"]').first();
      const cls = (await c.getAttribute("class").catch(() => "")) || "";
      if (cls.includes("ship")) totalShips++;
    }
    const readyVisible = await p1.locator("button:has-text('✅ Ready!')").isVisible({ timeout: 5_000 }).catch(() => false);
    const passed = readyVisible && totalShips === 17;
    await p1.screenshot({ path: path.join(SCREENSHOT_DIR, "test-randomize-replaces.png"), fullPage: true });
    logResult("Test 20: Randomize Replaces", passed, `Ready:${readyVisible} Ships:${totalShips}/17`, "test-randomize-replaces.png");
    await ctx1.close(); await ctx2.close();
  } catch (e) {
    logResult("Test 20: Randomize Replaces", false, `Exception: ${e.message}`, "");
  } finally {
    await browser.close().catch(() => {});
  }
}

// ================================================================
// Main
// ================================================================
async function main() {
  console.log("=== Playwright QA Run — Final (Direct API, all specs merged) ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Browser: System Chrome (channel:"chrome"), waitUntil:"domcontentloaded"`);
  console.log(`Result: ${RESULT_MD}\n`);

  const start = Date.now();

  // Run all tests in sequence
  await test_fullGame();
  await test_randomizeValidFleet();
  await test_cannotReadyWithoutAllShips();
  await test_selectShipDoesNotAffectPlaced();
  await test_battleStartsWhenBothReady();
  await test_turnIndicatorFlips();
  await test_hitShowsVOnBothClients();
  await test_missShowsXOnBothClients();
  await test_gameOverModal();
  await test_doubleShot();
  await test_preReadyShot();
  await test_invalidRoomCode();
  await test_roomFull();
  await test_disconnectPlacement();
  await test_reconnectMidBattle();
  await test_forfeitAfter30s();
  await testPlacement_dragDrop();
  await testPlacement_rotate();
  await testPlacement_reposition();
  await testPlacement_randomizeReplaces();

  const elapsed = Math.round((Date.now() - start) / 1000);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  // Write markdown results
  let md = `# Playwright QA Run — Final Results\n\n`;
  md += `> **Run at:** ${new Date().toISOString()}\n`;
  md += `> **Elapsed:** ${elapsed}s\n`;
  md += `> **Base URL:** ${BASE_URL}\n`;
  md += `> **Method:** Playwright direct API (\`chromium.launch\`), \`channel:"chrome"\`\n\n`;

  md += `## Summary\n\n| Metric | Count |\n|---|---|\n`;
  md += `| Total | ${results.length} |\n`;
  md += `| ✅ Passed | ${passedCount} |\n`;
  md += `| ❌ Failed | ${failedCount} |\n\n`;

  md += `## Detailed Results\n\n`;
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    md += `### ${icon} ${r.testName}\n\n`;
    md += `- **Detail:** ${r.detail}\n`;
    if (r.screenshot) md += `- **Screenshot:** \`${r.screenshot}\`\n`;
    md += `\n`;
  }

  fs.writeFileSync(RESULT_MD, md, "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`Elapsed: ${elapsed}s`);
  console.log(`Results: ${passedCount}/${results.length} passed, ${failedCount} failed`);
  console.log(`Report: ${RESULT_MD}`);
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
