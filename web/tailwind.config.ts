import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        btc: {
          50: "#fff8eb",
          100: "#feecc7",
          200: "#fdd889",
          300: "#fcc04b",
          400: "#fbab22",
          500: "#f59209",
          600: "#d96c04",
          700: "#b44a07",
          800: "#92380c",
          900: "#782f0e",
          950: "#451602",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
