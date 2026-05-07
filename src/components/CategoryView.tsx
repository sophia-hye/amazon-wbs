import type { Category, TaskStateMap } from '../types'
import { computeCategoryStats } from '../utils/stats'
import { ProgressBar } from './ProgressBar'
import { TaskCard } from './TaskCard'

interface Props {
  category: Category
  state: TaskStateMap
  onCycleStatus: (taskId: string) => void
}

export function CategoryView({ category, state, onCycleStatus }: Props) {
  const stats = computeCategoryStats(category, state)

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${category.color} p-8 text-white shadow-lg`}
      >
        <div className="absolute -right-12 -top-12 text-[180px] opacity-15 select-none">
          {category.icon}
        </div>
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
            {category.subtitle}
          </div>
          <h2 className="mt-1 text-3xl font-bold">{category.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/90">{category.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="전체 작업" value={stats.total} />
            <Stat label="완료" value={stats.done} />
            <Stat label="진행중" value={stats.inProgress} />
            <Stat label="진행률" value={`${stats.pct}%`} />
          </div>

          <div className="mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {category.subCategories.map((sub) => {
          const subDone = sub.tasks.filter((t) => state[t.id] === 'done').length
          return (
            <section key={sub.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {sub.title}
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    ({sub.tasks.length}개 작업)
                  </span>
                </h3>
                <div className="w-40">
                  <ProgressBar
                    value={subDone}
                    total={sub.tasks.length}
                    color="bg-slate-900"
                    showLabel={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {sub.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    status={state[task.id] ?? 'todo'}
                    onCycle={() => onCycleStatus(task.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/15 px-4 py-3 backdrop-blur-sm">
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/80">{label}</div>
      <div className="mt-0.5 text-2xl font-bold">{value}</div>
    </div>
  )
}
