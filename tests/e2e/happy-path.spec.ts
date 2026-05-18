/**
 * happy-path.spec.ts — Scenario 13.1: Complete Game from Lobby to Win → Play Again
 *
 * Simulates two players via separate BrowserContexts.
 * Covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13
 */

import { test, expect } from "@playwright/test";

test.describe("Full Game Golden Path (Scenario 13.1)", () => {
  test("complete game from lobby to win, then play again", async ({ browser }) => {
    // ---- Player 1 context (host) ----
    const p1Ctx = await browser.newContext();
    const p1Page = await p1Ctx.newPage();

    // ---- Player 2 context (guest) ----
    const p2Ctx = await browser.newContext();
    const p2Page = await p2Ctx.newPage();

    // ================================================================
    // PHASE 1: LOBBY — Create Room & Join
    // ================================================================

    // P1 opens app
    await p1Page.goto("/");
    await p1Page.waitForSelector("text=Create Room", { timeout: 10_000 });

    // P2 opens app
    await p2Page.goto("/");
    await p2Page.waitForSelector("text=Create Room", { timeout: 10_000 });

    // P1 clicks "Create Room"
    await p1Page.click("button:has-text('Create Room')");

    // Wait for room code to appear (6-char alphanumeric displayed in the UI)
    await p1Page.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCodeText = await p1Page.textContent(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400");
    const roomCode = roomCodeText?.trim() ?? "";
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // P2 enters room code and joins
    await p2Page.fill('input[placeholder="Room Code"]', roomCode);
    await p2Page.click("button:has-text('Join Room')");

    // Both should transition to Placement phase
    await p1Page.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2Page.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // ================================================================
    // PHASE 2: PLACEMENT — Place all 5 ships
    // ================================================================

    // P1 places ships via drag-and-drop (Scenarios 3.1-3.3)
    // Place Carrier (5 cells) horizontally at a1-a5
    const p1Board = p1Page.locator(".board-label:text('Your Board')").locator("..");
    await p1Page.locator(".ship-palette-item:has-text('Carrier')").dragTo(
      p1Page.locator('[title="a1"]')
    );

    // Place Battleship (4 cells) horizontally at b1-b4
    await p1Page.locator(".ship-palette-item:has-text('Battleship')").dragTo(
      p1Page.locator('[title="b1"]')
    );

    // Rotate and place Cruiser (3 cells) vertically at c1-c3
    await p1Page.keyboard.press("r"); // toggle to vertical
    await p1Page.locator(".ship-palette-item:has-text('Cruiser')").dragTo(
      p1Page.locator('[title="c1"]')
    );

    // Rotate back and place Submarine (3 cells) horizontally at d1-d3
    await p1Page.keyboard.press("r"); // toggle back to horizontal
    await p1Page.locator(".ship-palette-item:has-text('Submarine')").dragTo(
      p1Page.locator('[title="d1"]')
    );

    // Place Destroyer (2 cells) horizontally at e1-e2
    await p1Page.locator(".ship-palette-item:has-text('Destroyer')").dragTo(
      p1Page.locator('[title="e1"]')
    );

    // Verify P1 sees "✅ Ready!" button (all 5 placed)
    await expect(p1Page.locator("button:has-text('✅ Ready!')")).toBeVisible({ timeout: 5_000 });

    // P2 uses Randomize button (Scenario 4.1)
    await p2Page.click("button:has-text('🎲 Randomize')");

    // Wait for ships to appear on P2's board
    await p2Page.waitForTimeout(500);

    // Verify P2 sees Ready button
    await expect(p2Page.locator("button:has-text('✅ Ready!')")).toBeVisible({ timeout: 5_000 });

    // ================================================================
    // PHASE 3: READY — Both players click Ready
    // ================================================================

    // P1 clicks Ready first
    await p1Page.click("button:has-text('✅ Ready!')");

    // P2 should see "Opponent is ready" notification
    await expect(p2Page.locator("text=Opponent is ready")).toBeVisible({ timeout: 5_000 });

    // P2 clicks Ready
    await p2Page.click("button:has-text('✅ Ready!')");

    // Both should transition to Battle phase
    await p1Page.waitForSelector("text=Battle!", { timeout: 10_000 });
    await p2Page.waitForSelector("text=Battle!", { timeout: 10_000 });

    // ================================================================
    // PHASE 4: BATTLE — Alternating turns, shoot all cells
    // ================================================================

    // Helper: get the tracking board (Enemy Waters) cells
    const p1Tracking = (title: string) =>
      p1Page.locator(".board-label:text('Enemy Waters')").locator("..").locator(`[title="${title}"]`);
    const p2Tracking = (title: string) =>
      p2Page.locator(".board-label:text('Enemy Waters')").locator("..").locator(`[title="${title}"]`);

    // Helper: check if game is over on a page
    async function isGameOver(page: any): Promise<boolean> {
      return page.locator("text=Victory!, text=Defeat").count() > 0;
    }

    // Generate all 100 coordinate titles
    const allCells: string[] = [];
    const cols = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    for (let row = 1; row <= 10; row++) {
      for (const col of cols) {
        allCells.push(`${col}${row}`);
      }
    }

    let cellIndex = 0;
    let gameEnded = false;

    // Alternate shooting until game over
    while (cellIndex < allCells.length && !gameEnded) {
      // P1's turn
      if (await p1Page.locator("text=🎯 Your Turn").isVisible({ timeout: 2_000 }).catch(() => false)) {
        const cell = allCells[cellIndex];
        const targetCell = p1Tracking(cell);

        // Only shoot if cell hasn't been shot yet
        const cellClasses = await targetCell.getAttribute("class");
        if (cellClasses && !cellClasses.includes("hit") && !cellClasses.includes("miss") && !cellClasses.includes("sunk")) {
          await targetCell.click();
          await p1Page.waitForTimeout(300);
        }
      }

      // Check for game over
      if (await p1Page.locator(".game-over-overlay").isVisible({ timeout: 1_000 }).catch(() => false)) {
        gameEnded = true;
        break;
      }
      if (await p2Page.locator(".game-over-overlay").isVisible({ timeout: 1_000 }).catch(() => false)) {
        gameEnded = true;
        break;
      }

      // P2's turn
      if (await p2Page.locator("text=🎯 Your Turn").isVisible({ timeout: 2_000 }).catch(() => false)) {
        const cell = allCells[cellIndex];
        const targetCell = p2Tracking(cell);

        const cellClasses = await targetCell.getAttribute("class");
        if (cellClasses && !cellClasses.includes("hit") && !cellClasses.includes("miss") && !cellClasses.includes("sunk")) {
          await targetCell.click();
          await p2Page.waitForTimeout(300);
        }
      }

      // Check for game over
      if (await p1Page.locator(".game-over-overlay").isVisible({ timeout: 1_000 }).catch(() => false)) {
        gameEnded = true;
        break;
      }
      if (await p2Page.locator(".game-over-overlay").isVisible({ timeout: 1_000 }).catch(() => false)) {
        gameEnded = true;
        break;
      }

      cellIndex++;
      if (cellIndex >= allCells.length) {
        // If we scanned all cells and no game over, something is wrong
        // but we should have found all ships before scanning all 100 cells
        // (17 ship cells out of 100, and we shoot 2 per round = 50 rounds max)
        break;
      }
    }

    // ================================================================
    // PHASE 5: GAME OVER — Modal appears, winner announced
    // ================================================================

    // Verify game over modal is visible on both pages
    await expect(p1Page.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });
    await expect(p2Page.locator(".game-over-overlay")).toBeVisible({ timeout: 10_000 });

    // Verify one sees Victory and the other Defeat
    const p1Victory = await p1Page.locator("text=Victory!").isVisible();
    const p2Victory = await p2Page.locator("text=Victory!").isVisible();
    const p1Defeat = await p1Page.locator("text=Defeat").isVisible();
    const p2Defeat = await p2Page.locator("text=Defeat").isVisible();

    // Exactly one player should see Victory and one Defeat
    expect(p1Victory !== p2Victory).toBeTruthy();
    expect(p1Defeat !== p2Defeat).toBeTruthy();

    // "Play Again" button should be visible on both
    await expect(p1Page.locator("button:has-text('Play Again')")).toBeVisible();
    await expect(p2Page.locator("button:has-text('Play Again')")).toBeVisible();

    // ================================================================
    // PHASE 6: PLAY AGAIN — Both click Play Again
    // ================================================================

    // P1 clicks Play Again
    await p1Page.click("button:has-text('Play Again')");
    // P1 should see waiting state
    await expect(p1Page.locator("text=Waiting for opponent")).toBeVisible({ timeout: 5_000 });

    // P2 clicks Play Again
    await p2Page.click("button:has-text('Play Again')");

    // Both should transition back to Placement phase
    await p1Page.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2Page.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Verify boards are empty (no ready button visible yet)
    await expect(p1Page.locator("button:has-text('Place all ships (0/5)')")).toBeVisible({ timeout: 5_000 });
    await expect(p2Page.locator("button:has-text('Place all ships (0/5)')")).toBeVisible({ timeout: 5_000 });

    // Cleanup
    await p1Ctx.close();
    await p2Ctx.close();
  });
});
