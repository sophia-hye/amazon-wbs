import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * `doneMap` is `{ [taskId]: true }` for completed tasks.
 * Backed by the `task_done` table (only `done = true` rows are stored).
 */
export function useSupabaseDoneMap() {
  const [doneMap, setLocalMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const prevRef = useRef({})
  const initialized = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('task_done').select('task_id, done')
        if (cancelled) return
        if (error) throw error
        const map = {}
        ;(data || []).forEach((r) => { if (r.done) map[r.task_id] = true })
        prevRef.current = map
        setLocalMap(map)
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
    const newlyDone = Object.keys(doneMap).filter((id) => doneMap[id] && !prev[id])
    const newlyUndone = Object.keys(prev).filter((id) => prev[id] && !doneMap[id])
    if (!newlyDone.length && !newlyUndone.length) return
    prevRef.current = { ...doneMap }

    ;(async () => {
      try {
        if (newlyUndone.length) {
          const { error } = await supabase.from('task_done').delete().in('task_id', newlyUndone)
          if (error) throw error
        }
        if (newlyDone.length) {
          const payload = newlyDone.map((task_id) => ({ task_id, done: true }))
          const { error } = await supabase.from('task_done').upsert(payload, { onConflict: 'task_id' })
          if (error) throw error
        }
      } catch (e) {
        console.error('[useSupabaseDoneMap] sync failed', e)
        setError(e)
      }
    })()
  }, [doneMap])

  const setDoneMap = useCallback((next) => {
    setLocalMap((cur) => (typeof next === 'function' ? next(cur) : next))
  }, [])

  return [doneMap, setDoneMap, { loading, error }]
}
