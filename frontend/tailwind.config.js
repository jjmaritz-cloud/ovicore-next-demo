/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ovicore: {
          emerald: "#0F3D35",
          green: "#1F8F68",
          mint: "#E8F8F1",
          gold: "#E5B64C",
          mist: "#F6F8FB",
          ink: "#0F172A"
        }
      }
    },
  },
  plugins: [],
};
