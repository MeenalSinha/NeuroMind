/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", // Very light gray background
        surface: "#FFFFFF",
        surface2: "#F1F5F9",
        border: "#E2E8F0",
        primary: "#0F172A", // Dark Slate/Black for primary actions
        primaryMuted: "#334155",
        accent: "#3B82F6", // Blue
        accentMuted: "#DBEAFE",
        success: "#22C55E", // Green
        successMuted: "#DCFCE7",
        warning: "#F97316", // Orange
        warningMuted: "#FFEDD5",
        danger: "#EF4444", // Red
        dangerMuted: "#FEE2E2",
        muted: "#64748B",
        text: "#334155",
        heading: "#0F172A",
        sidebar: "#FFFFFF",
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        cardHover: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)",
      },
    },
  },
  plugins: [],
};
