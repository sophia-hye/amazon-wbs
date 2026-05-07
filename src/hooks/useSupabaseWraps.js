import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Weekly wrap-ups, exposed as `{ [weekKey]: { highlights, learnings, nextWeek, aiGenerated } }`
 * to match the previous localStorage shape, but persisted as one row per
 * week_key in `weekly_wraps`.
 */
export function useSupabaseWraps() {
  const [wraps, setLocalWraps] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const prevRef = useRef({})
  const initialized = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('weekly_wraps').select('*')
        if (cancelled) return
        if (error) throw error
        const obj = {}
        ;(data || []).forEach((r) => {
          obj[r.week_key] = {
            highlights: r.highlights || '',
            learnings: r.learnings || '',
            nextWeek: r.next_week || '',
            aiGenerated: !!r.ai_generated,
          }
        })
        prevRef.current = obj
        setLocalWraps(obj)
        initialized.current = true
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !initialized.current) return
    const prev = prevRef.current
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(wraps)])
    const upsert = []
    const remove = []
    for (const k of allKeys) {
      const oldV = prev[k]
      const newV = wraps[k]
      if (newV && (!oldV || JSON.stringify(oldV) !== JSON.stringify(newV))) {
        upsert.push({
          week_key: k,
          highlights: newV.highlights || '',
          learnings: newV.learnings || '',
          next_week: newV.nextWeek || '',
          ai_generated: !!newV.aiGenerated,
        })
      } else if (!newV && oldV) {
        remove.push(k)
      }
    }
    if (!upsert.length && !remove.length) return
    prevRef.current = JSON.parse(JSON.stringify(wraps))

    ;(async () => {
      try {
        if (remove.length) {
          const { error } = await supabase.from('weekly_wraps').delete().in('week_key', remove)
          if (error) throw error
        }
        if (upsert.length) {
          const { error } = await supabase.from('weekly_wraps').upsert(upsert, { onConflict: 'week_key' })
          if (error) throw error
        }
      } catch (e) {
        console.error('[useSupabaseWraps] sync failed', e)
        setError(e)
      }
    })()
  }, [wraps])

  const setWraps = useCallback((next) => {
    setLocalWraps((cur) => (typeof next === 'function' ? next(cur) : next))
  }, [])

  return [wraps, setWraps, { loading, error }]
}
