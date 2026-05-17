/**
 * Walkthrough state + step content.
 *
 * Storage layout under {@link WALKTHROUGH_STORAGE_KEY} (localStorage):
 *   { completedAt?: number, dismissedAt?: number, advanced?: boolean }
 *
 * `completedAt` and `dismissedAt` are epoch ms. Either one is enough to
 * suppress auto-open on next launch — only an explicit "Replay" from
 * Settings should bring it back.
 */

import { APP_TAB_PATH } from './appRoutes.js'

export const WALKTHROUGH_STORAGE_KEY = 'metronome.walkthrough.v1'

/**
 * @typedef {Object} WalkthroughState
 * @property {number} [completedAt]
 * @property {number} [dismissedAt]
 * @property {boolean} [advanced]
 */

/** @returns {WalkthroughState} */
export function readWalkthroughState() {
  try {
    const raw = localStorage.getItem(WALKTHROUGH_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    /* ignore */
  }
  return {}
}

/** @param {WalkthroughState} patch */
export function writeWalkthroughState(patch) {
  try {
    const next = { ...readWalkthroughState(), ...patch }
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function hasSeenWalkthrough() {
  const s = readWalkthroughState()
  return Boolean(s.completedAt || s.dismissedAt)
}

export function clearWalkthroughState() {
  try {
    localStorage.removeItem(WALKTHROUGH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {Object} WalkthroughSlide
 * @property {string} id
 * @property {string} eyebrow      Short label shown above the title.
 * @property {string} title
 * @property {string} body
 * @property {string} icon         Material Symbols name.
 * @property {string[]} [bullets]  Optional bullet points.
 */

/** @type {WalkthroughSlide[]} */
export const WALKTHROUGH_LIGHT_SLIDES = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Tempo Trainer Pro',
    body: 'A pro-grade metronome, tuner, setlist tracker, practice logger, and synth lab — all in one app. Quick tour?',
    icon: 'rocket_launch',
    bullets: [
      'Use the bottom nav to switch between tools.',
      'Everything works offline once it loads.',
    ],
  },
  {
    id: 'metronome',
    eyebrow: 'Tab 1 / 5',
    title: 'Metronome',
    body: 'Your main tempo workstation. Spin the BPM dial, change the time signature, pick subdivisions, or tap the tempo with your finger.',
    icon: 'speed',
    bullets: [
      'Drag the rotary dial or double-click the BPM number to type one in.',
      'Tap tempo button averages your taps.',
      'Time signature and subdivision cycle on tap.',
    ],
  },
  {
    id: 'tuner',
    eyebrow: 'Tab 2 / 5',
    title: 'Tuner',
    body: 'A chromatic tuner with a configurable reference pitch (A4) — perfect for stringed and wind instruments.',
    icon: 'graphic_eq',
    bullets: [
      'Allow microphone access when prompted.',
      'Reference pitch shows in the top bar while the Tuner is open.',
    ],
  },
  {
    id: 'setlists',
    eyebrow: 'Tab 3 / 5',
    title: 'Setlists',
    body: 'Save songs (with their tempo, time signature, and subdivision) and arrange them into setlists for rehearsal or live performance.',
    icon: 'queue_music',
    bullets: [
      'Tap a saved song to load its tempo into the metronome.',
      'Stage mode locks the screen on big numbers.',
    ],
  },
  {
    id: 'practice',
    eyebrow: 'Tab 4 / 5',
    title: 'Practice',
    body: 'Log practice sessions against your sheet library, attach PDFs, and review your history over time.',
    icon: 'fitness_center',
    bullets: [
      'Open the sheet library to browse course PDFs and custom exercises.',
      'Sessions sync across devices when you’re signed in.',
    ],
  },
  {
    id: 'synth',
    eyebrow: 'Tab 5 / 5',
    title: 'Synth Lab',
    body: 'A built-in synthesizer that stays in sync with the metronome. Great for ear training, melodic exercises, or just messing around.',
    icon: 'piano',
    bullets: [
      'Piano, drum, or both layouts.',
      'BPM badge in the header keeps tempo visible.',
    ],
  },
  {
    id: 'themes',
    eyebrow: 'Bonus',
    title: 'Three themes',
    body: 'Pick the look that fits your mood: Obsidian (dark chrome), Studio Light (clean white), or Synthwave (neon retro).',
    icon: 'palette',
    bullets: [
      'Switch any time from Settings → Display → Theme.',
      'Each theme retunes typography, color, and motion.',
    ],
  },
  {
    id: 'finish',
    eyebrow: 'You’re ready',
    title: 'Let’s spotlight a few controls',
    body: 'Next, we’ll briefly highlight the three controls you’ll use the most: PLAY, the BPM dial, and the theme switcher.',
    icon: 'check_circle',
  },
]

/** @type {WalkthroughSlide[]} */
export const WALKTHROUGH_ADVANCED_SLIDES = [
  {
    id: 'tap-midi',
    eyebrow: 'Advanced',
    title: 'Tap tempo & MIDI',
    body: 'Tap a few times to set tempo by feel, or connect a MIDI controller to sync over Web MIDI.',
    icon: 'settings_input_component',
    bullets: [
      'Tap tempo averages the last few taps.',
      'MIDI input shows in Settings → MIDI when supported.',
    ],
  },
  {
    id: 'trainer',
    eyebrow: 'Advanced',
    title: 'Exercise trainer & ramps',
    body: 'Build interval-based exercises that ramp BPM up over time, with target tempos and saved progress.',
    icon: 'trending_up',
    bullets: [
      'Configure ramps per exercise.',
      'Progress autosaves to your account.',
    ],
  },
  {
    id: 'stage-hud',
    eyebrow: 'Advanced',
    title: 'Stage mode & floating HUD',
    body: 'Stage mode blows up the BPM and beat indicator for live use. The floating HUD keeps the click visible while you’re on other tabs.',
    icon: 'stadia_controller',
  },
  {
    id: 'pdf-library',
    eyebrow: 'Advanced',
    title: 'Sheet PDF library',
    body: 'Browse the included course PDFs or upload your own. Open a sheet from a practice session to keep both in view.',
    icon: 'menu_book',
  },
  {
    id: 'account',
    eyebrow: 'Advanced',
    title: 'Account & sync',
    body: 'Sign in with email to sync setlists, exercises, and practice history across devices. Guest mode works locally too.',
    icon: 'cloud_sync',
  },
  {
    id: 'settings-deep',
    eyebrow: 'Advanced',
    title: 'Settings deep dive',
    body: 'Under Settings you can inspect audio engine details (sample rate, buffer), check MIDI status, switch themes, and replay this walkthrough any time.',
    icon: 'tune',
  },
]

/**
 * Returns the ordered slide list for a given depth.
 * Advanced slides are inserted just before the final "finish" slide.
 * @param {boolean} advanced
 * @returns {WalkthroughSlide[]}
 */
export function buildWalkthroughSlides(advanced) {
  if (!advanced) return WALKTHROUGH_LIGHT_SLIDES
  const finish = WALKTHROUGH_LIGHT_SLIDES[WALKTHROUGH_LIGHT_SLIDES.length - 1]
  const head = WALKTHROUGH_LIGHT_SLIDES.slice(0, -1)
  return [...head, ...WALKTHROUGH_ADVANCED_SLIDES, finish]
}

/**
 * @typedef {Object} WalkthroughSpotlight
 * @property {string} id          Step id.
 * @property {string} target      Value of `data-walkthrough` to find.
 * @property {string} title
 * @property {string} body
 * @property {string} [tabPath]   Optional tab to navigate to first.
 */

/** @type {WalkthroughSpotlight[]} */
export const WALKTHROUGH_SPOTLIGHTS = [
  {
    id: 'play-fab',
    target: 'play-fab',
    title: 'PLAY / Pause',
    body: 'This is the main transport. On iOS, press once to unlock audio — then it starts the click.',
    tabPath: APP_TAB_PATH.metronome,
  },
  {
    id: 'bpm-dial',
    target: 'bpm-dial',
    title: 'BPM dial',
    body: 'Drag the dot around the dial to change tempo. Double-click the BPM number to type one in directly.',
    tabPath: APP_TAB_PATH.metronome,
  },
  {
    id: 'theme-switcher',
    target: 'theme-switcher',
    title: 'Theme switcher',
    body: 'Switch between Obsidian, Studio Light, and Synthwave any time. Each theme retunes the whole app.',
    tabPath: APP_TAB_PATH.settings,
  },
]
