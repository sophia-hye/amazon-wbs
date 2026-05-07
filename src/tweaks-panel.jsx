import { useCallback, useEffect, useState } from 'react'
import { ISettings, IClose } from './icons.jsx'

const STORAGE_KEY = 'amazon-wbs:tweaks:v1'

function loadStored() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useTweaks(defaults) {
  const [state, setState] = useState(() => ({ ...defaults, ...(loadStored() || {}) }))

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  const setTweak = useCallback((key, value) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  return [state, setTweak]
}

export function TweaksPanel({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="tweaks-toggle"
        title={open ? '설정 닫기' : '설정 열기'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IClose size={16} /> : <ISettings size={16} />}
      </button>
      {open && (
        <div className="tweaks-panel" role="dialog" aria-label="환경 설정">
          {children}
        </div>
      )}
    </>
  )
}

export function TweakSection({ label }) {
  return <div className="tweaks-section">{label}</div>
}

export function TweakToggle({ label, value, onChange }) {
  return (
    <div className="tweaks-row">
      <span className="label">{label}</span>
      <button
        className={'toggle' + (value ? ' on' : '')}
        aria-pressed={value}
        onClick={() => onChange(!value)}
      >
        <span className="knob" />
      </button>
    </div>
  )
}

export function TweakColor({ label, value, options, onChange }) {
  return (
    <div className="tweaks-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
      <span className="label">{label}</span>
      <div className="color-row">
        {options.map((c) => (
          <button
            key={c}
            className={'color-swatch' + (c === value ? ' active' : '')}
            style={{ background: c }}
            title={c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  )
}

export function TweakRadio({ label, value, options, onChange }) {
  return (
    <div className="tweaks-row">
      <span className="label">{label}</span>
      <div className="radio-row">
        {options.map((opt) => (
          <button
            key={opt}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TweakSlider({ label, value, min, max, step, onChange }) {
  return (
    <div className="slider-row">
      <div className="head">
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-tertiary)' }}>
          {Number(value).toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}
