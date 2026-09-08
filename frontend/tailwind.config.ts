import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0F1320",
          900: "#161B2C",
          800: "#212842",
          700: "#2E3760",
          600: "#3F4C82",
        },
        paper: {
          50: "#FBF9F3",
          100: "#F4EFE2",
          200: "#E9E0CB",
        },
        amber: {
          400: "#E8A33D",
          500: "#D98F1F",
        },
        moss: {
          400: "#6FA88A",
          500: "#4E8A6E",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,19,32,0.06), 0 8px 24px -8px rgba(15,19,32,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
