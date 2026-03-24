const { themeColors } = require("./theme.config");
const plugin = require("tailwindcss/plugin");

const tailwindColors = Object.fromEntries(
  Object.entries(themeColors).map(([name, swatch]) => [
    name,
    {
      DEFAULT: `var(--color-${name})`,
      light: swatch.light,
      dark: swatch.dark,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Scan all component and app files for Tailwind classes
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}", "./hooks/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...tailwindColors,
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        }
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ':root:not([data-theme="dark"]) &');
      addVariant("dark", ':root[data-theme="dark"] &');
    }),
  ],
};
