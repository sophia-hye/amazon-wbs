interface Props {
  value: number
  total: number
  color?: string
  showLabel?: boolean
}

export function ProgressBar({ value, total, color = 'bg-slate-900', showLabel = true }: Props) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>
            {value} / {total} 완료
          </span>
          <span className="font-semibold text-slate-700">{pct}%</span>
        </div>
      )}
    </div>
  )
}
