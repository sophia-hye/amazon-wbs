import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Hook for a single-row table (e.g. `profile` with id=1).
 * Reads on mount, writes via debounced upsert.
 */
export function useSupabaseSingleRow(table, where = { id: 1 }, defaults = {}) {
  const [value, setLocalValue] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const initialized = useRef(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        let q = supabase.from(table).select('*')
        Object.entries(where).forEach(([k, v]) => { q = q.eq(k, v) })
        const { data, error } = await q.maybeSingle()
        if (cancelled) return
        if (error) throw error
        if (data) setLocalValue({ ...defaults, ...data })
        initialized.current = true
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  const setValue = useCallback((next) => {
    setLocalValue((cur) => {
      const merged = typeof next === 'function' ? next(cur) : { ...cur, ...next }
      // debounced upsert
      if (isSupabaseConfigured && initialized.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
          try {
            const { error } = await supabase.from(table).upsert({ ...where, ...merged }, {
              onConflict: Object.keys(where).join(','),
            })
            if (error) throw error
          } catch (e) {
            console.error(`[useSupabaseSingleRow:${table}] sync failed`, e)
            setError(e)
          }
        }, 400)
      }
      return merged
    })
  }, [table])

  return [value, setValue, { loading, error }]
}
