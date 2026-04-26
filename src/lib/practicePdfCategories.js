import { canAccessRoyzivGsbSheetLibrary } from './royzivgsbAccess.js'

/**
 * Top-level folders inside Sheet library. Each has its own `pathPrefix` under `public/practice-pdfs/`.
 * Add new roots as siblings (new objects in this array), not nested under ROYZIVGSB.
 *
 * @typedef {{ title: string, items: { title: string, file: string }[] }} PracticePdfSection
 * @typedef {{ id: string, label: string, pathPrefix: string, canAccess: (email: string) => boolean, sections: PracticePdfSection[] }} PracticePdfLibraryRoot
 */

/** @type {PracticePdfLibraryRoot[]} */
export const PRACTICE_PDF_LIBRARIES = [
  {
    id: 'royzivgsb',
    label: 'ROYZIVGSB',
    pathPrefix: '/practice-pdfs/royzivgsb',
    canAccess: canAccessRoyzivGsbSheetLibrary,
    sections: [
      {
        title: 'The routine',
        items: [{ title: 'Speed Practice Routine', file: 'speed-practice-routine-tabs.pdf' }],
      },
      {
        title: 'Endurance exercises',
        items: [
          { title: '2 Finger Stamina', file: '2-finger-stamina-tabs.pdf' },
          { title: 'Chromatic Pattern 1', file: 'chromatic-pattern-1.pdf' },
          { title: 'Chromatic Pattern 2', file: 'chromatic-pattern-2.pdf' },
          { title: 'Chromatic Scale Cycles', file: 'chromatic-scale-cycles-tabs.pdf' },
          { title: 'Cross String Picking', file: 'cross-string-picking-tabs.pdf' },
          { title: 'Double Picking Pentatonic', file: 'double-picking-pentatonic-tabs.pdf' },
          { title: 'Finger Independence', file: 'finger-independence-tab.pdf' },
          { title: 'Inside / Outside Picking', file: 'inside-outside-pickings-tabs.pdf' },
          { title: 'Pinky Finger Workout', file: 'pinky-finger-workout-tabs.pdf' },
          { title: 'Up 5 Down 3', file: 'up-5-down-3-tabs.pdf' },
          { title: 'Wide Fret Stretch', file: 'wide-fret-stretch-tabs.pdf' },
        ],
      },
      {
        title: 'Speed techniques',
        items: [{ title: 'Multiple Techniques', file: 'multiple-techniques-tabs.pdf' }],
      },
      {
        title: 'Scale sequences',
        items: [
          { title: 'Ascending 3 Note Per String', file: 'ascending-3-note-per-string-sequence.pdf' },
          { title: 'Ascending 3rds', file: 'ascending-3rds.pdf' },
          { title: 'Chromatic Sequence', file: 'chromatic-sequence.pdf' },
          { title: 'Descending Triads', file: 'descending-triads.pdf' },
          { title: 'Diminished Sequence', file: 'diminished-sequence.pdf' },
          { title: 'Horizontal 3 Note Per String', file: 'horizontal-3-note-per-string-sequence.pdf' },
          { title: 'Horizontal Pentatonic', file: 'horizontal-pentatonic-sequence.pdf' },
          { title: 'Modes Sequence 1', file: 'modes-sequence-1-tabs.pdf' },
          { title: 'Modes Sequence 2', file: 'modes-sequence-2-tabs.pdf' },
          { title: 'Pentatonic Sequence 1', file: 'pentatonic-sequence-1-tabs.pdf' },
          { title: 'Pentatonic Sequence 2', file: 'pentatonic-sequence-2-tabs.pdf' },
          { title: 'Up / Down Pentatonic Sequence', file: 'up-down-pentatonic-sequence.pdf' },
        ],
      },
      {
        title: 'Speed licks',
        items: [
          { title: 'Lick 1', file: 'lick-1-tabs.pdf' },
          { title: 'Lick 2', file: 'lick-2-tabs.pdf' },
          { title: 'Lick 3', file: 'lick-3-tabs.pdf' },
          { title: 'Lick 4', file: 'lick-4-tabs.pdf' },
          { title: 'Lick 5', file: 'lick-5-tabs.pdf' },
          { title: 'Lick 6', file: 'lick-6-tabs.pdf' },
          { title: 'Lick 7', file: 'lick-7-tabs.pdf' },
          { title: 'Lick 8', file: 'lick-8-tabs.pdf' },
        ],
      },
    ],
  },
]

/** @deprecated Prefer PRACTICE_PDF_LIBRARIES — same array, clearer name */
export const PRACTICE_PDF_CATEGORIES = PRACTICE_PDF_LIBRARIES
