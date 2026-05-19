"""
AI Battleship Service — Flask HTTP server for CrewAI-powered move decisions.
POST /api/decide — receives game state, returns optimal coordinate.
Uses OpenRouter with deepseek/deepseek-v4-pro model.
"""
import json
import os
import sys
import traceback
from flask import Flask, request, jsonify

app = Flask(__name__)

# Import CrewAI agent (lazy — only loads on first request to keep startup fast)
_agent = None


def get_agent():
    global _agent
    if _agent is None:
        from crew import BattleshipAgent
        _agent = BattleshipAgent()
    return _agent


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/decide", methods=["POST"])
def decide():
    """
    Accepts: { myBoard, trackingBoard, ships }
    Returns: { coordinate: "a5" }
    
    Fallback: if CrewAI fails, returns a random valid coordinate.
    """
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "invalid json"}), 400

    try:
        agent = get_agent()
        result = agent.decide(data)
        return jsonify(result)
    except Exception as e:
        # Log error and fall back to random valid coordinate
        print(f"[AI-ERROR] {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)

        # Calculate a random valid coordinate from tracking board
        coordinate = _random_fallback(data)
        return jsonify({
            "coordinate": coordinate,
            "thinking": "AI service encountered an error — using random targeting.",
            "fallback": True,
        })


def _random_fallback(data: dict) -> str:
    """Return a random un-shot cell from the tracking board."""
    import random
    tracking = data.get("trackingBoard", {})
    grid = tracking.get("grid", [])
    candidates = []
    for row_idx, row in enumerate(grid):
        for col_idx, cell in enumerate(row):
            status = cell.get("status", "empty") if isinstance(cell, dict) else "unknown"
            if status not in ("hit", "miss", "sunk"):
                col_letter = chr(ord("a") + col_idx)
                candidates.append(f"{col_letter}{row_idx + 1}")
    if candidates:
        return random.choice(candidates)
    # No valid cells left — game should be over
    return "a1"


if __name__ == "__main__":
    port = int(os.environ.get("AI_SERVICE_PORT", 5005))
    print(f"AI Battleship Service starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
