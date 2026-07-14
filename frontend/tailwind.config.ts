import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette extracted from the Smart PMB collage:
        // deep paddy greens with a harvest-gold accent.
        pmb: {
          50: "#F2FAF3",
          100: "#E3F2E6",
          200: "#C2E2C9",
          300: "#8FCB9B",
          400: "#5BB06E",
          500: "#2E9E44",
          600: "#1E7A34",
          700: "#14632A",
          800: "#105020",
          900: "#0B3D14",
        },
        gold: {
          50: "#FBF6E9",
          100: "#F5E9C8",
          200: "#EBD392",
          300: "#E0B030",
          400: "#D0A020",
          500: "#C8941E",
          600: "#B8860B",
          700: "#946812",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
