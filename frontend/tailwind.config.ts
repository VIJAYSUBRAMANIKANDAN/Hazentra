import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B121C",
        panel: "#111B29",
        panelAlt: "#0E1826",
        stroke: "#1E2C3D",
        strokeSoft: "#16212F",
        ink: "#E6EDF5",
        inkMuted: "#8CA0B3",
        inkFaint: "#5C7085",
        accent: "#22D3EE",
        accentDim: "#0E7490",
        accentSoft: "#123542",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02), 0 12px 30px -12px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
