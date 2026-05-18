/**
 * turn-flow.spec.ts — Battle phase: alternating turns, hit/miss/sunk indicators,
 * game over, and play again.
 *
 * Covers: Scenarios 7.1-7.2, 8.1-8.3, 10.1-10.2, 12.1-12.2
 * Covers: AC-7, AC-8, AC-9, AC-10, AC-11, AC-13
 */

import { test, expect } from "@playwright/test";

/**
 * Helper: create a room, have both players join, and transition to battle.
 * P1 places ships manually at known positions.
 * P2 places ships manually at known positions.
 * Returns { p1, p2, p1Ctx, p2Ctx, p1Ships, p2Ships }.
 */
async function setupBattleWithKnownPositions(browser: any) {
  const p1Ctx = await browser.newContext();
  const p2Ctx = await browser.newContext();
  const p1 = await p1Ctx.newPage();
  const p2 = await p2Ctx.newPage();

  // Open app
  await p1.goto("/");
  await p2.goto("/");
  await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
  await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

  // Create room
  await p1.click("button:has-text('Create Room')");
  await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
  const roomCode =
    (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

  // Join room
  await p2.fill('input[placeholder="Room Code"]', roomCode);
  await p2.click("button:has-text('Join Room')");
  await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
  await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

  /**
   * P1 ships (known positions):
   *   Carrier    (5) horizontal a1-a5
   *   Battleship (4) horizontal b1-b4
   *   Cruiser    (3) horizontal c1-c3
   *   Submarine  (3) horizontal d1-d3
   *   Destroyer  (2) horizontal e1-e2
   *
   * P2 ships (known positions):
   *   Carrier    (5) horizontal a6-a10
   *   Battleship (4) horizontal b6-b9
   *   Cruiser    (3) horizontal c6-c8
   *   Submarine  (3) horizontal d6-d8
   *   Destroyer  (2) horizontal e6-e7
   */

  const p1Board = () => p1.locator(".board-label:text('Your Board')").locator("..");
  const p2Board = () => p2.locator(".board-label:text('Your Board')").locator("..");

  // P1 places ships
  await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="a1"]'));
  await p1.locator(".ship-palette-item:has-text('Battleship')").dragTo(p1.locator('[title="b1"]'));
  await p1.locator(".ship-palette-item:has-text('Cruiser')").dragTo(p1.locator('[title="c1"]'));
  await p1.locator(".ship-palette-item:has-text('Submarine')").dragTo(p1.locator('[title="d1"]'));
  await p1.locator(".ship-palette-item:has-text('Destroyer')").dragTo(p1.locator('[title="e1"]'));

  // P2 places ships
  await p2.locator(".ship-palette-item:has-text('Carrier')").dragTo(p2.locator('[title="a6"]'));
  await p2.locator(".ship-palette-item:has-text('Battleship')").dragTo(p2.locator('[title="b6"]'));
  await p2.locator(".ship-palette-item:has-text('Cruiser')").dragTo(p2.locator('[title="c6"]'));
  await p2.locator(".ship-palette-item:has-text('Submarine')").dragTo(p2.locator('[title="d6"]'));
  await p2.locator(".ship-palette-item:has-text('Destroyer')").dragTo(p2.locator('[title="e6"]'));

  // Both ready
  await p1.click("button:has-text('✅ Ready!')");
  await p2.click("button:has-text('✅ Ready!')");

  // Wait for battle
  await p1.waitForSelector("text=Battle!", { timeout: 10_000 });
  await p2.waitForSelector("text=Battle!", { timeout: 10_000 });

  return {
    p1,
    p2,
    p1Ctx,
    p2Ctx,
    roomCode,
    // P1's ships are at a1-a5, b1-b4, c1-c3, d1-d3, e1-e2
    p1Ships: {
      carrier: ["a1", "a2", "a3", "a4", "a5"],
      battleship: ["b1", "b2", "b3", "b4"],
      cruiser: ["c1", "c2", "c3"],
      submarine: ["d1", "d2", "d3"],
      destroyer: ["e1", "e2"],
    },
    // P2's ships are at a6-a10, b6-b9, c6-c8, d6-d8, e6-e7
    p2Ships: {
      carrier: ["a6", "a7", "a8", "a9", "a10"],
      battleship: ["b6", "b7", "b8", "b9"],
      cruiser: ["c6", "c7", "c8"],
      submarine: ["d6", "d7", "d8"],
      destroyer: ["e6", "e7"],
    },
  };
}

/**
 * Get the tracking board cell locator for a given page.
 */
function trackingCell(page: any, coord: string) {
  return page.locator(".board-label:text('Enemy Waters')").locator("..").locator(`[title="${coord}"]`);
}

/**
 * Get the own board cell locator for a given page.
 */
function ownCell(page: any, coord: string) {
  return page.locator(".board-label:text('Your Fleet')").locator("..").locator(`[title="${coord}"]`);
}

test.describe("Turn Flow — Alternating Turns (Scenarios 7.1-7.2)", () => {
  test("turn indicator shows active player and flips after shot", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupBattleWithKnownPositions(browser);

    // Host (P1) shoots first — P1 should see "Your Turn"
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });
    await expect(p2.locator("text=⏳")).toBeVisible({ timeout: 5_000 });

    // P1 shoots at a6 (P2's Carrier, hit)
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // After shot, turn should pass to P2
    await expect(p2.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });
    await expect(p1.locator("text=⏳")).toBeVisible({ timeout: 5_000 });

    // P2 shoots at a1 (P1's Carrier, hit)
    await trackingCell(p2, "a1").click();
    await p2.waitForTimeout(500);

    // After shot, turn should pass back to P1
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Shooting Mechanics — Hit Indicator (Scenario 8.1)", () => {
  test("hit registers on both clients with V marker", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupBattleWithKnownPositions(browser);

    // P1 shoots at a6 (P2's Carrier — hit)
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // P1's tracking board should show hit at a6
    const p1TrackCell = trackingCell(p1, "a6");
    await expect(p1TrackCell).toHaveClass(/hit/);
    await expect(p1TrackCell).toHaveText("V");

    // P2's own board should show hit at a6
    const p2OwnCell = ownCell(p2, "a6");
    await expect(p2OwnCell).toHaveClass(/hit/);
    await expect(p2OwnCell).toHaveText("V");

    // Turn should have passed to P2 (verify P2 gets to shoot and turn passes back)
    await trackingCell(p2, "a1").click(); // P2 shoots at P1's Carrier
    await p2.waitForTimeout(500);

    // Now turn is back to P1
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Shooting Mechanics — Miss Indicator (Scenario 8.2)", () => {
  test("miss registers on both clients with x marker", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupBattleWithKnownPositions(browser);

    // P1 shoots at j10 (should be empty — no ships placed in bottom-right corner)
    await trackingCell(p1, "j10").click();
    await p1.waitForTimeout(500);

    // P1's tracking board should show miss at j10
    const p1TrackCell = trackingCell(p1, "j10");
    await expect(p1TrackCell).toHaveClass(/miss/);
    await expect(p1TrackCell).toHaveText("x");

    // P2's own board should show miss at j10
    const p2OwnCell = ownCell(p2, "j10");
    await expect(p2OwnCell).toHaveClass(/miss/);
    await expect(p2OwnCell).toHaveText("x");

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Shooting Mechanics — Sunk Ship (Scenario 8.3)", () => {
  test("sinking a ship shows sunk highlight on both clients", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx, p2Ships } = await setupBattleWithKnownPositions(browser);

    // P2's Destroyer is at e6-e7 (2 cells)
    // Hit the first cell (e6)
    await trackingCell(p1, "e6").click();
    await p1.waitForTimeout(500);

    // Turn passes to P2
    await expect(p2.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    // P2 shoots (any cell to pass turn back)
    await trackingCell(p2, "a1").click();
    await p2.waitForTimeout(500);

    // Turn passes back to P1
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    // P1 shoots e7 (final cell of Destroyer — should sink it)
    await trackingCell(p1, "e7").click();
    await p1.waitForTimeout(800);

    // Both e6 and e7 on P1's tracking board should show sunk
    for (const coord of p2Ships.destroyer) {
      const cell = trackingCell(p1, coord);
      await expect(cell).toHaveClass(/sunk/);
    }

    // Both e6 and e7 on P2's own board should show sunk
    for (const coord of p2Ships.destroyer) {
      const cell = ownCell(p2, coord);
      await expect(cell).toHaveClass(/sunk/);
    }

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Game Over — Win Condition (Scenarios 10.1-10.2)", () => {
  test("game over modal appears when all opponent ships are sunk", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx, p2Ships } = await setupBattleWithKnownPositions(browser);

    // Collect all P2 ship cells (17 total)
    const allP2Cells = [
      ...p2Ships.carrier,
      ...p2Ships.battleship,
      ...p2Ships.cruiser,
      ...p2Ships.submarine,
      ...p2Ships.destroyer,
    ];

    expect(allP2Cells.length).toBe(17);

    // Alternate turns: P1 shoots all of P2's cells, P2 shoots random empty cells
    let p2ShotCells = 0;
    const p2EmptyTargets = ["f6", "f7", "f8", "f9", "f10", "g6", "g7", "g8", "g9", "g10",
      "h6", "h7", "h8", "h9", "h10", "i6", "i7", "i8", "i9", "i10", "j6", "j7", "j8", "j9", "j10"];

    for (let i = 0; i < allP2Cells.length; i++) {
      // P1 shoots at P2's ship cell
      const target = allP2Cells[i];
      await trackingCell(p1, target).click();
      await p1.waitForTimeout(400);

      // Check if game is over (last shot sunk the final ship)
      const gameOverVisible = await p1.locator(".game-over-overlay").isVisible({ timeout: 2_000 }).catch(() => false);
      if (gameOverVisible) break;

      // P2 shoots at an empty cell to pass turn back
      if (p2ShotCells < p2EmptyTargets.length) {
        await trackingCell(p2, p2EmptyTargets[p2ShotCells]).click();
        p2ShotCells++;
        await p2.waitForTimeout(400);

        const goVisible2 = await p1.locator(".game-over-overlay").isVisible({ timeout: 2_000 }).catch(() => false);
        if (goVisible2) break;
      }
    }

    // Game Over modal should be visible on both
    await expect(p1.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });
    await expect(p2.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });

    // P1 should see Victory (they sank all of P2's ships)
    await expect(p1.locator("text=Victory!")).toBeVisible({ timeout: 5_000 });

    // P2 should see Defeat
    await expect(p2.locator("text=Defeat")).toBeVisible({ timeout: 5_000 });

    // Both boards should be visible (not hidden)
    await expect(p1.locator(".board-label:text('Your Fleet')")).toBeVisible();
    await expect(p1.locator(".board-label:text('Enemy Waters')")).toBeVisible();

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Play Again — Rematch (Scenarios 12.1-12.2)", () => {
  test("both players click Play Again and return to placement", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx, p2Ships } = await setupBattleWithKnownPositions(browser);

    // Quick game: P1 sinks all P2 ships (same as game over test)
    const allP2Cells = [
      ...p2Ships.carrier,
      ...p2Ships.battleship,
      ...p2Ships.cruiser,
      ...p2Ships.submarine,
      ...p2Ships.destroyer,
    ];

    const p2EmptyTargets = ["f6", "f7", "f8", "f9", "f10", "g6", "g7", "g8", "g9", "g10",
      "h6", "h7", "h8", "h9", "h10", "i6", "i7", "i8", "i9", "i10", "j6", "j7", "j8", "j9", "j10"];
    let p2ShotIdx = 0;

    for (let i = 0; i < allP2Cells.length; i++) {
      await trackingCell(p1, allP2Cells[i]).click();
      await p1.waitForTimeout(400);
      const goVisible = await p1.locator(".game-over-overlay").isVisible({ timeout: 2_000 }).catch(() => false);
      if (goVisible) break;

      if (p2ShotIdx < p2EmptyTargets.length) {
        await trackingCell(p2, p2EmptyTargets[p2ShotIdx]).click();
        p2ShotIdx++;
        await p2.waitForTimeout(400);
        const goVisible2 = await p1.locator(".game-over-overlay").isVisible({ timeout: 2_000 }).catch(() => false);
        if (goVisible2) break;
      }
    }

    // Both see Game Over modal
    await expect(p1.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });
    await expect(p2.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });

    // P1 clicks Play Again first
    await p1.click("button:has-text('Play Again')");

    // P1 should see waiting state
    await expect(p1.locator("text=Waiting for opponent")).toBeVisible({ timeout: 5_000 });

    // P2 still sees Play Again button
    await expect(p2.locator("button:has-text('Play Again')")).toBeVisible();

    // P2 clicks Play Again
    await p2.click("button:has-text('Play Again')");

    // Both should transition back to Placement phase
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Verify boards are clean (no ships)
    await expect(p1.locator("button:has-text('Place all ships (0/5)')")).toBeVisible({ timeout: 5_000 });
    await expect(p2.locator("button:has-text('Place all ships (0/5)')")).toBeVisible({ timeout: 5_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});
