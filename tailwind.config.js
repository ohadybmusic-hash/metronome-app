/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
    screens: {
      wide: { raw: '(min-aspect-ratio: 4/3)' },
    },
  },
  plugins: [],
}

