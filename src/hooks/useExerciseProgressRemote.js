import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Ref + remote payload for {@link ExerciseProgress}. Remote load flag clears when the signed-in user changes.
 */
export function useExerciseProgressRemote(userId) {
  const exerciseProgressRef = useRef({
    entries: [],
    customExerciseNames: [],
    sheetsByExercise: {},
    customExercisePlacements: {},
  })
  const [exerciseRemote, setExerciseRemote] = useState(() => ({ loaded: false, data: null }))

  const onExerciseProgressLoaded = useCallback((data) => {
    setExerciseRemote({ loaded: true, data })
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setExerciseRemote({ loaded: false, data: null })
    }, 0)
    return () => window.clearTimeout(id)
  }, [userId])

  return { exerciseProgressRef, exerciseRemote, onExerciseProgressLoaded }
}
