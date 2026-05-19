/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
        },
        brass: {
          DEFAULT: "#c9a84c",
          dim: "#8b7735",
          glow: "#e6c860",
        },
        copper: {
          DEFAULT: "#b87333",
          dim: "#7a4a24",
        },
        radar: {
          green: "#39ff14",
          dim: "#1a7a08",
        },
        sonar: {
          blue: "#00bfff",
          dim: "#005f7f",
        },
        "navy-deep": "#050d1a",
        "navy-base": "#0a1628",
        "navy-surface": "#0f1f3a",
        "navy-panel": "#122544",
        "navy-grid": "#1a3355",
        "warm-gray": {
          DEFAULT: "#8b8a7e",
          dim: "#5c5b52",
          bright: "#b8b7a8",
        },
      },
      fontFamily: {
        heading: ['"Crimson Text"', "serif"],
        mono: ['"DM Mono"', "monospace"],
      },
      animation: {
        "radar-sweep": "radar-sweep 4s linear infinite",
        "sonar-ping": "sonar-ping 1.6s ease-out infinite",
        "stamp-reveal": "stamp-reveal 0.7s ease-out",
        "sunk-brass": "sunk-brass 2s ease-in-out infinite",
        "brass-glow": "brass-glow 3s ease-in-out infinite",
        "gauge-pulse": "gauge-pulse 2s ease-in-out infinite",
        "miss-fade": "miss-fade 0.3s ease-out",
      },
      keyframes: {
        "radar-sweep": {
          from: { transform: "translate(-50%, -50%) rotate(0deg)" },
          to: { transform: "translate(-50%, -50%) rotate(360deg)" },
        },
        "sonar-ping": {
          "0%": {
            boxShadow:
              "0 0 0 0 rgba(57, 255, 20, 0.7), 0 0 4px 2px inset rgba(57, 255, 20, 0.3)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow:
              "0 0 6px 4px rgba(57, 255, 20, 0.3), 0 0 0 6px rgba(57, 255, 20, 0), 0 0 3px 1px inset rgba(57, 255, 20, 0.5)",
          },
          "100%": {
            boxShadow:
              "0 0 0 0 rgba(57, 255, 20, 0), 0 0 0 12px rgba(57, 255, 20, 0), 0 0 2px 1px inset rgba(57, 255, 20, 0.2)",
            transform: "scale(1.02)",
          },
        },
        "stamp-reveal": {
          "0%": { opacity: "0", transform: "scale(0.85)", filter: "blur(2px)" },
          "60%": { opacity: "1", transform: "scale(1.04)", filter: "blur(0px)" },
          "100%": { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
        },
        "sunk-brass": {
          "0%, 100%": {
            borderColor: "var(--color-brass-dim)",
            boxShadow: "0 0 2px 1px rgba(201, 168, 76, 0.15)",
          },
          "50%": {
            borderColor: "var(--color-brass)",
            boxShadow: "0 0 6px 2px rgba(201, 168, 76, 0.35)",
          },
        },
        "brass-glow": {
          "0%, 100%": { textShadow: "0 0 8px rgba(201, 168, 76, 0.2)" },
          "50%": { textShadow: "0 0 18px rgba(201, 168, 76, 0.45)" },
        },
        "gauge-pulse": {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
        "miss-fade": {
          from: { opacity: "0", transform: "scale(0.5) rotate(-15deg)" },
          to: { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
      },
    },
  },
  plugins: [],
};
