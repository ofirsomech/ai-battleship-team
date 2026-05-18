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
      },
      animation: {
        "pulse-hit": "pulse-hit 1.2s ease-in-out infinite",
        "sunk-reveal": "sunk-reveal 1.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-hit": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.6)",
          },
          "50%": {
            boxShadow: "0 0 6px 2px rgba(220, 38, 38, 0.3)",
          },
        },
        "sunk-reveal": {
          "0%": {
            borderColor: "#ef4444",
            boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)",
          },
          "50%": {
            borderColor: "#fca5a5",
            boxShadow: "0 0 8px 2px rgba(239, 68, 68, 0.4)",
          },
          "100%": {
            borderColor: "#ef4444",
            boxShadow: "0 0 4px 1px rgba(239, 68, 68, 0.2)",
          },
        },
      },
    },
  },
  plugins: [],
};
