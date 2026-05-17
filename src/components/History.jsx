import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/useAuth'

function startOfWeekUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() // 0..6 (Sun..Sat)
  const mondayBased = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - mondayBased)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function formatHhMm(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function History() {
  const { user, loading } = useAuth()
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [error, setError] = useState(null)

  const since = useMemo(() => startOfWeekUtc(new Date()).toISOString(), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setError(null)
      const { data, error: err } = await supabase
        .from('practice_sessions')
        .select('duration_seconds, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500)

      if (cancelled) return
      if (err) {
        setError(err.message)
        return
      }
      let sum = 0
      for (const r of data || []) sum += Number(r.duration_seconds) || 0
      setTotalSeconds(sum)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [since, user])

  if (loading) return <div className="p-6 text-on-background">Loading…</div>
  if (!user) return <div className="p-6 text-on-background">Sign in to view history.</div>

  return (
    <div className="p-6 text-left text-on-background">
      <h2 className="mb-1.5 mt-0 font-semibold text-on-background">History</h2>
      <div className="font-mono text-sm text-on-surface-variant">This week (since Monday UTC)</div>

      {error ? (
        <div className="mt-3 rounded-xl border border-outline-variant bg-error-container px-2.5 py-2.5 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      <div className="mt-3.5 font-mono text-[42px] tracking-tight text-primary">{formatHhMm(totalSeconds)}</div>
    </div>
  )
}
