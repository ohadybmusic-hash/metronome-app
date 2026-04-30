/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './synth-app/src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        'space-grotesk': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
    screens: {
      wide: { raw: '(min-aspect-ratio: 4/3)' },
    },
  },
  plugins: [],
}

