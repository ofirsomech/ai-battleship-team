# Battleship — API Contract (Socket.IO)

> **Canonical reference** for all builders and reviewers.
> Every event listed here MUST appear in [`shared/types.ts`](../shared/types.ts).
> If a mismatch is found, the contract wins; see `.roo/rules/04-contract-first.md`.

---

## Event Catalog

| # | Event | Direction | Payload Type | State Transition | Notes |
|---|---|---|---|---|---|
| 1 | `createRoom` | client→server | _empty_ | Lobby → Lobby | Server generates a 6-char alphanumeric room code. Only player 1 (host) calls this. |
| 2 | `roomCreated` | server→client | `{ roomCode: string }` | Lobby → Lobby | Emitted to the host. They share the code out-of-band with player 2. |
| 3 | `joinRoom` | client→server | `{ roomCode: string; playerName: string }` | Lobby → Lobby | Player 2 joins. Server validates: room exists, room not full (2 max). |
| 4 | `playerJoined` | server→client | `{ playerId: string; playerName: string }` | Lobby → Lobby | Broadcast to the room (both players) when the second player joins. |
| 5 | `placeShips` | client→server | `{ ships: ShipPlacement[] }` | Placement → Placement | Client submits all 5 ships. Server validates: 5 ships, no overlap, inside grid, orthogonal. May be called repeatedly before Ready. |
| 6 | `randomizeShips` | client→server | _empty_ | Placement → Placement | Server generates valid random layout and returns it via `placeShips` response (the client handles display; server stores the layout). |
| 7 | `playerReady` | client→server | _empty_ | Placement → Placement (→ Battle) | Server validates all 5 ships placed. Marks player ready. If both ready → emits `battleStart`. |
| 8 | `opponentReady` | server→client | _empty_ | Placement → Placement | Notifies the other player that the opponent has confirmed placement. |
| 9 | `battleStart` | server→client | `{ currentTurn: string }` | Placement → Battle | Emitted to both players. `currentTurn` is the host's playerId (host shoots first, per §5). |
| 10 | `shoot` | client→server | `{ coordinate: Coordinate }` | Battle → Battle (→ GameOver) | Server validates: (a) phase=battle, (b) it's the sender's turn, (c) cell not previously shot on this target. |
| 11 | `shotResult` | server→client | `ShotResultPayload` | Battle → Battle (→ GameOver) | Broadcast to both players. Contains coordinate, result (`miss` / `hit` / `sunk`), `sunkShip?`, `nextTurn`, and `winner?` if game ended. Turn passes regardless of hit/miss (§5). |
| 12 | `gameOver` | server→client | `GameOverPayload` | Battle → GameOver | Emitted when one player's 17 ship cells are all hit (or forfeit). Reveals both boards, triggers _Play Again_ button. |
| 13 | `requestReconnect` | client→server | `{ roomCode: string; playerId: string }` | any → any | Server validates: room exists, playerId existed in this room, within 30 s grace window. |
| 14 | `reconnectResult` | server→client | `ReconnectResultPayload` | any → Battle | On success, returns full `GameState` so client can rebuild UI. On failure, `success: false`. |
| 15 | `playerDisconnected` | server→client | `{ playerId: string }` | any → any | Broadcast when a player's socket disconnects. See §8 disconnect handling. |
| 16 | `playerReconnected` | server→client | `{ playerId: string }` | any → Battle | Broadcast when a player successfully reconnects within the grace window. |
| 17 | `playAgain` | client→server | _empty_ | GameOver → Placement | Both players must call this to restart. Server resets boards to empty, returns to Placement phase in same room. |
| 18 | `error` | server→client | `{ message: string; code?: string }` | — (any phase) | Generic error channel. Emitted to the requesting client on validation failures (e.g., shoot out of turn, invalid placement, room not found). |
| 19 | `lobbyNotice` | server→client | `{ message: string }` | Lobby → Lobby | Informational messages (e.g., "Room dropped because opponent left during placement"). |

---

## Built-in Socket.IO Events (Server-Handled)

| Event | Direction | Handler Purpose |
|---|---|---|
| `disconnect` | system → server | Fired when a socket disconnects. Server MUST implement per `docs/game_spec.md` §8: during Placement → drop room + notify remaining player via `lobbyNotice`; during Battle → start 30 s grace window, emit `playerDisconnected`. |

---

## Validation Rules (Cross-Reference)

| Rule | Applies To | Logic |
|---|---|---|
| Room code uniqueness | `createRoom` | Generate 6-char code; reject if collision (retry). |
| Room capacity | `joinRoom` | Max 2 players. If full, emit `error` with code `"ROOM_FULL"`. |
| Room existence | `joinRoom`, `requestReconnect` | If room not found, emit `error` with code `"ROOM_NOT_FOUND"`. |
| Player identity | `requestReconnect` | playerId must have been in this room. |
| Ship count | `placeShips`, `randomizeShips`, `playerReady` | Exactly 5 ships (Carrier, Battleship, Cruiser, Submarine, Destroyer). |
| Ship overlap | `placeShips`, `randomizeShips` | No two ships share a cell. |
| Ship bounds | `placeShips`, `randomizeShips` | All cells must be within grid (col 0–9, row 0–9). |
| Ship orthogonal | `placeShips`, `randomizeShips` | Horizontal or vertical only; no diagonals. |
| Turn order | `shoot` | `currentTurn` must match shooting playerId. |
| No double-shot | `shoot` | Cell must not have been previously targeted (status ≠ `hit`, `miss`, or `sunk`). |
| Phase guard | `shoot` | Phase must be `battle`. |
| Phase guard | `playerReady` | Phase must be `placement`. |
| Phase guard | `playAgain` | Phase must be `gameOver`. |
| Reconnect window | `disconnect` handler | 30 s timer; if expired, remaining player wins by forfeit. |
| Disconnect during placement | `disconnect` handler | Immediate drop; emit `lobbyNotice` + `error` to remaining player. |

---

## State Machine

```
            createRoom
  [new] ───────────────► Lobby
                              │
                   joinRoom   │
                              ▼
             Lobby (2 players) ──► Placement
                                        │
                            both ready  │
                                        ▼
                                    Battle ◄──────── reconnect (within 30 s)
                                        │
                         all 17 cells   │
                         hit or forfeit │
                                        ▼
                                    GameOver
                                        │
                              playAgain │
                                        ▼
                                    Placement  (same room, fresh boards)
```
