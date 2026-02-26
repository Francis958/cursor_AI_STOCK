/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bullish: '#22c55e',
        bearish: '#ef4444',
        neutral: '#f59e0b',
      },
    },
  },
  plugins: [],
};
