"""
Battleship AI Agent using CrewAI + OpenRouter.
Strategy: hunt-and-target with probability weighting.
Uses deepseek/deepseek-v4-pro via OpenRouter.
"""
import os
import json
from crewai import Agent, Task, Crew, Process


class BattleshipAgent:
    def __init__(self):
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        self.model = os.environ.get("AI_MODEL", "deepseek/deepseek-v4-pro")
        self.base_url = "https://openrouter.ai/api/v1"

    def decide(self, game_state: dict) -> str:
        """
        Analyze game state and return optimal coordinate.
        Falls back to hunt-and-target if CrewAI fails.
        """
        try:
            return self._crew_decide(game_state)
        except Exception:
            return self._fallback_decide(game_state)

    def _crew_decide(self, game_state: dict) -> str:
        """Use CrewAI to analyze board and decide next shot."""
        tracking = game_state.get("trackingBoard", {})
        grid = tracking.get("grid", [])
        ships = game_state.get("ships", [])

        # Build a human-readable board representation
        board_str = self._format_board(grid)
        ships_status = self._format_ships(ships)

        agent = Agent(
            role="Naval Warfare Commander",
            goal="Win the Battleship game by making optimal shot decisions using hunt-and-target strategy",
            backstory=(
                "You are a seasoned naval commander with decades of experience in naval warfare. "
                "You analyze the tracking board meticulously, looking for patterns and opportunities. "
                "When you score a hit, you systematically hunt the surrounding cells to sink the ship. "
                "When no hits are pending, you use checkerboard parity strategy to maximize coverage."
            ),
            allow_delegation=False,
            verbose=False,
        )

        task = Task(
            description=(
                f"Your tracking board (where you shot):\n{board_str}\n\n"
                f"Your ships:\n{ships_status}\n\n"
                "Analyze the board and decide your next shot. "
                "Use hunt-and-target: if any cell shows a hit with the ship not sunk, "
                "target adjacent cells (up, down, left, right) first. "
                "If no active hits, use a checkerboard pattern to maximize coverage. "
                "Return ONLY a JSON object with the coordinate: {\"col\": \"a\", \"row\": 1}\n"
                "Column must be a single letter a-j. Row must be a number 1-10."
            ),
            expected_output='{"col": "a", "row": 1}',
            agent=agent,
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=False,
        )

        result = crew.kickoff()
        return self._parse_coordinate(str(result))

    def _parse_coordinate(self, output: str) -> str:
        """Parse CrewAI output into a-j, 1-10 coordinate."""
        try:
            # Try to find JSON in the output
            start = output.find("{")
            end = output.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = output[start:end]
                data = json.loads(json_str)
                col = str(data.get("col", "a")).lower()[:1]
                row = int(data.get("row", 1))
                if col in "abcdefghij" and 1 <= row <= 10:
                    return f"{col}{row}"
        except (json.JSONDecodeError, ValueError, KeyError):
            pass
        # Fallback to extracting first letter+number
        return self._fallback_decide({})

    def _fallback_decide(self, game_state: dict) -> str:
        """Hunt-and-target strategy without LLM."""
        import random
        tracking = game_state.get("trackingBoard", {})
        grid = tracking.get("grid", [])

        # Priority 1: Target adjacent to hits
        hit_cells = []
        for row_idx, row in enumerate(grid):
            for col_idx, cell in enumerate(row):
                if isinstance(cell, dict) and cell.get("status") == "hit":
                    hit_cells.append((row_idx, col_idx))

        candidates = set()
        for r, c in hit_cells:
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 10 and 0 <= nc < 10:
                    cell = grid[nr][nc] if nr < len(grid) and nc < len(grid[nr]) else {}
                    status = cell.get("status", "empty") if isinstance(cell, dict) else "empty"
                    if status not in ("hit", "miss", "sunk"):
                        col_letter = chr(ord("a") + nc)
                        candidates.add(f"{col_letter}{nr + 1}")

        if candidates:
            return random.choice(list(candidates))

        # Priority 2: Checkerboard pattern
        all_valid = []
        for row_idx, row in enumerate(grid):
            for col_idx, cell in enumerate(row):
                status = cell.get("status", "empty") if isinstance(cell, dict) else "empty"
                if status not in ("hit", "miss", "sunk"):
                    # Checkerboard: target cells where (row+col) % 2 == 0
                    if (row_idx + col_idx) % 2 == 0:
                        col_letter = chr(ord("a") + col_idx)
                        all_valid.append(f"{col_letter}{row_idx + 1}")

        if all_valid:
            return random.choice(all_valid)

        # Fallback: any valid cell
        for row_idx, row in enumerate(grid):
            for col_idx, cell in enumerate(row):
                status = cell.get("status", "empty") if isinstance(cell, dict) else "empty"
                if status not in ("hit", "miss", "sunk"):
                    col_letter = chr(ord("a") + col_idx)
                    return f"{col_letter}{row_idx + 1}"

        return "a1"

    def _format_board(self, grid: list) -> str:
        """Format tracking board as human-readable text."""
        lines = ["  a b c d e f g h i j"]
        for row_idx, row in enumerate(grid):
            cells = []
            for cell in row:
                if isinstance(cell, dict):
                    s = cell.get("status", "empty")
                    cells.append({"hit": "H", "miss": "M", "sunk": "S", "ship": ".", "empty": "."}.get(s, "?"))
                else:
                    cells.append("?")
            lines.append(f"{row_idx + 1:2d} " + " ".join(cells))
        return "\n".join(lines)

    def _format_ships(self, ships: list) -> str:
        """Format ships status."""
        if not ships:
            return "No ship data"
        lines = []
        for s in ships:
            name = s.get("type", "Unknown")
            hits = s.get("hits", 0)
            length = s.get("length", 0)
            status = "SUNK" if hits >= length else f"{hits}/{length} hits"
            lines.append(f"  {name}: {status}")
        return "\n".join(lines)
