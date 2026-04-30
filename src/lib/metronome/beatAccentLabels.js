// Maps accent level string → numeric tier (0–3) for the stacked block UI
export function accentToNumeric(level) {
  switch (level) {
    case 'ACCENT3':
      return 3
    case 'ACCENT2': // NORMAL maps here too — visually "medium"
      return 2
    case 'ACCENT1':
      return 1
    case 'MUTE':
      return 0
    case 'NORMAL':
    default:
      return 2
  }
}

// Short readable label shown under each beat column
export function accentShortLabel(level) {
  switch (level) {
    case 'ACCENT3':
      return 'ACCT'
    case 'ACCENT2': // unused direct mapping; NORMAL shows MED
      return 'MED'
    case 'ACCENT1':
      return 'SOFT'
    case 'MUTE':
      return 'MUTE'
    case 'NORMAL':
    default:
      return 'MED'
  }
}
