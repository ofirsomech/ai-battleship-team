# Antigravity Visual Tests — Browser Subagent Instructions

**Context:** You are an AI browser subagent tasked with functionally and visually testing a React-based Battleship web application. Your goal is to navigate through the app's user flow, interact with the UI, and verify the frontend components against the checklist below.

**Environment:** 
- Request the starting URL from the main agent (usually `http://localhost:5173` or similar). 
- **Important:** Battleship is a multiplayer game. You will need to open a second browser tab/window to simulate a second player to test the battle phase and disconnect scenarios.

**Task Requirements:**
Execute the following steps sequentially. Use your DOM inspection tools to verify both structural elements and styling (e.g., verifying Tailwind classes and ensuring no inline styles). At the end of your run, return a comprehensive Markdown report indicating **✓ Pass** or **✗ Fail** for each phase, with detailed notes on any failures.

---

## Phase 1: Lobby UI & Room Creation
1. **Navigate** to the app's home page in Tab 1.
2. **Create Room Button:** Verify the "Create Room" button is visible as a large CTA. Inspect the element to ensure it uses Tailwind classes and does **not** use inline `style={}` attributes.
3. **Room Code:** Click "Create Room". Wait for the room code to appear. Verify it displays a 6-character alphanumeric code.
4. **Join Room Input:** Check for the "Join Room" text input and its placeholder ("Enter room code"). 
5. **Validation:** Try to click "Join" with an empty input. Verify the button is disabled or an error shows.
6. **Error State:** Type an invalid 6-character code and attempt to join. Verify a red error toast/message appears without crashing the UI. Ensure the layout spacing remains clean with no overlapping elements.

## Phase 2: Multiplayer Setup & Board Layout
1. **Second Player:** Open Tab 2 to the home page. Enter the valid room code from Tab 1 and click "Join".
2. **Board Layout:** In the placement view for both tabs, verify:
   - Column labels (`a-j`) above the grid and Row labels (`1-10`) to the left.
   - The grid contains 100 equal-sized square cells with visible borders.
3. **Ship Palette:** 
   - Verify 5 ships are listed with their names (Carrier, Battleship, Cruiser, Submarine, Destroyer) and appropriate block lengths (5, 4, 3, 3, 2).
   - Check that ships have a drag affordance (`cursor: grab` on hover).
4. **Placement Interaction:** 
   - Drag and drop ships onto the board. Verify ships disappear from or are grayed out in the palette.
   - Verify pressing `R` while dragging toggles horizontal/vertical preview.
   - Verify the "Ready" button is disabled until all 5 ships are placed.
5. **Randomize:** Use the "Randomize" button to place the remaining ships for both players. Click "Ready" in both tabs to transition to the Battle Phase.

## Phase 3: Battle Phase (Cell States & Turns)
1. **Board Positioning:** Verify that the "Own Board" is on the left and the "Tracking Board" is on the right.
2. **Turn Indicator:** Check that the Turn Indicator clearly shows "Your Turn" for one player and "Opponent's Turn" / "Waiting..." for the other. Inspect the indicator to ensure it relies entirely on Tailwind classes.
3. **Firing Shots:** In the active player's tab, click a cell on the Tracking Board to fire a shot.
4. **Cell States (Tracking Board):** 
   - Verify a miss displays a gray `x`.
   - Verify a hit displays a red background, a `V` symbol, and ideally a pulse animation.
5. **Cell States (Own Board):** Switch to the defending player's tab. Verify the corresponding cell on their Own Board reflects the hit/miss visually.
6. **Cursors:** Verify the Tracking Board uses `cursor-pointer` on untouched cells during a player's turn, and `cursor-not-allowed` on opponent turns or already-shot cells.

## Phase 4: Game Over & Disconnects
1. **Disconnect Timer:** Close or navigate away from Tab 2. In Tab 1, verify a countdown timer (30 → 0 seconds) appears indicating the opponent disconnected.
2. **Reconnect:** Re-open Tab 2 and rejoin the room quickly. Verify the timer clears in Tab 1 and the game resumes.
3. **Forfeit/Game Over Modal:** Trigger a forfeit (by letting the disconnect timer hit 0) or simulate a win. 
4. **Modal Checks:** Verify the Game Over Modal renders above the boards with a dimmed background. It should state who won and why. It must contain a "Play Again" button and should **not** be dismissible by clicking the background.

## Phase 5: Cross-Cutting Checks
*(Keep these in mind throughout the entire execution)*
- **No Inline Styles:** Periodically inspect elements to ensure `style={}` is completely absent.
- **Auto-dismiss Toasts:** Ensure any error toasts disappear after a few seconds.
- **Responsiveness:** Verify no horizontal scrollbars appear at desktop widths (≥1024px).

---
**Return Condition:**
When you have completed all reachable phases or encountered a blocking bug that prevents further testing, return your structured Markdown QA report outlining the passes and failures.
