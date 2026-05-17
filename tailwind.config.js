/** @type {import('tailwindcss').Config} */
/**
 * Semantic colors resolve from CSS variables on `:root` keyed by `data-visual-layout`.
 * — `obsidian` (default), `light` (studio), `synthwave` (neon / Space Grotesk shell).
 */

const dsSolidKeys = /** @type {const} */ ([
  'background',
  'on-background',
  'surface',
  'on-surface',
  'on-surface-variant',
  'surface-dim',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'surface-variant',
  'surface-bright',
  'outline',
  'outline-variant',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'primary-fixed',
  'primary-fixed-dim',
  'on-primary-fixed',
  'on-primary-fixed-variant',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'secondary-fixed',
  'secondary-fixed-dim',
  'on-secondary-fixed',
  'on-secondary-fixed-variant',
  'tertiary',
  'on-tertiary',
  'tertiary-container',
  'on-tertiary-container',
  'tertiary-fixed',
  'tertiary-fixed-dim',
  'on-tertiary-fixed',
  'on-tertiary-fixed-variant',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'surface-tint',
  'inverse-surface',
  'inverse-on-surface',
  'inverse-primary',
  'chrome-muted',
  'app-bar',
  'chrome-hover',
])

function dsSolidColors() {
  return Object.fromEntries(dsSolidKeys.map((k) => [k, `var(--ds-${k})`]))
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './synth-app/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        stitch: {
          canvas: '#0d0e10',
          surface: '#16181c',
          elevated: '#1f2022',
          teal: '#4f98a3',
          cyan: '#8ad2de',
          ink: '#00363d',
        },
        ...dsSolidColors(),
        primary: 'rgb(var(--ds-primary-rgb) / <alpha-value>)',
        chrome: 'rgb(var(--ds-chrome-rgb) / <alpha-value>)',
        hairline: 'rgb(var(--ds-hairline-rgb) / <alpha-value>)',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        'space-grotesk': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'headline-lg': ['Inter', 'system-ui', 'sans-serif'],
        'label-caps': ['Inter', 'system-ui', 'sans-serif'],
        'headline-md': ['Inter', 'system-ui', 'sans-serif'],
        'body-md': ['Inter', 'system-ui', 'sans-serif'],
        'display-mono': ['Inter', 'system-ui', 'sans-serif'],
        'display-numeral': ['Inter', 'system-ui', 'sans-serif'],
        'meter-label': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'display-mono': ['14px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
        'display-numeral': ['48px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '800' }],
        'meter-label': ['10px', { lineHeight: '1', fontWeight: '500' }],
      },
      borderRadius: {
        ds: 'var(--ds-rounded-ds)',
        'ds-lg': 'var(--ds-rounded-ds-lg)',
        'ds-xl': 'var(--ds-rounded-ds-xl)',
        'ds-full': 'var(--ds-rounded-ds-full)',
      },
      spacing: {
        gutter: '24px',
        margin: '40px',
      },
    },
    screens: {
      wide: { raw: '(min-aspect-ratio: 4/3)' },
    },
  },
  plugins: [],
}
