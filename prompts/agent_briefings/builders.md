# Builder Briefings

Each card is a ready-to-paste briefing the Orchestrator hands to a builder via `new_task`.

---

## architect-reviewer (used as the up-front Architect in Phase 1)

**Role**: Produce the contract every other agent depends on.
**Inputs to read first**: `docs/game_spec.md`, `.roomodes`.
**Branch**: `feature/architecture` off `dev`.
**Git identity**: `Architect AI` / `architect@battleship.local`.

**Deliverable**:
- `shared/types.ts` — all TS interfaces: `Ship`, `Cell`, `Board`, `GameState`, `Player`, `Phase`, `ShotResult`, plus Socket.IO event maps `ClientToServerEvents` and `ServerToClientEvents`.
- `docs/api_contract.md` — table of every Socket.IO event: name · direction · payload type (link to types.ts) · server state transition.
- `package.json` (root) with `workspaces: ["client", "server", "shared"]` and root scripts `dev`, `build`, `test`.
- `client/package.json`, `server/package.json`, `shared/package.json` with their own deps.
- `README.md` with minimal "how to run" stub.

**DoD**:
- `npm install` at root succeeds without errors.
- Every event referenced in `docs/game_spec.md` AC list has a typed signature.
- No app code anywhere; this is contract-only.
- Output the handoff block (see master prompt §4).

---

## db-dev

**Role**: Pure domain logic for the game (no I/O, no Socket).
**Inputs**: `shared/types.ts`, `docs/api_contract.md`, `docs/game_spec.md`.
**Branch**: `feature/db-domain` off `dev`.
**Git identity**: `DB Dev AI` / `db-dev@battleship.local`.

**Deliverable**: `server/src/domain/`
- `board.ts` — `createEmptyBoard()`, `placeShip(board, ship, anchor, orientation) → Board | InvalidPlacement`, `randomLayout(fleet) → Ship[]`.
- `match.ts` — `createMatch(roomCode) → GameState`, `applyShot(state, playerId, cell) → { state, result: ShotResult }`, `isFleetSunk(board) → boolean`, `winner(state) → PlayerId | null`.
- `__tests__/*.test.ts` — Vitest unit tests, **100% function coverage**, including invalid-input cases.

**DoD**:
- Zero imports from `express`, `socket.io`, `react`.
- All types come from `shared/`.
- `npm --workspace server test` passes.
- Handoff block.

---

## server-dev

**Role**: Socket.IO server + room manager. Uses the domain layer.
**Inputs**: `shared/types.ts`, `docs/api_contract.md`, `server/src/domain/*`.
**Branch**: `feature/server-socket` off `dev`.
**Git identity**: `Server Dev AI` / `server-dev@battleship.local`.

**Deliverable**:
- `server/src/index.ts` — Express bootstrap, CORS for `http://localhost:5173`, listens on `:3001`.
- `server/src/socket.ts` — Socket.IO server with `ClientToServerEvents` / `ServerToClientEvents` typing.
- `server/src/rooms.ts` — in-memory `Map<RoomCode, GameState>`, room create/join/leave, 30 s reconnect grace.
- Wire every event from `docs/api_contract.md` to the right handler.

**DoD**:
- Server starts via `npm --workspace server run dev` (use `tsx watch src/index.ts`).
- No business logic in the handlers — they only validate inputs and call into `domain/`.
- Manual smoke test passes: two `wscat` (or curl-stomp) connections can create a room and exchange events.
- Handoff block.

---

## client-dev

**Role**: React app + state + Socket.IO wrapper.
**Inputs**: `shared/types.ts`, `docs/api_contract.md`, `docs/game_spec.md`.
**Branch**: `feature/client-app` off `dev`.
**Git identity**: `Client Dev AI` / `client-dev@battleship.local`.

**Deliverable**: `client/src/`
- `main.tsx`, `App.tsx`, `routes.tsx` (or simple state-based router).
- Components: `Lobby`, `BoardSetup`, `Game`, `OwnBoard`, `TrackingBoard`, `Cell`, `ShipPalette`, `TurnIndicator`, `GameOverModal`.
- `socket.ts` — typed Socket.IO client wrapper (`io<ServerToClientEvents, ClientToServerEvents>`).
- `store.ts` — Zustand or `useReducer` global state.
- `vite.config.ts` configured to proxy `/socket.io` to `http://localhost:3001`.

**DoD**:
- `npm --workspace client run dev` serves on `:5173`.
- All 13 AC items in `docs/game_spec.md` are reachable through the UI.
- Coordinates use `a–j` × `1–10`.
- Handoff block.

---

## template-dev

**Role**: Pure presentational layer — Tailwind classes, dumb components, no logic.
**Inputs**: `shared/types.ts`, the in-progress `client/src/components/*` from `client-dev`.
**Branch**: `feature/client-app-styles` off `feature/client-app` (sub-branch — merges back into the client branch before that PR is reviewed).
**Git identity**: `Template Dev AI` / `template-dev@battleship.local`.

**Deliverable**:
- `client/src/styles/` — Tailwind base, theme tokens, animation keyframes for hit/sunk.
- `client/src/components/ui/` — `Button`, `Modal`, `Toast`, `Tooltip`, `IconHit`, `IconMiss`, `ShipBlock`.
- `client/tailwind.config.ts` properly configured.

**DoD**:
- No `useState`, no `useEffect` in `components/ui/*` — these are dumb.
- Hit cells: red bg + `V` + subtle pulse. Miss cells: gray + `x`. Sunk ships: highlighted with a distinct border + crossed-out `V`s.
- Handoff block.
