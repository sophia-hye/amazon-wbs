import { useCallback, useEffect, useState } from 'react'
import type { Status, TaskStateMap } from '../types'

const STORAGE_KEY = 'amazon-wbs:task-state:v1'

function loadInitial(): TaskStateMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as TaskStateMap) : {}
  } catch {
    return {}
  }
}

export function useTaskState() {
  const [state, setState] = useState<TaskStateMap>(loadInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota/serialization errors
    }
  }, [state])

  const setStatus = useCallback((taskId: string, status: Status) => {
    setState((prev) => ({ ...prev, [taskId]: status }))
  }, [])

  const cycleStatus = useCallback((taskId: string) => {
    setState((prev) => {
      const current = prev[taskId] ?? 'todo'
      const next: Status = current === 'todo' ? 'in-progress' : current === 'in-progress' ? 'done' : 'todo'
      return { ...prev, [taskId]: next }
    })
  }, [])

  const reset = useCallback(() => setState({}), [])

  return { state, setStatus, cycleStatus, reset }
}
