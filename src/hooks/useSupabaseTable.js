import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/**
 * Generic Supabase array hook.
 *
 *   const [rows, setRows, { loading, error }] = useSupabaseTable('skus', { idField: 'sku' })
 *
 * `setRows(next)` accepts the new array (or an updater function) just like
 * `useState`.  We compute the diff against the previously rendered rows and
 * push inserts/updates/deletes to Supabase asynchronously.
 *
 * The mapper options let you translate between the React shape and the DB
 * column shape:
 *   - `toRow(item)`  → returns the object inserted/upserted into Supabase
 *   - `fromRow(row)` → returns the object exposed to React state
 */
export function useSupabaseTable(table, options = {}) {
  const {
    idField = 'id',
    select = '*',
    orderBy = null,           // { column: 'created_at', ascending: false }
    toRow = (x) => x,
    fromRow = (x) => x,
  } = options

  const [rows, setLocalRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const prevRef = useRef([])
  const initialized = useRef(false)

  // ---- initial load ----
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError(new Error('Supabase가 설정되지 않았습니다.'))
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        let q = supabase.from(table).select(select)
        if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending !== false })
        const { data, error } = await q
        if (cancelled) return
        if (error) throw error
        const mapped = (data || []).map(fromRow)
        prevRef.current = mapped
        setLocalRows(mapped)
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

  // ---- sync changes ----
  useEffect(() => {
    if (!isSupabaseConfigured || !initialized.current) return
    const prev = prevRef.current
    if (prev === rows) return // no-op (e.g. initial load assignment)

    const prevById = new Map(prev.map((r) => [r[idField], r]))
    const currById = new Map(rows.map((r) => [r[idField], r]))

    const inserted = rows.filter((r) => !prevById.has(r[idField]))
    const deleted = prev.filter((r) => !currById.has(r[idField]))
    const updated = rows.filter((r) => {
      const old = prevById.get(r[idField])
      if (!old) return false
      return JSON.stringify(old) !== JSON.stringify(r)
    })

    prevRef.current = rows

    if (!inserted.length && !deleted.length && !updated.length) return

    ;(async () => {
      try {
        if (deleted.length) {
          const ids = deleted.map((r) => r[idField])
          const { error } = await supabase.from(table).delete().in(idField, ids)
          if (error) throw error
        }
        if (inserted.length) {
          const payload = inserted.map(toRow)
          const { error } = await supabase.from(table).insert(payload)
          if (error) throw error
        }
        if (updated.length) {
          const payload = updated.map(toRow)
          const { error } = await supabase.from(table).upsert(payload, {
            onConflict: idField,
          })
          if (error) throw error
        }
      } catch (e) {
        console.error(`[useSupabaseTable:${table}] sync failed`, e)
        setError(e)
      }
    })()
  }, [rows, idField, table, toRow])

  const setRows = useCallback((next) => {
    setLocalRows((cur) => (typeof next === 'function' ? next(cur) : next))
  }, [])

  return [rows, setRows, { loading, error }]
}
