import { METRONOME_STORAGE } from './storageKeys.js'

export function readGuestMetronomeData() {
  let nextSongs
  let nextSetlists
  let nextPrefs
  try {
    nextSongs = JSON.parse(localStorage.getItem(METRONOME_STORAGE.SONGS) || '[]')
  } catch {
    nextSongs = []
  }
  try {
    nextSetlists = JSON.parse(localStorage.getItem(METRONOME_STORAGE.SETLISTS) || '[]')
  } catch {
    nextSetlists = []
  }
  try {
    nextPrefs = JSON.parse(localStorage.getItem(METRONOME_STORAGE.PREFS) || '{}')
  } catch {
    nextPrefs = {}
  }
  return {
    songs: Array.isArray(nextSongs) ? nextSongs : [],
    setlists: Array.isArray(nextSetlists) ? nextSetlists : [],
    prefs: nextPrefs && typeof nextPrefs === 'object' ? nextPrefs : {},
  }
}

export function writeGuestMetronomeData(nextSongs, nextSetlists, prefs) {
  localStorage.setItem(METRONOME_STORAGE.SONGS, JSON.stringify(nextSongs))
  localStorage.setItem(METRONOME_STORAGE.SETLISTS, JSON.stringify(nextSetlists))
  localStorage.setItem(METRONOME_STORAGE.PREFS, JSON.stringify(prefs || {}))
}
