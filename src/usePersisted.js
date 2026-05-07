import { useEffect, useState } from 'react'

const PREFIX = 'amazon-wbs:'

export function usePersistedState(key, defaultValue) {
  const fullKey = PREFIX + key
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(fullKey)
      if (raw === null) return defaultValue
      return JSON.parse(raw)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value))
    } catch {
      // ignore quota / serialization errors
    }
  }, [fullKey, value])

  return [value, setValue]
}

export function clearAllPersisted() {
  if (typeof window === 'undefined') return
  try {
    const keys = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

// Today's date in ISO (YYYY-MM-DD) using local timezone
export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
