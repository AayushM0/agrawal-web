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
          primary: "#741b17",
          burgundy: "#45110f",
          dark: "#300806",
          accent: "#d79a20",
          accentLight: "#f0c96a",
          gold: "#aa6d09",
        },
        canvas: {
          page: "#fffaf2",
          card: "#ffffff",
          warm: "#fff6e5",
          subtle: "#fdf8ee",
        },
        body: {
          text: "#4d372c",
          heading: "#2d1b14",
          muted: "#7c685b",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "Noto Sans Devanagari", "sans-serif"],
        devanagari: ["var(--font-devanagari)", "Noto Sans Devanagari", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        warm: "0 4px 20px rgba(69, 17, 15, 0.06)",
        warmLg: "0 12px 32px rgba(69, 17, 15, 0.10)",
        goldCta: "0 10px 24px rgba(194, 132, 11, 0.28)",
      },
    },
  },
  plugins: [],
};
