import preset from '../../../../vendor/filament/support/tailwind.config.preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  darkMode: ["class"],
  content: [
    './app/Filament/**/*.php',
    './resources/views/filament/**/*.blade.php',
    './vendor/filament/**/*.blade.php',
  ],
  theme: {
    extend: {
      colors: {
        // Match main app colors
        primary: {
          50: 'hsl(150, 100%, 95%)',
          100: 'hsl(150, 100%, 90%)',
          200: 'hsl(150, 100%, 80%)',
          300: 'hsl(150, 100%, 70%)',
          400: 'hsl(150, 100%, 55%)',
          500: 'hsl(150, 100%, 41%)',
          600: 'hsl(150, 100%, 35%)',
          700: 'hsl(150, 100%, 28%)',
          800: 'hsl(150, 100%, 22%)',
          900: 'hsl(150, 100%, 15%)',
          950: 'hsl(150, 100%, 8%)',
        },
      },
    },
  },
}
