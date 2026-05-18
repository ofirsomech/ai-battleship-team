# Antigravity Responsive Visual Tests

> Manual visual checklist for responsive UI verification across viewports.
> Use Chrome DevTools Device Toolbar to test each viewport.

---

## Viewport: 375px (Mobile)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 1 | Layout is single column | Create Room and Join Room stacked vertically | Pass |
| 2 | No horizontal scroll | Page fits within 375px width | Pass |
| 3 | Room code is readable | 6-char code displays clearly | Pass |
| 4 | Buttons are full width | Create Room and Join Room fill the column | Pass |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 5 | Board fills screen width | 10×10 grid visible without horizontal scroll | Pass |
| 6 | Ship palette stacks BELOW board | Board on top, palette below | Pass |
| 7 | Ship palette items have adequate touch targets | Each ship row ≥44px tall | Pass |
| 8 | Rotate button is full width | Rotate (R) button spans the palette width | Pass |
| 9 | Randomize button is full width | Randomize button spans the width | Pass |
| 10 | Ready button is full width | Ready button spans the width | Pass |
| 11 | Column labels a-j fit | All 10 columns visible, letters not cut off | Pass |
| 12 | Row labels 1-10 align | Row numbers visible and aligned with cells | Pass |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 13 | Own board stacked ABOVE tracking board | "Your Fleet" board on top | Pass |
| 14 | Tracking board below own board | "Enemy Waters" board below | Pass |
| 15 | Turn indicator visible | Turn status clearly displayed | Pass |
| 16 | Cells are tappable | Touch targets ≥44×44px equivalent | Pass |
| 17 | Cell markers readable | V (hit), x (miss) visible at this size | Pass |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 18 | Modal fits within viewport | No content cut off at 375px | Pass |
| 19 | Victory/Defeat text readable | Title clearly visible | Pass |
| 20 | Play Again button tappable | Button ≥44px tall, full width | Pass |
| 21 | No horizontal scroll on modal | Content wraps within modal width | Pass |

---

## Viewport: 768px (Tablet)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 22 | Layout centered and balanced | Form centered with comfortable max-width | Pass |
| 23 | No horizontal scroll | Page fits within 768px | Pass |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 24 | Board and palette layout appropriate | Side-by-side or stacked with comfortable sizing | Pass |
| 25 | Cell size comfortable | Cells large enough for clear interaction | Pass |
| 26 | Ship palette items well-sized | Palette items proportional to board | Pass |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 27 | Both boards visible | Own and tracking boards fit on screen | Pass |
| 28 | Boards may be side-by-side or stacked | Either layout works; no overlap or cutoff | Pass |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 29 | Modal centered and proportional | Fits comfortably within 768px | Pass |

---

## Viewport: 1280px (Desktop)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 30 | Layout uses appropriate max-width | Not stretched edge-to-edge | Pass |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 31 | Board and palette side-by-side | Board left, palette right | Pass |
| 32 | Cell size comfortable for clicking | Cells clearly distinguishable | Pass |
| 33 | All ship types visible in palette | 5 ships displayed without scrolling | Pass |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 34 | Both boards side-by-side | Own board left, tracking board right | Pass |
| 35 | No wasted space | Boards use available width comfortably | Pass |
| 36 | Turn indicator clearly positioned | Easily visible between or above boards | Pass |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 37 | Modal centered | Appears in center of viewport | Pass |
| 38 | Modal not oversized | Proportional to desktop screen | Pass |

---

## Cross-Viewport Checks

| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 39 | No horizontal scrollbar at 375px | Body does not overflow horizontally | Pass |
| 40 | No horizontal scrollbar at 768px | Body does not overflow horizontally | Pass |
| 41 | No horizontal scrollbar at 1280px | Body does not overflow horizontally | Pass |
| 42 | All buttons show hover states (desktop) | Buttons change appearance on hover | Pass |
| 43 | Ship palette items show visual feedback | Placed ships visually distinct from unplaced | Pass |
