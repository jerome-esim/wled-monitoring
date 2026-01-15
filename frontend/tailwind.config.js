/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
        secondary: {
          DEFAULT: '#8b5cf6',
          dark: '#6d28d9',
        },
      },
    },
  },
  plugins: [],
};
