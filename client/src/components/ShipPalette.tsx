// ============================================================
// ShipPalette.tsx — Riveted-metal draggable ship palette
// ============================================================

import React from "react";
import type { ShipType } from "@battleship/shared";
import { SHIP_LENGTHS } from "@battleship/shared";

interface ShipPaletteProps {
  placedShips: Set<string>;
  currentOrientation: "horizontal" | "vertical";
  onSelectShip: (shipType: ShipType) => void;
  onRotate: () => void;
}

const SHIP_TYPES: ShipType[] = [
  "Carrier",
  "Battleship",
  "Cruiser",
  "Submarine",
  "Destroyer",
];

const ShipPalette: React.FC<ShipPaletteProps> = ({
  placedShips,
  currentOrientation,
  onSelectShip,
  onRotate,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3
          className="text-sm font-semibold uppercase tracking-[0.2em]"
          style={{
            fontFamily: "'Crimson Text', serif",
            fontVariant: "small-caps",
            color: "var(--color-brass-dim)",
          }}
        >
          Ships to Place
        </h3>
        <button
          className="btn btn-secondary text-xs px-3 py-2 min-h-[44px] w-full sm:w-auto"
          onClick={onRotate}
        >
          ROTATE (R) — {currentOrientation === "horizontal" ? "→" : "↓"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {SHIP_TYPES.map((shipType) => {
          const isPlaced = placedShips.has(shipType);
          const length = SHIP_LENGTHS[shipType];

          return (
            <div
              key={shipType}
              className={`ship-palette-item ${isPlaced ? "placed" : ""}`}
              draggable={!isPlaced}
              onClick={() => onSelectShip(shipType)}
              onDragStart={(e) => {
                if (isPlaced) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("shipType", shipType);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <span
                className="text-xs font-bold w-24 uppercase tracking-[0.08em]"
                style={{
                  fontFamily: "'Crimson Text', serif",
                  color: isPlaced
                    ? "var(--color-warm-gray-dim)"
                    : "var(--color-warm-gray-bright)",
                }}
              >
                {shipType}
              </span>
              <div
                className={`flex gap-1 ${currentOrientation === "vertical" ? "flex-col" : ""}`}
              >
                {Array.from({ length }, (_, i) => (
                  <div key={i} className="ship-segment" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="key-hint">
        CLICK SHIP THEN CLICK BOARD • PRESS R TO ROTATE
      </p>
    </div>
  );
};

export default ShipPalette;
