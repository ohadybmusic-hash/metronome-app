# Metronome App — design context for Stitch

**Product:** Dark-themed musician web app (React + Vite). Supabase auth + cloud sync for songs/setlists/practice data. Mobile-first; persistent bottom nav after sign-in.

---

## Global shell (signed in)

- **Top bar:** Account button → slide-over **Account** drawer (guest vs email user, sign-out; embeds email/password + magic-link flows via Settings).
- **Bottom nav (5 tabs):** Metronome · Tuner · Setlists · Practice · Synth lab — emoji icons + labels today.
- **Floating Metronome HUD:** Draggable mini panel on every tab *except* Metronome when user “engages” it from the main metronome screen — play/pause, BPM, beat, expand/collapse, rhythm-trainer-related controls so tempo stays usable while browsing other tools.
- **Theme:** `data-theme="dark"`; CSS vars `--bg`, `--surface`, `--text`, `--text-h`, `--border`, `--shadow`. Metronome synth embed uses near-black panel `#050506`.
- **System overlays:** Count-in overlay (beats before play); optional full-screen **beat flash**; **Audio session primer** (mobile audio unlock hint). **iOS PDF** full-screen reader for sheet music (from Practice).

---

## Routes / screens

| Path | Name | Purpose |
|------|------|---------|
| `/`, `/metronome` | **Metronome** | Core tempo tool |
| `/tuner` | **Tuner** | Mic tuner + reference tone |
| `/setlists` | **Setlists** | Songs, setlists, performance mode, synth file I/O |
| `/practice` | **Practice** | Practice log + sheet PDFs (gated libraries by user) |
| `/synth` | **Synth lab** | Embedded drum/synth instrument designer |
| `/admin` | **Admin** | Admin-only: users, JSON user_data, global status banner |
| *(no tab)* | **Sign-in gate** | Shown when not authenticated: magic link, guest, open email sign-in |

**Error/config:** If env missing, a minimal **“App configuration”** full page explains Supabase env vars (not a normal user screen).

---

## Metronome (main tab)

**Primary controls**

- Play/pause (FAB-style; touch/pointer handling avoids double-fires).
- **BPM:** horizontal slider (1–400), **rotary dial** (log-friendly fine control), **tap tempo**.
- **Time signature** and **subdivision** (e.g. quarter/eighth).
- **Beat grid / accent UI** (per-beat strong/normal/off; animated blocks).
- **Tempo name** label (Italian terms from BPM).
- **Trainer mode** (rhythm exercises; streak counter when active).
- Optional **minimal** layout flag in code — main surface focuses on dial + transport; full setlist UI lives on Setlists tab.

**Toggles / feedback**

- COUNT-IN on/off; **screen flash** on beats/subdivisions; **haptics** on supported devices.
- **MIDI** clock/start support; **media session** (OS transport).
- **Daily streak** badge (when applicable).
- **Cloud sync** affordance → modal “Save across devices” + guest upgrade copy.
- **Settings** → full-screen or drawer-style panel: extended metronome options (audio, trainer, display, sync-related copy — consolidate in one scrollable settings body).

---

## Tuner tab

- **Listen** / **Reference tone** (A4 hz selector, e.g. 440).
- **Tuning preset** picker (e.g. guitar standard, chromatic, etc. from a tuning library).
- **Strobe vs classic** display mode.
- **Pitch readout:** frequency, note name, cents sharp/flat vs target string/note.
- **Screen wake lock** while listening or reference on.
- Shared **Web Audio** context with the rest of the app where possible.

---

## Setlists tab

- **Song preset** dropdown: load BPM, meter, subdivision, optional attached **synth snapshot**.
- **Save current as song** (name prompt); **Save synth to song** (links last Synth lab snapshot to selected song).
- **Synth preset file:** Export `.json` / Import `.json` (with hint to open Synth lab if needed).
- **Setlists:** select setlist, **new setlist**, **add current song to setlist**.
- **Performance mode** checkbox (stage setlist advance — disabled until setlist/songs exist).
- Empty-state line when performance mode unusable.
- Optional **guest sync** inline prompt (dismissible).

---

## Practice tab

- **Log session form:** date, exercise name (preset list + custom), last tempo / max tempo, sets, accuracy %, notes; ties to current metronome BPM where useful.
- **Practice log:** filter by exercise; **desktop** sortable table vs **mobile** cards.
- **Filter bar** + optional **filter sheet** preview; inline **PDF preview** toggles for form vs filter context.
- **Custom exercise names** management panel (add/remove; placement in library sections).
- **Practice PDF library** (curated sheets; visibility depends on user email allowlist in app logic).
- Data syncs to user cloud payload when authenticated.

---

## Synth lab tab

- **Embedded** app: top **waveform** scope, layout toggles **piano** / **drums** / **both**.
- **Drum kit:** pad grid, per-pad editor (samples, styles), kit illustration; **FX** block.
- **Synth:** multi-oscillator parts, **filter** dial, **piano synthesis** sub-form, factory **presets**.
- **Settings** bottom sheet (resize/maximize by drag); keyboard + drum trigger behavior.
- On navigate away, snapshot can feed **Metronome** / songs (bridge).

---

## Admin (`/admin`)

- Non-admin → redirect to Metronome.
- **User list** (profiles): pick user → view/edit **`user_data` JSON** (songs, setlists, etc.), practice minutes aggregate if shown.
- **Global status:** maintenance flag, **banner message**, **song-of-the-day** JSON blob — admin tooling form + save.

---

## Auth & account (cross-cutting)

- **AuthGate:** “Sign in required” — Supabase sync explanation; magic link email field; **Continue as guest**; **Open email sign-in** opens drawer.
- **UserAccountDrawer:** **Auth** component — sign-in / sign-up, confirm email, resend, **password reset** request; neon-on-black styling in separate Auth CSS.
- **RecoveryPasswordOverlay** (global): hash-based password recovery flow when present in URL.

---

## Copy hooks for IA

- Setlists subtitle (current): *“Save songs and organize performance setlists.”*
- Practice sits in a rounded bordered **surface** card like Setlists.

---

## Non-UI engineers note

Purpose of this file: **Stitch / design tools** only — not API contracts. Visual redesign should preserve: 5-tab IA, metronome as home, account entry top-left, optional floating HUD on secondary tabs, and admin isolation on `/admin`.
