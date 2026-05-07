import type { Category, TaskStateMap } from '../types'
import { computeCategoryStats } from '../utils/stats'

interface Props {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  state: TaskStateMap
  totalCount: number
}

export function Sidebar({ categories, selectedId, onSelect, state, totalCount }: Props) {
  const doneCount = Object.values(state).filter((s) => s === 'done').length
  const overallPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm">
            <span className="text-lg font-bold">A</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Amazon Ops WBS</h1>
            <p className="text-xs text-slate-500">이커머스 운영관리 체크리스트</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs text-slate-500">
            <span>전체 진행률</span>
            <span className="text-sm font-bold text-slate-900">{overallPct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {doneCount} / {totalCount} 작업 완료
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <button
          onClick={() => onSelect('overview')}
          className={`group mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
            selectedId === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="font-semibold">대시보드</span>
        </button>

        <div className="mt-4 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          운영 영역
        </div>
        {categories.map((cat) => {
          const stats = computeCategoryStats(cat, state)
          const isActive = selectedId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`group mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 overflow-hidden">
                <div className="truncate font-semibold">{cat.title}</div>
                <div
                  className={`truncate text-[11px] ${
                    isActive ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {stats.done} / {stats.total} · {stats.pct}%
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 px-6 py-4 text-[11px] text-slate-400">
        <p>로컬 브라우저에 진행 상태가 저장됩니다.</p>
      </div>
    </aside>
  )
}
