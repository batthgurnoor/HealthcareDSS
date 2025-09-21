import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: { card: "0 10px 20px rgba(0,0,0,.25)" }
    },
  },
  plugins: [forms], 
};
