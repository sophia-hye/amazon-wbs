import type { Category, TaskStateMap } from '../types'
import { computeCategoryStats, computeOverallStats } from '../utils/stats'

interface Props {
  categories: Category[]
  state: TaskStateMap
  onSelectCategory: (id: string) => void
  onReset: () => void
}

export function Dashboard({ categories, state, onSelectCategory, onReset }: Props) {
  const overall = computeOverallStats(categories, state)

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Operations Dashboard
          </div>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">아마존 운영관리 WBS</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            상품 등록부터 정산, 분석까지 아마존 셀러 운영 전 영역의 작업 항목을 한 곳에서 관리합니다.
            각 작업 카드를 클릭하면 <strong>대기 → 진행중 → 완료</strong> 상태가 순환됩니다.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('모든 작업 진행 상태를 초기화할까요?')) onReset()
          }}
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          진행 상태 초기화
        </button>
      </div>

      {/* Overall Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <BigStat label="전체 작업" value={overall.total} accent="bg-slate-900" />
        <BigStat label="완료" value={overall.done} accent="bg-emerald-500" />
        <BigStat label="진행중" value={overall.inProgress} accent="bg-blue-500" />
        <BigStat label="진행률" value={`${overall.pct}%`} accent="bg-orange-500" />
      </div>

      {/* Category Cards */}
      <div className="mt-10">
        <h3 className="mb-4 text-sm font-bold text-slate-900">운영 영역별 진행 상황</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const stats = computeCategoryStats(cat, state)
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group relative overflow-hidden rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cat.color}`}
                  aria-hidden
                />
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-2xl shadow-sm`}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{stats.pct}%</span>
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900">{cat.title}</h4>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {cat.subtitle}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{cat.description}</p>
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-500`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      <span className="font-bold text-slate-900">{stats.done}</span> / {stats.total}{' '}
                      완료
                    </span>
                    {stats.inProgress > 0 && (
                      <span className="text-blue-600">진행중 {stats.inProgress}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="mt-10 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-bold text-slate-900">빠른 가이드</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">⏱ 빈도 표시</div>
            <p className="mt-1">매일 / 매주 / 매월 / 분기 / 1회성으로 작업 주기를 분류했습니다.</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">🎯 우선순위</div>
            <p className="mt-1">
              <span className="text-rose-600 font-semibold">높음</span> 매출/Account Health 직접 영향,{' '}
              <span className="text-amber-600 font-semibold">보통</span> 최적화 항목
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">💾 자동 저장</div>
            <p className="mt-1">진행 상태는 브라우저 로컬 스토리지에 자동 저장됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  )
}
