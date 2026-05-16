// ============================================================
// ShipPalette.tsx — Draggable ship palette for placement phase
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Ships to Place
        </h3>
        <button
          className="btn btn-secondary text-xs px-2 py-1"
          onClick={onRotate}
        >
          Rotate (R) — {currentOrientation === "horizontal" ? "→" : "↓"}
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
              onClick={() => !isPlaced && onSelectShip(shipType)}
              onDragStart={(e) => {
                if (isPlaced) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("shipType", shipType);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <span className="text-xs font-bold w-24">{shipType}</span>
              <div
                className="flex gap-1"
                style={{
                  flexDirection:
                    currentOrientation === "horizontal" ? "row" : "column",
                }}
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
        Click a ship then click the board to place • Press R to rotate
      </p>
    </div>
  );
};

export default ShipPalette;
