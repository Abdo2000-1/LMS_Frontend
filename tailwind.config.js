/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
      },
      colors: {
        chem: {
          light: "#00A8E8",
          deep: "#0077B6",
          cta: "#FF6B35",
          bg: "#F8FAFC",
          "bg-alt": "#F4F9FF",
        },
      },
      animation: {
        "molecule-float": "molecule-float 6s ease-in-out infinite",
        "reaction-pulse": "reaction-pulse 3s ease-in-out infinite",
        "spin-slow": "chemistry-spin 12s linear infinite",
      },
      keyframes: {
        "molecule-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        "reaction-pulse": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.15)" },
        },
      },
    },
  },
  plugins: [],
};
