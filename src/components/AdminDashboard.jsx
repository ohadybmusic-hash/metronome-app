import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/useAuth'
import './AdminDashboard.css'

function safeJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function parseJson(text) {
  return JSON.parse(text)
}

export default function AdminDashboard() {
  const { loading, isAdmin } = useAuth()

  const [profiles, setProfiles] = useState([])
  const [userDataByUserId, setUserDataByUserId] = useState({})
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const [globalStatus, setGlobalStatus] = useState(null)
  const [globalDraft, setGlobalDraft] = useState({
    maintenance_mode: false,
    banner_message: '',
    song_of_the_day_json: '{\n  \n}',
  })

  const [manageUserId, setManageUserId] = useState(null)
  const manageProfile = useMemo(
    () => profiles.find((p) => p.id === manageUserId) || null,
    [manageUserId, profiles],
  )
  const manageUserData = userDataByUserId[manageUserId] || null

  const [jsonDraft, setJsonDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!manageUserId) {
      const id = window.setTimeout(() => setJsonDraft(''), 0)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => {
      setJsonDraft(safeJson(manageUserData?.content || { songs: [], setlists: [] }))
    }, 0)
    return () => window.clearTimeout(id)
  }, [manageUserData?.content, manageUserId])

  useEffect(() => {
    if (loading || !isAdmin) return
    let cancelled = false

    async function load() {
      setError(null)

      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, is_admin, created_at')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (profErr) {
        setError(profErr.message)
        return
      }

      const { data: rows, error: udErr } = await supabase
        .from('user_data')
        .select('*')

      if (cancelled) return
      if (udErr) {
        setError(udErr.message)
        setProfiles(profs || [])
        setUserDataByUserId({})
        return
      }

      const agg = {}
      for (const r of rows || []) {
        const prev = agg[r.user_id]
        const practice = Number(r.practice_minutes) || 0
        if (!prev) {
          agg[r.user_id] = {
            id: r.id ?? r.user_id,
            user_id: r.user_id,
            practice_minutes: practice,
            content: r.content ?? r.data ?? {},
          }
        } else {
          // If multiple rows exist for some reason, sum practice.
          prev.practice_minutes += practice
          // Keep the latest content-ish; this is a best-effort view.
          if (r.content || r.data) prev.content = r.content ?? r.data
        }
      }

      setProfiles(profs || [])
      setUserDataByUserId(agg)

      const { data: statusRow, error: stErr } = await supabase
        .from('system_status')
        .select('id, maintenance_mode, banner_message, song_of_the_day, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (!stErr) {
        setGlobalStatus(statusRow ?? null)
        const id = window.setTimeout(() => {
          setGlobalDraft({
            maintenance_mode: Boolean(statusRow?.maintenance_mode),
            banner_message: statusRow?.banner_message || '',
            song_of_the_day_json: safeJson(statusRow?.song_of_the_day ?? {}),
          })
        }, 0)
        window.clearTimeout(id)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isAdmin, loading, refreshIndex])

  if (loading) return <div className="admin">Loading…</div>
  if (!isAdmin) return <Navigate to="/" replace />

  const refresh = () => setRefreshIndex((x) => x + 1)

  const saveGlobalSettings = async () => {
    setError(null)
    setSaving(true)
    try {
      const songJson = parseJson(globalDraft.song_of_the_day_json || '{}')
      if (globalStatus?.id) {
        const { error: upErr } = await supabase
          .from('system_status')
          .update({
            maintenance_mode: Boolean(globalDraft.maintenance_mode),
            banner_message: globalDraft.banner_message || null,
            song_of_the_day: songJson,
          })
          .eq('id', globalStatus.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase.from('system_status').insert({
          maintenance_mode: Boolean(globalDraft.maintenance_mode),
          banner_message: globalDraft.banner_message || null,
          song_of_the_day: songJson,
        })
        if (insErr) throw insErr
      }
      refresh()
    } catch (e) {
      setError(e?.message || 'Failed to save global settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleAdmin = async (profile) => {
    setError(null)
    setSaving(true)
    try {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ is_admin: !profile.is_admin })
        .eq('id', profile.id)
      if (upErr) throw upErr
      refresh()
    } catch (e) {
      setError(e?.message || 'Failed to update admin flag')
    } finally {
      setSaving(false)
    }
  }

  const upsertUserDataContent = async (userId, content) => {
    const existing = userDataByUserId[userId]
    if (existing?.id) {
      const { error: upErr } = await supabase
        .from('user_data')
        .update({
          data: content,
        })
        .eq('user_id', userId)
      if (upErr) throw upErr
      return
    }

    const { error: insErr } = await supabase.from('user_data').upsert({
      user_id: userId,
      data: content,
    }, { onConflict: 'user_id' })
    if (insErr) throw insErr
  }

  const saveJson = async () => {
    if (!manageUserId) return
    setError(null)
    setSaving(true)
    try {
      const content = parseJson(jsonDraft)
      await upsertUserDataContent(manageUserId, content)
      refresh()
    } catch (e) {
      setError(e?.message || 'Invalid JSON or failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deletePresets = async () => {
    if (!manageUserId) return
    setError(null)
    setSaving(true)
    try {
      const next = { ...(manageUserData?.content ?? {}) }
      next.songs = []
      next.setlists = []
      await upsertUserDataContent(manageUserId, next)
      refresh()
    } catch (e) {
      setError(e?.message || 'Failed to delete presets')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <h1 className="admin__title">Admin Dashboard</h1>
          <div className="admin__subtitle">Global settings + users</div>
        </div>
        <div className="admin__actions">
          <button type="button" className="admin__btn" onClick={refresh} disabled={saving}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <div className="admin__error">{error}</div> : null}

      <section className="admin__manage">
        <div className="admin__manageHeader">
          <div>
            <div className="admin__manageTitle">Global Settings</div>
            <div className="admin__manageSub">Shown to all users on the main dashboard</div>
          </div>
        </div>

        <div className="admin__globalGrid">
          <label className="admin__label">
            <span>Maintenance mode</span>
            <input
              type="checkbox"
              checked={Boolean(globalDraft.maintenance_mode)}
              onChange={(e) =>
                setGlobalDraft((d) => ({ ...d, maintenance_mode: e.target.checked }))
              }
            />
          </label>

          <label className="admin__label admin__label--wide">
            <span>Banner message</span>
            <input
              className="admin__input"
              value={globalDraft.banner_message}
              onChange={(e) => setGlobalDraft((d) => ({ ...d, banner_message: e.target.value }))}
              placeholder="Optional message shown to all users"
            />
          </label>

          <label className="admin__label admin__label--wide">
            <span>Song of the Day (JSON)</span>
            <textarea
              className="admin__textarea"
              value={globalDraft.song_of_the_day_json}
              onChange={(e) =>
                setGlobalDraft((d) => ({ ...d, song_of_the_day_json: e.target.value }))
              }
              spellCheck={false}
            />
          </label>

          <div className="admin__manageBtns">
            <button
              type="button"
              className="admin__btn admin__btn--primary"
              onClick={saveGlobalSettings}
              disabled={saving}
            >
              Save global settings
            </button>
          </div>
        </div>
      </section>

      <section className="admin__panel">
        <div className="admin__table">
          <div className="admin__thead">
            <div>User</div>
            <div>Admin</div>
            <div>Total practice</div>
            <div>Manage</div>
          </div>

          {profiles.map((p) => {
            const ud = userDataByUserId[p.id]
            const minutes = ud?.practice_minutes ?? 0
            return (
              <div key={p.id} className="admin__tr">
                <div className="admin__user">
                  <div className="admin__email">{p.email || '(no email)'}</div>
                  <div className="admin__id">{p.id}</div>
                </div>
                <div>
                  <button
                    type="button"
                    className={`admin__pill ${p.is_admin ? 'is-on' : ''}`}
                    onClick={() => toggleAdmin(p)}
                    disabled={saving}
                    title="Grant/revoke admin"
                  >
                    {p.is_admin ? 'Admin' : 'User'}
                  </button>
                </div>
                <div className="admin__minutes">{minutes} min</div>
                <div>
                  <button type="button" className="admin__btn" onClick={() => setManageUserId(p.id)}>
                    Manage
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {manageUserId ? (
        <section className="admin__manage">
          <div className="admin__manageHeader">
            <div>
              <div className="admin__manageTitle">Manage user</div>
              <div className="admin__manageSub">
                {manageProfile?.email || '(no email)'} • {manageUserId}
              </div>
            </div>
            <button type="button" className="admin__btn" onClick={() => setManageUserId(null)}>
              Close
            </button>
          </div>

          <div className="admin__manageGrid">
            <div className="admin__card">
              <div className="admin__cardTitle">Total practice</div>
              <div className="admin__cardValue">{manageUserData?.practice_minutes ?? 0} minutes</div>
            </div>

            <div className="admin__card admin__card--wide">
              <div className="admin__cardTitle">Presets content (JSON)</div>
              <textarea
                className="admin__textarea"
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                spellCheck={false}
              />
              <div className="admin__manageBtns">
                <button type="button" className="admin__btn admin__btn--primary" onClick={saveJson} disabled={saving}>
                  Save changes
                </button>
                <button type="button" className="admin__btn" onClick={deletePresets} disabled={saving}>
                  Delete presets
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

