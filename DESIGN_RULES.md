# Metronome App — Design Rules

**Source of truth for colors, radii, motion:** Stitch tokens in `src/index.css` (`--ds-*` on `:root` per `data-visual-layout`) and Tailwind semantic colors in `tailwind.config.js`. The legacy `--bg`, `--text-h`, `--accent`, etc. palette below was **removed** — do not reintroduce parallel variables.

## Typography

- **Body / UI**: `--ds-font-sans` (Inter; Space Grotesk on Synthwave shell).
- **Mono**: `--ds-font-mono` — steppers, admin tables, dense labels.
- **Headings**: `--ds-font-heading`.
- Labels: uppercase + letter-spacing where Stitch mocks specify (`font-label-caps`, `font-meter-label`).

## Palette

Use Tailwind utilities (`bg-background`, `text-on-surface`, `border-hairline`, `text-primary`, …) or raw `--ds-*` in CSS that cannot use Tailwind. Layout-specific values live under `:root`, `:root[data-visual-layout='light']`, `:root[data-visual-layout='synthwave']`.

## Shape & motion

- **Radii**: `--ds-radius-sm` / `--ds-radius-md` / `--ds-radius-lg` (see `index.css`).
- **Easing**: `--ds-motion-ease-out`.
- **Elevation**: `--ds-shadow`.

---

_Legacy reference (obsolete — kept only for archeology):_

## Old palette (removed)

| Token             | Status |
|-------------------|--------|
| `--bg`, `--surface`, `--text`, `--text-h`, `--border`, `--accent*` | Removed — use `--ds-*` / Tailwind semantics |

## Shape

- **Border radius**: ~~`--r-sm`~~ → `--ds-radius-*`

## Layout

- Top accent bar: 3px `linear-gradient(→, #c8440a, transparent)` — always present.
- Viewport: `min-height: 100dvh`, `touch-action: manipulation`.
- Theme: `:root[data-theme='dark']` / `[data-theme='light']` — explicit, not OS preference.
- Radial glow: `rgba(200,68,10,0.06)` at top-center behind hero.

## BPM Hero

- Ghost BPM number: `color: transparent`, `-webkit-text-stroke: 1px rgba(240,237,230,0.055)`, positioned behind real number.
- Real BPM: `clamp(72px, 20vw, 112px)`, `font-weight: 700`, `letter-spacing: -5px`.
- Tempo name (MODERATO, ALLEGRO, etc.) in `--accent` color, `font-size: 10px`, `letter-spacing: 2px`.
- BPM unit: `font-size: 9px`, `letter-spacing: 4px`, muted.

## BPM Slider

- Replaces rotary dial as the primary BPM input on the main view.
- **Log scale**: `t = value/400`, `bpm = 1 * (400/1)^t`.
- CSS: `height: 2px`, square thumb `14×14px` in `--accent`, no border-radius.
- Fill via `background: linear-gradient(→, var(--accent) var(--pct), faint var(--pct))`.
- Rotary dial (`RotaryDial` component) retained for Stage Mode and Settings drawer.

## Beat Accent Blocks

### Concept
Each beat has a column of **3 equal-height blocks** (20px each, 5px gap). The number filled (0–3) represents the accent level. Mute = 0 filled, Soft = 1, Medium/Normal = 2, Accent = 3.

### Block colors (bottom → top)
| Tier | Class         | Unfilled                          | Filled (inactive)              | Filled (active beat)                     |
|------|---------------|-----------------------------------|--------------------------------|------------------------------------------|
| b0   | bottom        | `rgba(240,237,230,0.07)`          | `rgba(240,237,230,0.32)`       | `rgba(240,237,230,0.70)` + soft glow     |
| b1   | middle        | `rgba(240,237,230,0.07)`          | `rgba(210,110,10,0.85)`        | `rgba(230,130,20,1)` + amber glow        |
| b2   | top           | `rgba(240,237,230,0.07)`          | `#c8440a`                      | `#ff5010` + strong orange glow           |

### Accent level → filled count
| Level    | Filled blocks | Short label |
|----------|---------------|-------------|
| MUTE     | 0             | MUTE        |
| ACCENT1  | 1             | SOFT        |
| NORMAL   | 2             | MED         |
| ACCENT3  | 3             | ACCT        |

### Interaction
- Tap column to cycle up: MUTE → SOFT → MED → ACCT → MUTE (calls `met.cycleBeatAccent(idx)`).
- Active beat column triggers `.is-beat-active` class → blocks brighten + `scaleY(1.25)` pop animation.

## Quick Controls

- 3-column grid (`grid-template-columns: 1fr 1fr 1fr`), gap `6px`, padding `20px`.
- Each control is a `<label>` styled as a tile: `background: rgba(240,237,230,0.04)`, `border: 0.5px solid var(--border)`.
- Contains a `<select>` styled flat: no border-radius, monospace, `font-weight: 700`.
- No dropdowns open inline — standard OS select behavior.

## Toggle Pills (header)

- `font-size: 9px`, `letter-spacing: 2px`, `text-transform: uppercase`.
- Inactive: transparent bg, faint border, `color: var(--text)`.
- Active (`input:checked`): `background: var(--accent-bg)`, `border-color: var(--accent-border)`, `color: var(--accent)`.
- Input hidden; label styled to represent state.

## Sticky Action Bar

Three elements in a flex row:
1. **TAP** — flex 1, `height: 54px`, transparent bg, 0.5px border. Calls `handleTap()`.
2. **FAB (PLAY/PAUSE)** — `width: 88px`, `height: 54px`, no border-radius. Background `var(--accent)` when idle; transparent + border `var(--accent)` when playing. Text: PLAY / PAUSE / CANCEL.
   - Playing state: `animation: fabPulse` (box-shadow pulse with orange glow).
3. **⚙** — `54×54px`, transparent, 0.5px border. Opens settings drawer.

## Settings Drawer

- Slides up from bottom, `max-height: min(78vh, 720px)`.
- Handle: `48×3px`, `background: rgba(240,237,230,0.15)`.
- Section titles: `9px`, `letter-spacing: 2px`, uppercase, muted.
- Sections: `border: 0.5px solid var(--border)`, flat background.
- Beat accent block UI also appears here (same component).

## Animations

- `--ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` — used on beat block pop.
- Beat pop: `scaleY(1.25) → scaleY(1)` over `0.1s`.
- FAB pulse: `box-shadow` keyframe, `1.4s ease-in-out infinite`.
- Flash overlay: `opacity 50ms linear` (CSS transition, not animation).
- Ripple (dial): `scale(0.6) → scale(7)`, `opacity: 0.8 → 0`, `520ms ease-out`.

## Canvas animation modes (pendulum / ring)

Unchanged from v1. Accent color updated to `rgba(200, 68, 10, 1)` / `rgba(210, 80, 10, 1)` for dark/light.

## What is intentionally removed vs v1

| v1 element          | v3 replacement                         |
|---------------------|----------------------------------------|
| Rotary dial (main)  | Horizontal log-scale slider            |
| `BeatBlocksJuicy` motion.div | Plain divs + CSS animation    |
| Rounded corners everywhere | Sharp/minimal radius           |
| Amber `#fbbf24` accent | Orange `#c8440a` accent             |
| Inter/Instrument Serif | Space Mono throughout              |
| Single large FAB    | TAP + FAB + ⚙ row                     |
| Inline accent buttons (numbers/×) | Stacked 3-block columns  |
