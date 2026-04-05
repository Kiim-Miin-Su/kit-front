import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        sand: "#f6f1e8",
        brand: "#0f766e",
        accent: "#f59e0b",
      },
    },
  },
  plugins: [],
};

export default config;
