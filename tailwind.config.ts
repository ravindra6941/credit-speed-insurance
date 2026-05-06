import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#E8EDF7",
          100: "#C5D0E5",
          200: "#9FB1D2",
          300: "#7A91BF",
          400: "#5471AC",
          500: "#0A1628",
          600: "#081223",
          700: "#060E18",
          800: "#04090F",
          900: "#02040A",
        },
        gold: {
          50: "#FBF6E8",
          100: "#F5E9C5",
          200: "#EDD89E",
          300: "#E1C374",
          400: "#D4A853",
          500: "#C39236",
          600: "#A77724",
          700: "#855E1B",
          800: "#634516",
          900: "#412D0E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
