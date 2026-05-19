// ============================================================
// Battleship — shared types
// Canonical source per docs/game_spec.md and docs/api_contract.md
// ============================================================
/** Ship lengths as defined in docs/game_spec.md §3. */
export const SHIP_LENGTHS = {
    Carrier: 5,
    Battleship: 4,
    Cruiser: 3,
    Submarine: 3,
    Destroyer: 2,
};
// ---- AI -----------------------------------------------------
/** Timeout in ms for AI move decisions before fallback to random shot. */
export const AI_DECISION_TIMEOUT_MS = 15_000;
// ---- Disconnect (built-in Socket.IO event) ------------------
// The server listens for the 'disconnect' event on individual
// sockets. This event is NOT included in the typed interfaces
// above because Socket.IO fires it natively, but the server
// MUST handle it per docs/game_spec.md §8 (Disconnect Handling).
//# sourceMappingURL=types.js.map