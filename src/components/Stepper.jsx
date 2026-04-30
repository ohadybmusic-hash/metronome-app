import './Stepper.css'
import { clampNumber } from '../lib/clamp.js'

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  format = (v) => String(v),
  disabled = false,
}) {
  const v = Number(value)
  const safe = Number.isFinite(v) ? v : 0

  const dec = () => onChange(clampNumber(safe - step, min, max))
  const inc = () => onChange(clampNumber(safe + step, min, max))

  return (
    <div className={`stepper ${disabled ? 'stepper--disabled' : ''}`}>
      <button type="button" className="stepper__btn" onClick={dec} disabled={disabled || safe <= min} aria-label="Decrease">
        −
      </button>
      <div className="stepper__value" aria-label="Value">
        {format(safe)}
      </div>
      <button type="button" className="stepper__btn" onClick={inc} disabled={disabled || safe >= max} aria-label="Increase">
        +
      </button>
    </div>
  )
}

