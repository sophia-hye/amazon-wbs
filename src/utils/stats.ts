import type { Category, TaskStateMap } from '../types'

export interface Stats {
  total: number
  done: number
  inProgress: number
  todo: number
  pct: number
}

export function computeCategoryStats(cat: Category, state: TaskStateMap): Stats {
  let total = 0
  let done = 0
  let inProgress = 0
  for (const sc of cat.subCategories) {
    for (const t of sc.tasks) {
      total += 1
      const s = state[t.id] ?? 'todo'
      if (s === 'done') done += 1
      else if (s === 'in-progress') inProgress += 1
    }
  }
  const todo = total - done - inProgress
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, inProgress, todo, pct }
}

export function computeOverallStats(categories: Category[], state: TaskStateMap): Stats {
  let total = 0
  let done = 0
  let inProgress = 0
  for (const c of categories) {
    const s = computeCategoryStats(c, state)
    total += s.total
    done += s.done
    inProgress += s.inProgress
  }
  const todo = total - done - inProgress
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, inProgress, todo, pct }
}
