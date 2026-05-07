import {
  IDashboard, IWBS, ICalendar, ILog, IWeek, ISKU, IPPC,
  ISidebar, ISearch, ISun, IMoon, IBell,
} from './icons.jsx'
import { DashboardPage, WBSPage, CalendarPage, DailyLogPage } from './pages.jsx'
import { SKUPage, PPCPage } from './sku-ppc.jsx'
import {
  TweaksPanel, TweakSection, TweakToggle, TweakColor, TweakRadio, TweakSlider,
  useTweaks,
} from './tweaks-panel.jsx'
import { usePersistedState, clearAllPersisted } from './usePersisted.js'
import { isSupabaseConfigured, supabase, SUPABASE_SETUP_MESSAGE } from './lib/supabase.js'
import { useSupabaseTable } from './hooks/useSupabaseTable.js'
import { useSupabaseSingleRow } from './hooks/useSupabaseSingleRow.js'
import { useSupabaseWBS } from './hooks/useSupabaseWBS.js'
import { useSupabaseDoneMap } from './hooks/useSupabaseDoneMap.js'
import { useSupabaseWraps } from './hooks/useSupabaseWraps.js'
import { useEffect, useState } from 'react'

const TWEAK_DEFAULTS = {
  dark: false,
  accent: '#007AFF',
  density: 1.3,
  typeScale: 1,
  sidebar: 'expanded',
}

const NAV_DEFS = [
  { id: 'dashboard', label: 'Dashboard',  icon: IDashboard },
  { id: 'wbs',       label: 'WBS',        icon: IWBS },
  { id: 'calendar',  label: 'Calendar',   icon: ICalendar },
  { id: 'log',       label: 'Daily Log',  icon: ILog },
  { id: 'weekly',    label: 'Weekly Log', icon: IWeek },
]
const NAV2_DEFS = [
  { id: 'sku', label: 'SKUs',    icon: ISKU },
  { id: 'ppc', label: 'PPC Ads', icon: IPPC },
]

// ---- Field mappers (module-level → stable references) ----
const logToRow = (l) => ({
  id: l.id,
  date: l.date,
  title: l.title || '',
  weather: l.weather ?? null,
  mood: l.mood ?? null,
  body: l.body || '',
  tags: l.tags || [],
  linked_task_ids: l.linked || [],
  metrics: l.metrics || { sales: 0, orders: 0, acos: 0 },
})
const logFromRow = (r) => ({
  id: r.id,
  date: r.date,
  title: r.title || '',
  weather: r.weather,
  mood: r.mood,
  body: r.body || '',
  tags: r.tags || [],
  linked: r.linked_task_ids || [],
  metrics: r.metrics || { sales: 0, orders: 0, acos: 0 },
})

const eventToRow = (e) => ({
  id: e.id,
  date: e.date,
  title: e.title,
  color: e.color || 'blue',
  linked_task_id: e.linked || null,
})
const eventFromRow = (r) => ({
  id: r.id,
  date: r.date,
  title: r.title,
  color: r.color || 'blue',
  linked: r.linked_task_id,
})

const campaignToRow = (c) => ({
  id: c.id,
  sku: c.sku,
  name: c.name,
  type: c.type,
  targeting: c.targeting,
  status: c.status || 'active',
  start_date: c.startDate || null,
  budget: Number(c.budget) || 0,
  impressions: Number(c.impressions) || 0,
  clicks: Number(c.clicks) || 0,
  spend: Number(c.spend) || 0,
  sales: Number(c.sales) || 0,
  orders: Number(c.orders) || 0,
  bids: c.bids || [],
})
const campaignFromRow = (r) => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  type: r.type,
  targeting: r.targeting,
  status: r.status || 'active',
  startDate: r.start_date || '',
  budget: Number(r.budget) || 0,
  impressions: Number(r.impressions) || 0,
  clicks: Number(r.clicks) || 0,
  spend: Number(r.spend) || 0,
  sales: Number(r.sales) || 0,
  orders: Number(r.orders) || 0,
  bids: r.bids || [],
})

const SKU_TABLE_OPTIONS = { idField: 'sku' }
const LOGS_TABLE_OPTIONS = {
  orderBy: { column: 'date', ascending: false },
  toRow: logToRow,
  fromRow: logFromRow,
}
const EVENTS_TABLE_OPTIONS = {
  orderBy: { column: 'date', ascending: true },
  toRow: eventToRow,
  fromRow: eventFromRow,
}
const CAMPAIGNS_TABLE_OPTIONS = {
  orderBy: { column: 'created_at', ascending: false },
  toRow: campaignToRow,
  fromRow: campaignFromRow,
}
const PROFILE_DEFAULTS = { name: '', role: '', market: 'Amazon US' }

function countAllTasks(wbs) {
  let n = 0
  const walk = (nodes) => nodes.forEach((node) => {
    n += 1
    if (node.children && node.children.length) walk(node.children)
  })
  walk(wbs)
  return n
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [tab, setTab] = usePersistedState('tab', 'dashboard')
  const [expanded, setExpanded] = usePersistedState('wbs:expanded', {})

  // Cloud-persisted state
  const [wbs, setWbs] = useSupabaseWBS()
  const [doneMap, setDoneMap] = useSupabaseDoneMap()
  const [logs, setLogs] = useSupabaseTable('logs', LOGS_TABLE_OPTIONS)
  const [events, setEvents] = useSupabaseTable('events', EVENTS_TABLE_OPTIONS)
  const [skus, setSkus] = useSupabaseTable('skus', SKU_TABLE_OPTIONS)
  const [campaigns, setCampaigns] = useSupabaseTable('campaigns', CAMPAIGNS_TABLE_OPTIONS)
  const [wraps, setWraps] = useSupabaseWraps()
  const [profile, setProfile] = useSupabaseSingleRow('profile', { id: 1 }, PROFILE_DEFAULTS)

  const [warningDismissed, setWarningDismissed] = useState(false)

  // Apply theme + tokens
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.dark ? 'dark' : 'light')
    document.documentElement.style.setProperty('--accent', t.accent)
    document.documentElement.style.setProperty('--density', String(t.density))
    document.documentElement.style.setProperty('--type-scale', String(t.typeScale))
  }, [t.dark, t.accent, t.density, t.typeScale])

  const today = todayKey()
  const wbsCount = countAllTasks(wbs)
  const todayEventCount = events.filter((e) => e.date === today).length

  const NAV = NAV_DEFS.map((n) => {
    if (n.id === 'wbs') return { ...n, badge: wbsCount ? String(wbsCount) : null }
    if (n.id === 'calendar') return { ...n, badge: todayEventCount ? String(todayEventCount) : null }
    return { ...n, badge: null }
  })
  const NAV2 = NAV2_DEFS.map((n) => ({ ...n, badge: null }))

  const navItem = (item) => (
    <button
      key={item.id}
      className="nav-item"
      aria-current={tab === item.id}
      onClick={() => setTab(item.id)}
      title={item.label}
    >
      <span className="icon"><item.icon size={17} /></span>
      <span>{item.label}</span>
      {item.badge && <span className="badge">{item.badge}</span>}
    </button>
  )

  const Page = {
    dashboard: <DashboardPage logs={logs} skus={skus} campaigns={campaigns} events={events}
                              wbs={wbs} doneMap={doneMap} marketLabel={profile.market} />,
    wbs:       <WBSPage wbs={wbs} setWbs={setWbs} expanded={expanded} setExpanded={setExpanded}
                        doneMap={doneMap} setDoneMap={setDoneMap} />,
    calendar:  <CalendarPage events={events} setEvents={setEvents} />,
    log:       <DailyLogPage logs={logs} setLogs={setLogs} wbs={wbs}
                              doneMap={doneMap} setDoneMap={setDoneMap}
                              wraps={wraps} setWraps={setWraps} initialView="daily" />,
    weekly:    <DailyLogPage logs={logs} setLogs={setLogs} wbs={wbs}
                              doneMap={doneMap} setDoneMap={setDoneMap}
                              wraps={wraps} setWraps={setWraps} initialView="weekly" />,
    sku:       <SKUPage skus={skus} setSkus={setSkus} />,
    ppc:       <PPCPage campaigns={campaigns} setCampaigns={setCampaigns} skus={skus} />,
  }[tab]

  const crumb = [...NAV, ...NAV2].find((n) => n.id === tab)?.label || ''
  const initials = (profile.name || '?').trim().slice(0, 1).toUpperCase() || '?'

  const handleResetData = async () => {
    const confirmMsg = isSupabaseConfigured
      ? '데이터베이스의 모든 데이터(WBS, 로그, 일정, SKU, PPC, 위클리, 프로필)와 환경설정을 영구 삭제합니다. 계속할까요?'
      : '환경설정을 초기화합니다. 계속할까요? (Supabase 미설정 상태)'
    if (!confirm(confirmMsg)) return
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.rpc('truncate_all_user_data')
        if (error) {
          console.warn('Supabase RPC truncate_all_user_data 실패:', error)
          alert('DB 초기화 RPC 호출이 실패했습니다. supabase/schema.sql의 truncate_all_user_data 함수가 생성되어 있는지 확인해주세요.\n\n' + error.message)
          return
        }
      } catch (e) {
        console.warn('Reset failed:', e)
        alert('초기화 중 오류가 발생했습니다: ' + (e.message || e))
        return
      }
    }
    clearAllPersisted()
    window.location.reload()
  }

  return (
    <div className="app" data-sidebar={t.sidebar}>
      {!isSupabaseConfigured && !warningDismissed && (
        <div className="env-warning">
          <span>⚠️ {SUPABASE_SETUP_MESSAGE}</span>
          <button className="env-warning-close" onClick={() => setWarningDismissed(true)} aria-label="닫기">×</button>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">A</div>
          <span>Amazon Ops</span>
        </div>
        <div className="sidebar-section">Workspace</div>
        {NAV.map(navItem)}
        <div className="sidebar-section">Catalog</div>
        {NAV2.map(navItem)}
        <div className="sidebar-footer">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <input
              className="profile-input name"
              value={profile.name}
              placeholder="이름"
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <input
              className="profile-input role"
              value={profile.role}
              placeholder="역할 (예: Seller · US)"
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
            />
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="icon-btn"
              title="Sidebar"
              onClick={() =>
                setTweak('sidebar', t.sidebar === 'expanded' ? 'collapsed' : 'expanded')
              }
            >
              <ISidebar size={16} />
            </button>
            <div className="crumbs">
              <span>{profile.market || 'Workspace'}</span>
              <span className="sep">›</span>
              <span className="here">{crumb}</span>
            </div>
          </div>
          <div className="top-bar-right">
            <div className="search">
              <ISearch size={14} />
              <input placeholder="검색 (⌘K)" />
            </div>
            <button
              className="icon-btn"
              title="Theme"
              onClick={() => setTweak('dark', !t.dark)}
            >
              {t.dark ? <ISun size={16} /> : <IMoon size={16} />}
            </button>
            <button className="icon-btn" title="Notifications">
              <IBell size={16} />
            </button>
          </div>
        </header>

        {Page}
      </div>

      <TweaksPanel>
        <TweakSection label="테마" />
        <TweakToggle label="다크 모드" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakColor
          label="포인트 컬러"
          value={t.accent}
          options={['#007AFF', '#FF9500', '#34C759', '#AF52DE', '#FF2D55', '#5856D6']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSection label="레이아웃" />
        <TweakRadio
          label="사이드바"
          value={t.sidebar}
          options={['expanded', 'collapsed']}
          onChange={(v) => setTweak('sidebar', v)}
        />
        <TweakSlider
          label="정보 밀도"
          value={t.density}
          min={0.8}
          max={1.3}
          step={0.05}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakSlider
          label="타이포 크기"
          value={t.typeScale}
          min={0.85}
          max={1.2}
          step={0.05}
          onChange={(v) => setTweak('typeScale', v)}
        />
        <TweakSection label="워크스페이스" />
        <div className="tweaks-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <span className="label">마켓플레이스</span>
          <input
            className="input"
            value={profile.market}
            placeholder="예: Amazon US"
            onChange={(e) => setProfile({ ...profile, market: e.target.value })}
          />
        </div>
        <TweakSection label="데이터" />
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.4 }}>
          {isSupabaseConfigured ? '🟢 Supabase 연결됨' : '🟡 Supabase 미설정 — 변경사항 저장되지 않음'}
        </div>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', color: 'var(--red)' }} onClick={handleResetData}>
          모든 데이터 초기화
        </button>
      </TweaksPanel>
    </div>
  )
}
