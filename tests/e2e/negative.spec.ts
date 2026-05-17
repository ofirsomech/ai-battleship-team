/**
 * negative.spec.ts — Negative & edge-case tests for Battleship
 *
 * Covers:
 *   Double-shot rejection (AC-10)
 *   Pre-ready shot (AC-6)
 *   Overlapping placement (AC-5)
 *   Invalid room code (AC-2)
 *   Room full
 *   Disconnect mid-battle + reconnect within 30 s (AC-12)
 *   Disconnect during placement
 */

import { test, expect } from "@playwright/test";

// ================================================================
// Helpers
// ================================================================

/** Helper: get the own board cell locator for a given page. */
function ownCell(page: any, coord: string) {
  return page
    .locator(".board-label:text('Your Fleet')")
    .locator("..")
    .locator(`[title="${coord}"]`);
}

/** Helper: get the tracking board (Enemy Waters) cell locator. */
function trackingCell(page: any, coord: string) {
  return page
    .locator(".board-label:text('Enemy Waters')")
    .locator("..")
    .locator(`[title="${coord}"]`);
}

/**
 * Standard lobby → placement → battle setup with known ship positions.
 * P1 places all ships on row 1–2.
 * P2 randomizes.
 * Both ready → battle starts.
 */
async function setupToBattle(browser: any) {
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
    (await p1
      .locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400")
      .textContent())?.trim() ?? "";

  // Join room
  await p2.fill('input[placeholder="Room Code"]', roomCode);
  await p2.click("button:has-text('Join Room')");
  await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
  await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

  // P1 places ships manually at known positions
  // Carrier (5) horizontal a1-a5
  await p1
    .locator(".ship-palette-item:has-text('Carrier')")
    .dragTo(p1.locator('[title="a1"]'));
  // Battleship (4) horizontal b1-b4
  await p1
    .locator(".ship-palette-item:has-text('Battleship')")
    .dragTo(p1.locator('[title="b1"]'));
  // Cruiser (3) horizontal c1-c3
  await p1
    .locator(".ship-palette-item:has-text('Cruiser')")
    .dragTo(p1.locator('[title="c1"]'));
  // Submarine (3) horizontal d1-d3
  await p1
    .locator(".ship-palette-item:has-text('Submarine')")
    .dragTo(p1.locator('[title="d1"]'));
  // Destroyer (2) horizontal e1-e2
  await p1
    .locator(".ship-palette-item:has-text('Destroyer')")
    .dragTo(p1.locator('[title="e1"]'));

  // P2 randomizes
  await p2.click("button:has-text('🎲 Randomize')");
  await p2.waitForTimeout(500);

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
    // P1's ships: a1-a5, b1-b4, c1-c3, d1-d3, e1-e2
    p1Ships: {
      carrier: ["a1", "a2", "a3", "a4", "a5"],
      battleship: ["b1", "b2", "b3", "b4"],
      cruiser: ["c1", "c2", "c3"],
      submarine: ["d1", "d2", "d3"],
      destroyer: ["e1", "e2"],
    },
  };
}

// ================================================================
// 1. Double-Shot Rejection (AC-10)
// ================================================================

test.describe("Double-Shot Rejection (AC-10)", () => {
  test("server rejects shooting the same cell twice", async ({ browser }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // Host (P1) shoots first — P1 should see "Your Turn"
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({
      timeout: 5_000,
    });

    // P1 shoots at a6 (P2's random fleet — might be a ship or empty)
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // Turn passes to P2. P2 shoots to pass turn back.
    if (
      await p2.locator("text=🎯 Your Turn").isVisible({ timeout: 5_000 })
    ) {
      await trackingCell(p2, "a1").click(); // shoot P1's Carrier
      await p2.waitForTimeout(500);
    }

    // Turn should be back to P1
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({
      timeout: 10_000,
    });

    // P1 tries to shoot a6 again — should be rejected
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // Assert error message appears in the battle error div
    const errorDiv = p1.locator(
      ".bg-red-900.border.border-red-600.rounded-lg"
    );
    await expect(errorDiv).toBeVisible({ timeout: 5_000 });
    const errorText = await errorDiv.textContent();
    expect(errorText).toMatch(/already shot|Cell already|SHOT_FAILED/i);

    // Verify a6 on P1's tracking board still shows original result
    // (not changed by the double-shot attempt)
    const cell = trackingCell(p1, "a6");
    const cls = await cell.getAttribute("class");
    expect(cls).toMatch(/hit|miss/);

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

// ================================================================
// 2. Pre-Ready Shot (AC-6)
// ================================================================

test.describe("Pre-Ready Shot (AC-6)", () => {
  test("shooting is impossible before battle starts", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup: lobby → placement
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode =
      (await p1
        .locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400")
        .textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // P1 places ships and readies
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);
    await p1.click("button:has-text('✅ Ready!')");

    // P2 has NOT readied
    // P1 should still be in placement phase
    await expect(p1.locator("text=Place Your Fleet")).toBeVisible({
      timeout: 5_000,
    });

    // P2 should see opponent ready notification
    await expect(p2.locator("text=Opponent is ready")).toBeVisible({
      timeout: 5_000,
    });

    // P1 should NOT see battle elements (no tracking board, no "Battle!" heading)
    await expect(p1.locator("text=Battle!")).not.toBeVisible({ timeout: 3_000 });

    // "Enemy Waters" board should not exist during placement
    await expect(
      p1.locator(".board-label:text('Enemy Waters')")
    ).not.toBeVisible({ timeout: 3_000 });

    // P2 should not see battle either
    await expect(p2.locator("text=Battle!")).not.toBeVisible({ timeout: 3_000 });
    await expect(
      p2.locator(".board-label:text('Enemy Waters')")
    ).not.toBeVisible({ timeout: 3_000 });

    // Now P2 readies — battle should start
    await p2.click("button:has-text('✅ Ready!')");
    await p1.waitForSelector("text=Battle!", { timeout: 10_000 });
    await p2.waitForSelector("text=Battle!", { timeout: 10_000 });

    // Battle should have tracking boards visible now
    await expect(p1.locator(".board-label:text('Enemy Waters')")).toBeVisible();
    await expect(p2.locator(".board-label:text('Enemy Waters')")).toBeVisible();

    // Host (P1) should have first turn
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

// ================================================================
// 3. Overlapping Placement (AC-5)
// ================================================================

test.describe("Overlapping Placement (AC-5)", () => {
  test("UI prevents placing ships that overlap", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup: lobby → placement
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode =
      (await p1
        .locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400")
        .textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Place Carrier horizontally at a1-a5
    await p1
      .locator(".ship-palette-item:has-text('Carrier')")
      .dragTo(p1.locator('[title="a1"]'));
    await p1.waitForTimeout(300);

    // Verify Carrier is placed
    const cellA1 = p1
      .locator(".board-label:text('Your Board')")
      .locator("..")
      .locator('[title="a1"]');
    expect(await cellA1.getAttribute("class")).toContain("ship");

    // Attempt to place Battleship overlapping Carrier at a3-a6 (horizontal)
    await p1
      .locator(".ship-palette-item:has-text('Battleship')")
      .dragTo(p1.locator('[title="a3"]'));
    await p1.waitForTimeout(300);

    // Battleship should NOT be placed (cells a3-a5 overlap with Carrier)
    // Verify that a3 still shows ship (from Carrier), but no Battleship-specific cells
    const cellA3 = p1
      .locator(".board-label:text('Your Board')")
      .locator("..")
      .locator('[title="a3"]');
    expect(await cellA3.getAttribute("class")).toContain("ship");

    // a6 should NOT have ship class (Battleship wasn't placed)
    const cellA6 = p1
      .locator(".board-label:text('Your Board')")
      .locator("..")
      .locator('[title="a6"]');
    const a6Class = await cellA6.getAttribute("class");
    expect(a6Class).not.toContain("ship");

    // b1 should also NOT have ship (Battleship would start at a3 if horizontal,
    // not b1, but let's verify a clean cell anyway)
    const cellB1 = p1
      .locator(".board-label:text('Your Board')")
      .locator("..")
      .locator('[title="b1"]');
    const b1Class = await cellB1.getAttribute("class");
    expect(b1Class).not.toContain("ship");

    // Ready button should still show 1/5 (only Carrier placed)
    await expect(
      p1.locator("button:has-text('Place all ships (1/5)')")
    ).toBeVisible({ timeout: 3_000 });

    // Now place Battleship at a valid non-overlapping position (b1-b4)
    await p1
      .locator(".ship-palette-item:has-text('Battleship')")
      .dragTo(p1.locator('[title="b1"]'));
    await p1.waitForTimeout(300);

    // Verify Battleship cells show ship class
    for (const coord of ["b1", "b2", "b3", "b4"]) {
      const cell = p1
        .locator(".board-label:text('Your Board')")
        .locator("..")
        .locator(`[title="${coord}"]`);
      expect(await cell.getAttribute("class")).toContain("ship");
    }

    // Ready button should now show 2/5
    await expect(
      p1.locator("button:has-text('Place all ships (2/5)')")
    ).toBeVisible({ timeout: 3_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

// ================================================================
// 4. Invalid Room Code (AC-2)
// ================================================================

test.describe("Invalid Room Code (AC-2)", () => {
  test("entering non-existent room code shows error", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto("/");
    await page.waitForSelector("text=Create Room", { timeout: 10_000 });

    // Enter a non-existent room code
    await page.fill('input[placeholder="Room Code"]', "ZZZZZZ");
    await page.click("button:has-text('Join Room')");

    // Wait for error message
    await page.waitForSelector(
      ".bg-red-900.border.border-red-600.rounded-lg",
      { timeout: 10_000 }
    );

    // Verify error text mentions room not found
    const errorDiv = page.locator(
      ".bg-red-900.border.border-red-600.rounded-lg"
    );
    await expect(errorDiv).toBeVisible();
    const errorText = await errorDiv.textContent();
    expect(errorText).toMatch(/not found|ROOM_NOT_FOUND/i);

    // User should still be on lobby screen
    await expect(page.locator("text=Create Room")).toBeVisible();
    await expect(
      page.locator("button:has-text('Join Room')")
    ).toBeVisible();

    await ctx.close();
  });

  test("entering empty room code does not allow join", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto("/");
    await page.waitForSelector("text=Create Room", { timeout: 10_000 });

    // Join button should be disabled when input is empty
    const joinBtn = page.locator("button:has-text('Join Room')");
    await expect(joinBtn).toBeDisabled();

    // Type something then clear it
    await page.fill('input[placeholder="Room Code"]', "ABC");
    await page.fill('input[placeholder="Room Code"]', "");
    await expect(joinBtn).toBeDisabled();

    await ctx.close();
  });
});

// ================================================================
// 5. Room Full
// ================================================================

test.describe("Room Full", () => {
  test("third player cannot join a full room", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p3Ctx = await browser.newContext();

    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();
    const p3 = await p3Ctx.newPage();

    // P1 creates room
    await p1.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode =
      (await p1
        .locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400")
        .textContent())?.trim() ?? "";

    // P2 joins — room is now full
    await p2.goto("/");
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");

    // Both P1 and P2 should transition to placement
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // P3 tries to join the same room
    await p3.goto("/");
    await p3.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p3.fill('input[placeholder="Room Code"]', roomCode);
    await p3.click("button:has-text('Join Room')");

    // Wait for error message
    await p3.waitForSelector(
      ".bg-red-900.border.border-red-600.rounded-lg",
      { timeout: 10_000 }
    );

    // Verify error text mentions room is full
    const errorDiv = p3.locator(
      ".bg-red-900.border.border-red-600.rounded-lg"
    );
    await expect(errorDiv).toBeVisible();
    const errorText = await errorDiv.textContent();
    expect(errorText).toMatch(/full|ROOM_FULL/i);

    // P3 should still be in lobby (not placement)
    await expect(p3.locator("text=Create Room")).toBeVisible();
    await expect(p3.locator("text=Place Your Fleet")).not.toBeVisible({
      timeout: 3_000,
    });

    // P1 and P2 should remain in placement (unaffected)
    await expect(p1.locator("text=Place Your Fleet")).toBeVisible();
    await expect(p2.locator("text=Place Your Fleet")).toBeVisible();

    await p1Ctx.close();
    await p2Ctx.close();
    await p3Ctx.close();
  });
});

// ================================================================
// 6. Disconnect Mid-Battle (AC-12)
// ================================================================

test.describe("Disconnect Mid-Battle (AC-12)", () => {
  test("reconnect within 30 s grace window resumes the game", async ({
    browser,
  }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // Verify both are in battle
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({
      timeout: 5_000,
    });

    // P2 clicks the dev Disconnect button (bottom-right of page)
    // The dev buttons are hidden at low opacity — hover first to reveal
    const disconnectBtn = p2.locator("button:has-text('Disconnect')");
    await disconnectBtn.hover();
    await disconnectBtn.click();
    await p2.waitForTimeout(500);

    // P1 should see some indicator — the connection status bar at top may show
    // The playerDisconnected event sets a notice but it's not displayed in Game
    // We verify the game hasn't ended yet (no game over modal)
    await expect(p1.locator(".game-over-overlay")).not.toBeVisible({
      timeout: 3_000,
    });

    // P2 reconnects via dev Reconnect button
    const reconnectBtn = p2.locator("button:has-text('Reconnect')");
    await reconnectBtn.hover();
    await reconnectBtn.click();
    await p2.waitForTimeout(1000);

    // After reconnect, P1 should see "Opponent reconnected!" notice
    // Wait for game to stabilize
    await p1.waitForTimeout(500);

    // Verify game is still in battle (P1 can see battle elements)
    await expect(p1.locator("text=Battle!")).toBeVisible({ timeout: 5_000 });

    // P1 should be able to take their turn
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({
      timeout: 10_000,
    });

    // P1 shoots to verify game works
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // Verify the shot result is reflected on P1's tracking board
    const cell = trackingCell(p1, "a6");
    const cls = await cell.getAttribute("class");
    expect(cls).toMatch(/hit|miss/);

    await p1Ctx.close();
    await p2Ctx.close();
  });

  test("disconnect for >30 s results in forfeit victory", async ({
    browser,
  }) => {
    const { p1, p2, p1Ctx, p2Ctx } = await setupToBattle(browser);

    // P1 takes first shot
    await trackingCell(p1, "a6").click();
    await p1.waitForTimeout(500);

    // Close P2's context entirely (hard disconnect)
    await p2Ctx.close();

    // P1 should NOT see game over immediately (grace window)
    await expect(p1.locator(".game-over-overlay")).not.toBeVisible({
      timeout: 3_000,
    });

    // Wait for the 30 s grace window to expire + some buffer
    // The server starts a 30 s timer on disconnect
    await p1.waitForSelector(".game-over-overlay", { timeout: 45_000 });

    // Game over modal should be visible
    await expect(p1.locator(".game-over-overlay")).toBeVisible();

    // P1 is the remaining player → should see Victory!
    await expect(p1.locator("text=Victory!")).toBeVisible({ timeout: 5_000 });

    // Play Again button should be available
    await expect(
      p1.locator("button:has-text('Play Again')")
    ).toBeVisible();

    await p1Ctx.close();
  });
});

// ================================================================
// 7. Disconnect During Placement
// ================================================================

test.describe("Disconnect During Placement", () => {
  test("opponent disconnect during placement returns player to lobby", async ({
    browser,
  }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup: lobby → placement
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode =
      (await p1
        .locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400")
        .textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // P1 starts placing ships
    await p1
      .locator(".ship-palette-item:has-text('Carrier')")
      .dragTo(p1.locator('[title="a1"]'));
    await p1.waitForTimeout(300);

    // P2 disconnects by closing context
    await p2Ctx.close();

    // P1 should receive lobbyNotice and be returned to lobby
    // The notice appears in the yellow notice box
    await p1.waitForSelector(
      ".bg-yellow-900.border.border-yellow-600.rounded-lg",
      { timeout: 10_000 }
    );

    // Verify notice text
    const noticeDiv = p1.locator(
      ".bg-yellow-900.border.border-yellow-600.rounded-lg"
    );
    await expect(noticeDiv).toBeVisible();
    const noticeText = await noticeDiv.textContent();
    expect(noticeText).toMatch(/disconnected|returning to lobby/i);

    // P1 should be back in lobby phase
    await expect(p1.locator("text=Create Room")).toBeVisible({
      timeout: 5_000,
    });

    // Placement elements should NOT be visible
    await expect(p1.locator("text=Place Your Fleet")).not.toBeVisible({
      timeout: 3_000,
    });

    await p1Ctx.close();
  });
});
