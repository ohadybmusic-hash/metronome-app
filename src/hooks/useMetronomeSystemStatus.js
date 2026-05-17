import { useEffect, useState } from 'react'
import { supabasePublic } from '../lib/supabaseClient.js'
import { scheduleIdleTask } from '../lib/scheduleIdle.js'

/**
 * Polls the `system_status` table for admin banner / maintenance / song of the day.
 */
export function useMetronomeSystemStatus() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [systemStatusError, setSystemStatusError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSystemStatusError(null)
      const { data, error } = await supabasePublic
        .from('system_status')
        .select('maintenance_mode, banner_message, song_of_the_day, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setSystemStatusError(error.message)
        return
      }
      setSystemStatus(data ?? null)
    }
    const cancelIdle = scheduleIdleTask(
      () => {
        if (!cancelled) void load()
      },
      { timeout: 4000 },
    )
    const id = window.setInterval(() => {
      if (!cancelled) void load()
    }, 30000)
    return () => {
      cancelled = true
      cancelIdle()
      window.clearInterval(id)
    }
  }, [])

  return { systemStatus, systemStatusError }
}
