/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#15803d",
        secondary: "#4a8c3d",
        accent: "#c5283d",
        "background-light": "#f3f4f6",
        "background-dark": "#111827",
        "card-light": "#ffffff",
        "card-dark": "#1f2937",
        "input-bg-light": "#f9fafb",
        "input-bg-dark": "#374151",
        "input-border-light": "#e5e7eb",
        "input-border-dark": "#4b5563",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
}
