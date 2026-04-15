/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "rgb(var(--color-bg) / <alpha-value>)",
          sidebar: "rgb(var(--color-sidebar) / <alpha-value>)",
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          warning: "rgb(var(--color-warning) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)",
          text: "rgb(var(--color-text) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
}

