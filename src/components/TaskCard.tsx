import type { Status, Task } from '../types'

interface Props {
  task: Task
  status: Status
  onCycle: () => void
}

const priorityStyles: Record<Task['priority'], string> = {
  high: 'bg-rose-100 text-rose-700 ring-rose-200',
  medium: 'bg-amber-100 text-amber-700 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const priorityLabel: Record<Task['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const frequencyLabel: Record<Task['frequency'], string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  quarterly: '분기',
  once: '1회성',
}

const statusStyles: Record<Status, { ring: string; bg: string; label: string; dot: string }> = {
  todo: {
    ring: 'ring-slate-200',
    bg: 'bg-white',
    label: '대기',
    dot: 'bg-slate-300',
  },
  'in-progress': {
    ring: 'ring-blue-300',
    bg: 'bg-blue-50/70',
    label: '진행중',
    dot: 'bg-blue-500 animate-pulse',
  },
  done: {
    ring: 'ring-emerald-300',
    bg: 'bg-emerald-50/60',
    label: '완료',
    dot: 'bg-emerald-500',
  },
}

export function TaskCard({ task, status, onCycle }: Props) {
  const sStyle = statusStyles[status]
  return (
    <div
      className={`group rounded-xl p-4 ring-1 transition-all hover:shadow-md ${sStyle.ring} ${sStyle.bg}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onCycle}
          aria-label="상태 변경"
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 transition-colors ${
            status === 'done'
              ? 'bg-emerald-500 ring-emerald-500'
              : status === 'in-progress'
                ? 'bg-white ring-blue-500'
                : 'bg-white ring-slate-300 hover:ring-slate-500'
          }`}
        >
          {status === 'done' && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className="h-3.5 w-3.5 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {status === 'in-progress' && <span className="h-2 w-2 rounded-full bg-blue-500" />}
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold leading-snug ${
                status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${priorityStyles[task.priority]}`}
              >
                {priorityLabel[task.priority]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {frequencyLabel[task.frequency]}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{task.description}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            {task.estimate && (
              <span className="inline-flex items-center gap-1">
                <span>⏱</span>
                <span>{task.estimate}</span>
              </span>
            )}
            {task.tools && task.tools.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span>🛠</span>
                <span>{task.tools.join(', ')}</span>
              </span>
            )}
            {task.deliverable && (
              <span className="inline-flex items-center gap-1">
                <span>📄</span>
                <span>{task.deliverable}</span>
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${sStyle.dot}`} />
              <span className="font-semibold text-slate-600">{sStyle.label}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
