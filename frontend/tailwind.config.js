/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#dfe8ff",
          200: "#bccdff",
          300: "#94adff",
          400: "#6d8cff",
          500: "#4466ff",
          600: "#2f4fe6",
          700: "#223cbc",
          800: "#1d3295",
          900: "#182a77"
        }
      }
    }
  },
  plugins: []
};

