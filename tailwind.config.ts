import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#741b17",    // Royal Maroon
          burgundy: "#45110f",   // Temple Burgundy
          dark: "#300806",       // Deep Anchor
          accent: "#d79a20",     // Sacred Saffron
          accentLight: "#f0c96a",// Lustrous Gold
          gold: "#aa6d09",       // Deep Rich Gold
        },
        canvas: {
          page: "#fffaf2",       // Silk Cream Canvas
          card: "#ffffff",
          warm: "#fff6e5",
          subtle: "#fdf8ee",
        },
        body: {
          text: "#4d372c",       // Sandalwood Dark (WCAG AAA)
          heading: "#2d1b14",
          muted: "#7c685b",
        }
      },
      fontFamily: {
        sans: ["Poppins", "Noto Sans Devanagari", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        warm: "0 4px 20px rgba(69, 17, 15, 0.06)",
        warmLg: "0 12px 32px rgba(69, 17, 15, 0.10)",
        goldCta: "0 10px 24px rgba(194, 132, 11, 0.28)",
      }
    },
  },
  plugins: [],
} satisfies Config;