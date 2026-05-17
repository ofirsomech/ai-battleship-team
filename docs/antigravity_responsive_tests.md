# Antigravity Responsive Visual Tests

> Manual visual checklist for responsive UI verification across viewports.
> Use Chrome DevTools Device Toolbar to test each viewport.

---

## Viewport: 375px (Mobile)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 1 | Layout is single column | Create Room and Join Room stacked vertically | |
| 2 | No horizontal scroll | Page fits within 375px width | |
| 3 | Room code is readable | 6-char code displays clearly | |
| 4 | Buttons are full width | Create Room and Join Room fill the column | |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 5 | Board fills screen width | 10×10 grid visible without horizontal scroll | |
| 6 | Ship palette stacks BELOW board | Board on top, palette below | |
| 7 | Ship palette items have adequate touch targets | Each ship row ≥44px tall | |
| 8 | Rotate button is full width | Rotate (R) button spans the palette width | |
| 9 | Randomize button is full width | Randomize button spans the width | |
| 10 | Ready button is full width | Ready button spans the width | |
| 11 | Column labels a-j fit | All 10 columns visible, letters not cut off | |
| 12 | Row labels 1-10 align | Row numbers visible and aligned with cells | |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 13 | Own board stacked ABOVE tracking board | "Your Fleet" board on top | |
| 14 | Tracking board below own board | "Enemy Waters" board below | |
| 15 | Turn indicator visible | Turn status clearly displayed | |
| 16 | Cells are tappable | Touch targets ≥44×44px equivalent | |
| 17 | Cell markers readable | V (hit), x (miss) visible at this size | |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 18 | Modal fits within viewport | No content cut off at 375px | |
| 19 | Victory/Defeat text readable | Title clearly visible | |
| 20 | Play Again button tappable | Button ≥44px tall, full width | |
| 21 | No horizontal scroll on modal | Content wraps within modal width | |

---

## Viewport: 768px (Tablet)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 22 | Layout centered and balanced | Form centered with comfortable max-width | |
| 23 | No horizontal scroll | Page fits within 768px | |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 24 | Board and palette layout appropriate | Side-by-side or stacked with comfortable sizing | |
| 25 | Cell size comfortable | Cells large enough for clear interaction | |
| 26 | Ship palette items well-sized | Palette items proportional to board | |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 27 | Both boards visible | Own and tracking boards fit on screen | |
| 28 | Boards may be side-by-side or stacked | Either layout works; no overlap or cutoff | |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 29 | Modal centered and proportional | Fits comfortably within 768px | |

---

## Viewport: 1280px (Desktop)

### Lobby
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 30 | Layout uses appropriate max-width | Not stretched edge-to-edge | |

### Placement
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 31 | Board and palette side-by-side | Board left, palette right | |
| 32 | Cell size comfortable for clicking | Cells clearly distinguishable | |
| 33 | All ship types visible in palette | 5 ships displayed without scrolling | |

### Battle
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 34 | Both boards side-by-side | Own board left, tracking board right | |
| 35 | No wasted space | Boards use available width comfortably | |
| 36 | Turn indicator clearly positioned | Easily visible between or above boards | |

### Game Over Modal
| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 37 | Modal centered | Appears in center of viewport | |
| 38 | Modal not oversized | Proportional to desktop screen | |

---

## Cross-Viewport Checks

| # | Description | Expected Result | Result |
|---|-------------|-----------------|--------|
| 39 | No horizontal scrollbar at 375px | Body does not overflow horizontally | |
| 40 | No horizontal scrollbar at 768px | Body does not overflow horizontally | |
| 41 | No horizontal scrollbar at 1280px | Body does not overflow horizontally | |
| 42 | All buttons show hover states (desktop) | Buttons change appearance on hover | |
| 43 | Ship palette items show visual feedback | Placed ships visually distinct from unplaced | |
