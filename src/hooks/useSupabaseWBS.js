import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

// ---------- tree <-> flat ----------
function flatten(tree, parentId = null) {
  const out = []
  tree.forEach((node, i) => {
    out.push({
      id: node.id,
      parent_id: parentId,
      title: node.title,
      owner: node.owner ?? '',
      start_date: node.start || null,
      end_date: node.end || null,
      status: node.status || 'todo',
      position: i,
    })
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flatten(node.children, node.id))
    }
  })
  return out
}

function buildTree(rows) {
  const byId = new Map()
  rows.forEach((r) => {
    byId.set(r.id, {
      id: r.id,
      parent: r.parent_id,
      title: r.title,
      owner: r.owner ?? '',
      start: r.start_date || '',
      end: r.end_date || '',
      status: r.status || 'todo',
      children: [],
    })
  })
  const roots = []
  rows
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .forEach((r) => {
      const node = byId.get(r.id)
      if (r.parent_id && byId.has(r.parent_id)) {
        byId.get(r.parent_id).children.push(node)
      } else {
        roots.push(node)
      }
    })
  return roots
}

function diffFlat(oldRows, newRows) {
  const oldById = new Map(oldRows.map((r) => [r.id, r]))
  const newById = new Map(newRows.map((r) => [r.id, r]))
  const inserted = newRows.filter((r) => !oldById.has(r.id))
  const deleted = oldRows.filter((r) => !newById.has(r.id))
  const updated = newRows.filter((r) => {
    const o = oldById.get(r.id)
    if (!o) return false
    return JSON.stringify(o) !== JSON.stringify(r)
  })
  return { inserted, deleted, updated }
}

/**
 * useSupabaseWBS – mirrors the existing `[wbs, setWbs]` API but persists
 * the tree as flat rows in `wbs_tasks`.
 */
export function useSupabaseWBS() {
  const [tree, setLocalTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const flatRef = useRef([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('wbs_tasks').select('*')
        if (cancelled) return
        if (error) throw error
        const rows = data || []
        flatRef.current = rows.map((r) => ({
          id: r.id,
          parent_id: r.parent_id,
          title: r.title,
          owner: r.owner ?? '',
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          status: r.status || 'todo',
          position: r.position ?? 0,
        }))
        setLocalTree(buildTree(rows))
        initialized.current = true
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Sync on tree change
  useEffect(() => {
    if (!isSupabaseConfigured || !initialized.current) return
    const newFlat = flatten(tree)
    const oldFlat = flatRef.current
    const { inserted, deleted, updated } = diffFlat(oldFlat, newFlat)
    if (!inserted.length && !deleted.length && !updated.length) return

    flatRef.current = newFlat

    ;(async () => {
      try {
        if (deleted.length) {
          const ids = deleted.map((r) => r.id)
          const { error } = await supabase.from('wbs_tasks').delete().in('id', ids)
          if (error) throw error
        }
        if (inserted.length) {
          const { error } = await supabase.from('wbs_tasks').insert(inserted)
          if (error) throw error
        }
        if (updated.length) {
          const { error } = await supabase.from('wbs_tasks').upsert(updated, { onConflict: 'id' })
          if (error) throw error
        }
      } catch (e) {
        console.error('[useSupabaseWBS] sync failed', e)
        setError(e)
      }
    })()
  }, [tree])

  const setTree = useCallback((next) => {
    setLocalTree((cur) => (typeof next === 'function' ? next(cur) : next))
  }, [])

  return [tree, setTree, { loading, error }]
}
