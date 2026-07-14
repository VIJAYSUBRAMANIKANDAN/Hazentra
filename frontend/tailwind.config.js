/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Hazentra brand palette — derived from the logo (misty slate + ice-crystal cyan)
        ink: {
          950: "#070B10",
          900: "#0A0F16",
          800: "#101822",
          700: "#17212E",
          600: "#233040",
        },
        mist: {
          400: "#7C8CA0",
          300: "#A4B2C3",
          200: "#CBD5E1",
        },
        crystal: {
          400: "#5EEAD4",
          500: "#2DD4E8",
          600: "#0EA5C7",
          glow: "#8FF7EA",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(94,234,212,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 50px -20px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "grain": "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC44NScgbnVtT2N0YXZlcz0nMicgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==')",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(3%, -4%) scale(1.05)" },
        },
      },
      animation: {
        drift: "drift 18s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
