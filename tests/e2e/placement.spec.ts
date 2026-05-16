/**
 * placement.spec.ts — Ship placement: drag-and-drop, randomize, validation, ready
 *
 * Covers: Scenarios 3.1-3.3, 4.1-4.2, 5.1-5.4, 6.1-6.2
 * Covers: AC-3, AC-4, AC-5, AC-6
 */

import { test, expect } from "@playwright/test";

test.describe("Placement — Drag & Drop (Scenarios 3.1-3.3)", () => {
  test("place Carrier via drag-and-drop onto board", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup: create room and join
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCodeEl = await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400");
    const roomCode = (await roomCodeEl.textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");

    // Both should be in placement
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Drag Carrier from palette to a1 (horizontal, 5 cells: a1-a5)
    const carrierPalette = p1.locator(".ship-palette-item:has-text('Carrier')");
    const cellA1 = p1.locator('[title="a1"]');
    await carrierPalette.dragTo(cellA1);

    // Verify Carrier cells show ship class on P1's board
    // Cells a1-a5 should have the "ship" CSS class
    for (const coord of ["a1", "a2", "a3", "a4", "a5"]) {
      const cell = p1.locator(`.board-label:text('Your Board')`).locator("..").locator(`[title="${coord}"]`);
      const className = await cell.getAttribute("class");
      expect(className).toContain("ship");
    }

    // Verify cell a6 does NOT have ship class
    const cellA6 = p1.locator(`.board-label:text('Your Board')`).locator("..").locator('[title="a6"]');
    const a6Class = await cellA6.getAttribute("class");
    expect(a6Class).not.toContain("ship");

    // Place remaining ships for cleanup context
    await p1Ctx.close();
    await p2Ctx.close();
  });

  test("rotate ship orientation with R key during placement", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup: create room and join
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCodeEl = await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400");
    const roomCode = (await roomCodeEl.textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Press R to toggle orientation to vertical
    // The Rotate button shows current orientation: "Rotate (R) — →" (horizontal) or "Rotate (R) — ↓" (vertical)
    const rotateBtn = p1.locator("button:has-text('Rotate (R)')");
    const initialRotateText = await rotateBtn.textContent();
    expect(initialRotateText).toContain("→"); // default horizontal

    // Press R key to toggle
    await p1.keyboard.press("r");
    await p1.waitForTimeout(200);
    const afterRotateText = await rotateBtn.textContent();
    expect(afterRotateText).toContain("↓"); // now vertical

    // Place Carrier vertically at f1-f5
    await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="f1"]'));

    // Verify vertical placement: cells f1, f2, f3, f4, f5 should have ship class
    for (const coord of ["f1", "f2", "f3", "f4", "f5"]) {
      const cell = p1.locator(`.board-label:text('Your Board')`).locator("..").locator(`[title="${coord}"]`);
      const className = await cell.getAttribute("class");
      expect(className).toContain("ship");
    }

    // Cell g1 (horizontal neighbor) should NOT have ship
    const cellG1 = p1.locator(`.board-label:text('Your Board')`).locator("..").locator('[title="g1"]');
    const g1Class = await cellG1.getAttribute("class");
    expect(g1Class).not.toContain("ship");

    await p1Ctx.close();
    await p2Ctx.close();
  });

  test("reposition ship by dragging to new location", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Place Carrier horizontally at a1-a5
    await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="a1"]'));
    await p1.waitForTimeout(300);

    // Verify initial placement
    const cellA1 = p1.locator(`.board-label:text('Your Board')`).locator("..").locator('[title="a1"]');
    expect(await cellA1.getAttribute("class")).toContain("ship");

    // Now reposition Carrier to c3-c7 (horizontal)
    await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="c3"]'));
    await p1.waitForTimeout(300);

    // Old position a1 should be empty
    const cellA1After = p1.locator(`.board-label:text('Your Board')`).locator("..").locator('[title="a1"]');
    const a1AfterClass = await cellA1After.getAttribute("class");
    expect(a1AfterClass).not.toContain("ship");

    // New position c3-c7 should have ship
    for (const coord of ["c3", "c4", "c5", "c6", "c7"]) {
      const cell = p1.locator(`.board-label:text('Your Board')`).locator("..").locator(`[title="${coord}"]`);
      expect(await cell.getAttribute("class")).toContain("ship");
    }

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Placement — Randomize (Scenarios 4.1-4.2)", () => {
  test("randomize generates valid fleet of 5 ships", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Click Randomize
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);

    // Verify Ready button appears (all 5 ships placed)
    await expect(p1.locator("button:has-text('✅ Ready!')")).toBeVisible({ timeout: 5_000 });

    // Count ship cells on the board (should be exactly 17: 5+4+3+3+2)
    let shipCount = 0;
    const cols = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    for (let row = 1; row <= 10; row++) {
      for (const col of cols) {
        const cell = p1.locator(`.board-label:text('Your Board')`).locator("..").locator(`[title="${col}${row}"]`);
        const cls = (await cell.getAttribute("class")) ?? "";
        if (cls.includes("ship")) shipCount++;
      }
    }
    expect(shipCount).toBe(17);

    await p1Ctx.close();
    await p2Ctx.close();
  });

  test("randomize replaces existing manual placement", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Manually place 2 ships
    await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="a1"]'));
    await p1.locator(".ship-palette-item:has-text('Battleship')").dragTo(p1.locator('[title="b1"]'));
    await p1.waitForTimeout(300);

    // Verify old position has Carrier
    const cellA1Before = p1.locator(`.board-label:text('Your Board')`).locator("..").locator('[title="a1"]');
    expect(await cellA1Before.getAttribute("class")).toContain("ship");

    // Click Randomize
    await p1.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);

    // Verify old Carrier position is NOT necessarily ship anymore (may or may not be)
    // But Ready button should appear
    await expect(p1.locator("button:has-text('✅ Ready!')")).toBeVisible({ timeout: 5_000 });

    // Count ship cells: should still be 17
    let shipCount = 0;
    const cols = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    for (let row = 1; row <= 10; row++) {
      for (const col of cols) {
        const cell = p1.locator(`.board-label:text('Your Board')`).locator("..").locator(`[title="${col}${row}"]`);
        const cls = (await cell.getAttribute("class")) ?? "";
        if (cls.includes("ship")) shipCount++;
      }
    }
    expect(shipCount).toBe(17);

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Placement — Validation (Scenarios 5.1-5.4)", () => {
  test("cannot click ready without all 5 ships placed", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Place only 3 ships (not enough)
    await p1.locator(".ship-palette-item:has-text('Carrier')").dragTo(p1.locator('[title="a1"]'));
    await p1.locator(".ship-palette-item:has-text('Battleship')").dragTo(p1.locator('[title="b1"]'));
    await p1.locator(".ship-palette-item:has-text('Cruiser')").dragTo(p1.locator('[title="c1"]'));
    await p1.waitForTimeout(300);

    // Verify the button shows incomplete count and is disabled
    const readyBtn = p1.locator("button:has-text('Place all ships (3/5)')");
    await expect(readyBtn).toBeVisible({ timeout: 3_000 });
    await expect(readyBtn).toBeDisabled();

    // Place remaining 2 ships
    await p1.locator(".ship-palette-item:has-text('Submarine')").dragTo(p1.locator('[title="d1"]'));
    await p1.locator(".ship-palette-item:has-text('Destroyer')").dragTo(p1.locator('[title="e1"]'));
    await p1.waitForTimeout(300);

    // Now Ready button should be enabled
    await expect(p1.locator("button:has-text('✅ Ready!')")).toBeVisible({ timeout: 3_000 });
    await expect(p1.locator("button:has-text('✅ Ready!')")).toBeEnabled();

    await p1Ctx.close();
    await p2Ctx.close();
  });
});

test.describe("Battle Start — Both Ready (Scenarios 6.1-6.2)", () => {
  test("battle starts when both players click ready", async ({ browser }) => {
    const p1Ctx = await browser.newContext();
    const p2Ctx = await browser.newContext();
    const p1 = await p1Ctx.newPage();
    const p2 = await p2Ctx.newPage();

    // Setup
    await p1.goto("/");
    await p2.goto("/");
    await p1.waitForSelector("text=Create Room", { timeout: 10_000 });
    await p2.waitForSelector("text=Create Room", { timeout: 10_000 });

    await p1.click("button:has-text('Create Room')");
    await p1.waitForSelector("text=Room Code", { timeout: 10_000 });
    const roomCode = (await p1.locator(".text-4xl.font-bold.tracking-\\[0\\.5em\\].text-blue-400").textContent())?.trim() ?? "";

    await p2.fill('input[placeholder="Room Code"]', roomCode);
    await p2.click("button:has-text('Join Room')");
    await p1.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });
    await p2.waitForSelector("text=Place Your Fleet", { timeout: 10_000 });

    // Both randomize
    await p1.click("button:has-text('🎲 Randomize')");
    await p2.click("button:has-text('🎲 Randomize')");
    await p1.waitForTimeout(500);
    await p2.waitForTimeout(500);

    // P1 clicks Ready
    await p1.click("button:has-text('✅ Ready!')");

    // P2 should see opponent ready notification
    await expect(p2.locator("text=Opponent is ready")).toBeVisible({ timeout: 5_000 });

    // P1 should see the opponent ready indicator (the component renders a green notification)
    // P1's opponentReady state may show as a notice from store
    // Wait for P2 to click ready
    await p2.click("button:has-text('✅ Ready!')");

    // Both should transition to battle
    await p1.waitForSelector("text=Battle!", { timeout: 10_000 });
    await p2.waitForSelector("text=Battle!", { timeout: 10_000 });

    // Host (P1) should have the first turn
    await expect(p1.locator("text=🎯 Your Turn")).toBeVisible({ timeout: 5_000 });

    // P2 should see opponent's turn
    await expect(p2.locator("text=⏳")).toBeVisible({ timeout: 5_000 });

    await p1Ctx.close();
    await p2Ctx.close();
  });
});
