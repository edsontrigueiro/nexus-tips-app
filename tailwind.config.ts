import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050B18",
        bg2: "#081120",
        surface: "#0D1728",
        elevated: "#121E32",
        border: "#1C2940",
        text: "#F4F6FA",
        text2: "#9AA8BC",
        muted: "#66758A",
        primary: "#2563EB",
        success: "#16C784",
        danger: "#F0445E",
        warning: "#F5A524",
        info: "#38BDF8",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
