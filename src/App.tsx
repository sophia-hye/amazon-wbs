import { useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { CategoryView } from './components/CategoryView'
import { categories, totalTaskCount } from './data/wbs'
import { useTaskState } from './hooks/useTaskState'

export default function App() {
  const [selectedId, setSelectedId] = useState<string>('overview')
  const { state, cycleStatus, reset } = useTaskState()

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId),
    [selectedId],
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        categories={categories}
        selectedId={selectedId}
        onSelect={setSelectedId}
        state={state}
        totalCount={totalTaskCount}
      />
      <main className="flex-1 overflow-y-auto">
        {selectedCategory ? (
          <CategoryView
            category={selectedCategory}
            state={state}
            onCycleStatus={cycleStatus}
          />
        ) : (
          <Dashboard
            categories={categories}
            state={state}
            onSelectCategory={setSelectedId}
            onReset={reset}
          />
        )}
      </main>
    </div>
  )
}
