# Antigravity Visual Tests — Manual Checklist

> Manual visual QA pass. Run after a full build on `dev`.
> Check each item visually in a browser. Mark **✓ Pass** or **✗ Fail** with notes.
> Reference: [`docs/game_spec.md`](game_spec.md) §2, §6.

---

## 1. Lobby UI

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1.1 | "Create Room" button visible | Large, clickable CTA on the landing page | ☐ |
| 1.2 | "Create Room" button styling | Uses Tailwind classes from [`Button.tsx`](../client/src/components/ui/Button.tsx); no inline `style={}` | ☐ |
| 1.3 | Room code display after creation | 6-character alphanumeric code shown prominently (e.g., "ABC123") | ☐ |
| 1.4 | Room code legibility | Monospace or clearly distinguishable font; characters not ambiguous (0 vs O, 1 vs l) | ☐ |
| 1.5 | "Join Room" input field visible | Text input + "Join" button below or beside it | ☐ |
| 1.6 | Join input placeholder | Placeholder text like "Enter room code" | ☐ |
| 1.7 | Join with empty input | "Join" button disabled or shows validation error when input is empty | ☐ |
| 1.8 | Error state — invalid room code | Red error toast/message appears; does not crash the UI | ☐ |
| 1.9 | Error state — room full | Toast with message "Room is full" appears | ☐ |
| 1.10 | Lobby layout spacing | No overlapping elements; adequate whitespace between create/join sections | ☐ |

---

## 2. Board Layout

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 2.1 | Column labels (own board) | Letters `a` through `j` displayed above the grid, left to right | ☐ |
| 2.2 | Row labels (own board) | Numbers `1` through `10` displayed left of the grid, top to bottom | ☐ |
| 2.3 | Column labels (tracking board) | Same `a`–`j` labels above tracking grid | ☐ |
| 2.4 | Row labels (tracking board) | Same `1`–`10` labels left of tracking grid | ☐ |
| 2.5 | Board positioning — own board left | Own board occupies the left panel/side of the battle view | ☐ |
| 2.6 | Board positioning — tracking right | Tracking board occupies the right panel/side of the battle view | ☐ |
| 2.7 | Grid cell sizing | All 100 cells per board are equal-sized squares | ☐ |
| 2.8 | Grid borders | Visible grid lines or subtle borders between cells | ☐ |
| 2.9 | Board labels during Placement | Column/row labels also visible during ship placement (BoardSetup view) | ☐ |
| 2.10 | Board labels responsive | Labels do not wrap or clip at desktop viewport widths (≥1024px) | ☐ |

---

## 3. Ship Palette

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 3.1 | 5 ships listed | Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2) | ☐ |
| 3.2 | Ship lengths visually correct | Carrier is 5 cells long, Destroyer is 2 cells long, etc. | ☐ |
| 3.3 | Ship names visible | Each ship block shows its name (e.g., "Carrier") | ☐ |
| 3.4 | Drag handle visible | Each ship has a grab/drag affordance (cursor: grab on hover) | ☐ |
| 3.5 | Rotation indicator | Pressing `R` while dragging toggles horizontal ↔ vertical preview | ☐ |
| 3.6 | Rotation visual feedback | Ship preview flips orientation immediately on `R` press | ☐ |
| 3.7 | Palette ship removed after placement | Once placed on board, ship disappears from palette (or is grayed out) | ☐ |
| 3.8 | "Randomize" button visible | Button present in the Placement view; distinct from "Ready" | ☐ |
| 3.9 | "Ready" button visible | Button present; disabled or shows warning if not all 5 ships placed | ☐ |
| 3.10 | Ship colors distinct | Each ship type uses a different color token from [`index.css`](../client/src/styles/index.css) | ☐ |

---

## 4. Cell States — Own Board

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 4.1 | Empty cell (own board) | Default background; ship visible if occupied, otherwise empty | ☐ |
| 4.2 | Ship cell (own board) | Colored block filling the cell with ship-type color | ☐ |
| 4.3 | Hit on own ship (opponent shot here) | Red background + `V` symbol; pulse animation from [`index.css`](../client/src/styles/index.css) (`pulse-hit`) | ☐ |
| 4.4 | Miss on own board (opponent missed) | Gray `x` symbol on cell | ☐ |
| 4.5 | Sunk ship on own board | All cells of sunk ship: dark red background, distinct border, crossed-out `V`, sunk-reveal animation | ☐ |

---

## 5. Cell States — Tracking Board

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 5.1 | Empty cell (tracking) | Neutral/empty background; clickable cursor during own turn | ☐ |
| 5.2 | Hit cell (tracking) | Red background + `V` symbol; pulse animation | ☐ |
| 5.3 | Miss cell (tracking) | Gray `x` symbol | ☐ |
| 5.4 | Sunk ship (tracking) | All cells of sunk ship highlighted: dark red, distinct border, crossed-out `V`, sunk-reveal animation | ☐ |
| 5.5 | Untouched cell cursor — own turn | `cursor-pointer` (hand) on tracking board during own turn | ☐ |
| 5.6 | Untouched cell cursor — opponent's turn | `cursor-not-allowed` or default cursor on tracking board during opponent's turn | ☐ |
| 5.7 | Already-shot cell cursor | `cursor-not-allowed` on cells already showing hit/miss/sunk | ☐ |

---

## 6. Turn Indicator

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 6.1 | "Your turn" state | Banner/indicator with prominent color (e.g., green/blue); text "Your Turn" | ☐ |
| 6.2 | "Opponent's turn" state | Grayed-out indicator; text "Opponent's Turn" or "Waiting..." | ☐ |
| 6.3 | Transition on shot | Indicator flips immediately after `shotResult` arrives (no perceptible lag beyond network) | ☐ |
| 6.4 | Turn indicator during Placement | Shows "Place your ships" or similar; no turn indicator during placement | ☐ |
| 6.5 | Turn indicator at Game Over | Shows "Game Over" or is hidden; does not show "Your Turn" for either player | ☐ |
| 6.6 | Turn indicator component uses Tailwind only | No inline `style={}` in [`TurnIndicator.tsx`](../client/src/components/TurnIndicator.tsx) | ☐ |

---

## 7. Game Over Modal

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 7.1 | Modal appears on game over | Overlay/modal renders above boards; background dimmed | ☐ |
| 7.2 | Winner announcement text | "Player [Name] Wins!" or equivalent; correct player identified | ☐ |
| 7.3 | Win reason shown | "All ships sunk" or "Opponent forfeited" as appropriate | ☐ |
| 7.4 | "Play Again" button visible | Prominent button inside the modal | ☐ |
| 7.5 | "Play Again" button clickable | Triggers `playAgain` event; transitions to "Waiting for opponent..." state if only one player clicked | ☐ |
| 7.6 | Both boards visible in background | Final board state visible behind the semi-transparent modal overlay | ☐ |
| 7.7 | Modal dismissible? | Modal should NOT be dismissible by clicking outside (game is over; only path is Play Again) | ☐ |
| 7.8 | Modal uses Tailwind + [`Modal.tsx`](../client/src/components/ui/Modal.tsx) | No inline styles | ☐ |

---

## 8. Disconnect Timer Display

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 8.1 | Timer appears on opponent disconnect | Countdown timer (30 → 0 seconds) visible when opponent disconnects during battle | ☐ |
| 8.2 | Timer counts down correctly | Decrements by 1 each second; no skips or jumps | ☐ |
| 8.3 | Timer display format | Shows as "0:30", "0:29", ... "0:00" or similar readable format | ☐ |
| 8.4 | Timer clears on reconnect | If opponent reconnects within 30s, timer disappears and match resumes | ☐ |
| 8.5 | Timer expiry → forfeit | When timer hits 0:00, game over modal appears with winner by forfeit | ☐ |
| 8.6 | Timer color/urgency | Timer text changes color (e.g., yellow → orange → red) as it approaches 0 | ☐ |
| 8.7 | Timer not shown during Placement disconnect | No timer; immediate `lobbyNotice` + return to lobby | ☐ |

---

## 9. Cross-Cutting Visual Consistency

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 9.1 | No inline `style={}` anywhere | Inspect elements; all styling via Tailwind classes | ☐ |
| 9.2 | Color contrast (accessibility) | Text legible against backgrounds; hit/miss symbols distinguishable | ☐ |
| 9.3 | No layout shift on state change | Transitions between phases do not cause jarring reflows | ☐ |
| 9.4 | Error toasts auto-dismiss | Error/lobbyNotice toasts disappear after a few seconds (or have a dismiss button) | ☐ |
| 9.5 | Font consistency | Single font family throughout; no fallback mismatches | ☐ |
| 9.6 | No horizontal scroll at 1024px+ | All content fits within viewport without horizontal scrollbar | ☐ |

---

> **Instructions**: Check each box after visual inspection. File failures as bugs against the relevant builder (template-dev for visual regressions, client-dev for state/behavior issues).
> Last updated: 2026-05-16 by QA Planner AI on `feature/qa-plan`.
