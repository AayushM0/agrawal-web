/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#d9531e",
          burgundy: "#c04515",
          dark: "#5c240d",
          accent: "#e69500",
          accentLight: "#fde08b",
          gold: "#c27803",
        },
        canvas: {
          page: "#fffdf8",
          card: "#ffffff",
          warm: "#fff6e5",
          subtle: "#faf1e0",
        },
        body: {
          text: "#422b22",
          heading: "#291811",
          muted: "#7a5e52",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "Noto Sans Devanagari", "sans-serif"],
        devanagari: ["var(--font-devanagari)", "Noto Sans Devanagari", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        warm: "0 4px 20px rgba(217, 83, 30, 0.07)",
        warmLg: "0 12px 32px rgba(217, 83, 30, 0.12)",
        goldCta: "0 10px 24px rgba(230, 149, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
