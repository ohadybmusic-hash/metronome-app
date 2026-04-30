export const TUNING_LIBRARY = [
  {
    id: 'chromatic',
    label: 'Chromatic (any note)',
    category: 'Chromatic',
    strings: [],
  },

  // Guitar
  {
    id: 'gtr-standard',
    label: 'Standard (E A D G B E)',
    category: 'Guitar',
    strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  {
    id: 'gtr-half-down',
    label: 'Half-step down (Eb Ab Db Gb Bb Eb)',
    category: 'Guitar',
    strings: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
  },
  {
    id: 'gtr-whole-down',
    label: 'Whole-step down (D G C F A D)',
    category: 'Guitar',
    strings: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  },
  { id: 'gtr-drop-d', label: 'Drop D (D A D G B E)', category: 'Guitar', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'gtr-drop-c', label: 'Drop C (C G C F A D)', category: 'Guitar', strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'gtr-dadgad', label: 'DADGAD (D A D G A D)', category: 'Guitar', strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'gtr-open-g', label: 'Open G (D G D G B D)', category: 'Guitar', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { id: 'gtr-open-d', label: 'Open D (D A D F# A D)', category: 'Guitar', strings: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { id: 'gtr-open-e', label: 'Open E (E B E G# B E)', category: 'Guitar', strings: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'] },

  // Bass (4-string)
  { id: 'bass-standard', label: 'Standard 4-string (E A D G)', category: 'Bass', strings: ['E1', 'A1', 'D2', 'G2'] },
  { id: 'bass-drop-d', label: 'Drop D (D A D G)', category: 'Bass', strings: ['D1', 'A1', 'D2', 'G2'] },
  { id: 'bass-half-down', label: 'Half-step down (Eb Ab Db Gb)', category: 'Bass', strings: ['D#1', 'G#1', 'C#2', 'F#2'] },

  // Bouzouki (common 8-string courses; treat as 4 targets)
  { id: 'bouzouki-irish-gdae', label: 'Irish (G D A E)', category: 'Bouzouki', strings: ['G2', 'D3', 'A3', 'E4'] },
  { id: 'bouzouki-irish-adad', label: 'Irish (A D A D)', category: 'Bouzouki', strings: ['A2', 'D3', 'A3', 'D4'] },
  { id: 'bouzouki-greek-cfad', label: 'Greek (C F A D)', category: 'Bouzouki', strings: ['C3', 'F3', 'A3', 'D4'] },
]
