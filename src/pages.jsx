// Pages: Dashboard, WBS, Calendar, Daily Log
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  IFilter, IPlus, IChev, IChevD, IChevL, IChevR, ICheck,
  IDollar, ICart, ITrend, ILog, ISales,
} from './icons.jsx'
import { todayISO } from './usePersisted.js'

// ---- Helpers ----
const fmtMoney = (n) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtNum = (n) => n.toLocaleString("en-US");

const todayDate = () => new Date()
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const daysBetween = (a, b) => Math.round((b - a) / 86400000)
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const Sparkline = ({ data, color = "var(--accent)", height = 36 }) => {
  if (!data || data.length < 2) return <div style={{ height }} />
  const w = 200, h = height, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = path + ` L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h}Z`;
  const gradId = "grad-" + color.replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, color }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

const AreaChart = ({ data, color = "var(--accent)", labels }) => {
  const w = 600, h = 200, padL = 36, padR = 8, padT = 12, padB = 24;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const pts = data.map((v, i) => {
    const x = padL + (i / (data.length - 1)) * innerW;
    const y = padT + (1 - (v - min) / span) * innerH;
    return [x, y];
  });
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = path + ` L${pts[pts.length - 1][0].toFixed(1)} ${h - padB} L${pts[0][0].toFixed(1)} ${h - padB}Z`;
  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 240 }}>
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padT + (i / yTicks) * innerH;
        const v = max - (i / yTicks) * span;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--separator)" strokeWidth="0.5" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--fg-tertiary)" fontFamily="var(--font-ui)">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#chart-area)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {pts.map(([x, y], i) => i === pts.length - 1 ? (
        <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="var(--bg-elev)" strokeWidth="2" />
      ) : null)}
      {labels && labels.map((l, i) => {
        if (i % 2) return null;
        const x = padL + (i / (data.length - 1)) * innerW;
        return <text key={i} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--fg-tertiary)" fontFamily="var(--font-ui)">{l}</text>;
      })}
    </svg>
  );
};

// ---- WBS tree helpers ----
const flattenWBS = (nodes, depth = 0, expanded, out = []) => {
  nodes.forEach(n => {
    out.push({ ...n, depth, hasChildren: !!(n.children && n.children.length) });
    if (n.children && expanded[n.id]) flattenWBS(n.children, depth + 1, expanded, out);
  });
  return out;
};
const findInWBS = (nodes, id) => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const r = findInWBS(n.children, id); if (r) return r; }
  }
  return null;
};
const computeProgress = (node, doneMap) => {
  if (!node.children || !node.children.length) return doneMap[node.id] ? 100 : (node.status === "done" ? 100 : node.status === "doing" ? 40 : 0);
  const ps = node.children.map(c => computeProgress(c, doneMap));
  return Math.round(ps.reduce((a,b)=>a+b,0) / ps.length);
};
const collectLeaves = (nodes, out = []) => {
  nodes.forEach(n => {
    if (!n.children || !n.children.length) out.push(n)
    else collectLeaves(n.children, out)
  })
  return out
}

// ===== DASHBOARD =====
export function DashboardPage({ skus, campaigns, events, wbs, doneMap, marketLabel }) {
  // 14-day rolling labels ending today
  const labels = useMemo(() => {
    const today = todayDate();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (13 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
  }, []);
  const [chartSku, setChartSku] = useState("__total");

  // KPI roll-up
  const totals = useMemo(() => {
    const sales = skus.reduce((a, s) => a + (s.sales || 0), 0);
    const orders = skus.reduce((a, s) => a + (s.units || 0), 0);
    const adSpend = campaigns.reduce((a, c) => a + (c.spend || 0), 0);
    const adSales = campaigns.reduce((a, c) => a + (c.sales || 0), 0);
    const tacos = sales ? (adSpend / sales) * 100 : 0;
    const troas = adSpend ? (sales / adSpend) : 0;
    return { sales, orders, adSpend, adSales, tacos, troas };
  }, [skus, campaigns]);

  // Deterministic per-SKU 14-day series (smoothly varying around the SKU's daily-avg)
  const skuSeries = useMemo(() => {
    const map = {};
    skus.forEach((s, idx) => {
      const daily = (s.sales || 0) / 14;
      const seed = (s.sku.charCodeAt(0) + idx * 17);
      const arr = labels.map((_, i) => {
        const wave = Math.sin((i + seed * 0.13) * 0.5) * 0.18;
        const noise = Math.sin((i * 13 + seed) * 1.7) * 0.08;
        return Math.max(0, daily * (1 + wave + noise));
      });
      map[s.sku] = arr;
    });
    map.__total = labels.map((_, i) => skus.reduce((a, s) => a + (map[s.sku][i] || 0), 0));
    return map;
  }, [skus, labels]);

  const activeSeries = skuSeries[chartSku] || skuSeries.__total || [];
  const activeSku = chartSku === "__total" ? null : skus.find(s => s.sku === chartSku);
  const seriesTotal = activeSeries.reduce((a, b) => a + b, 0);

  // Weekly progress = leaf-task done ratio
  const leafProgress = useMemo(() => {
    const leaves = collectLeaves(wbs)
    if (!leaves.length) return { total: 0, done: 0, pct: 0 }
    const done = leaves.filter(l => doneMap[l.id] || l.status === 'done').length
    return { total: leaves.length, done, pct: Math.round(done / leaves.length * 100) }
  }, [wbs, doneMap])

  // Today + upcoming events (max 4)
  const today = todayISO()
  const upcoming = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const subtitleDate = todayDate().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const isEmpty = skus.length === 0 && campaigns.length === 0 && wbs.length === 0 && events.length === 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{marketLabel || 'Workspace'} · {subtitleDate}</p>
        </div>
        <div className="page-actions">
          <div className="segmented">
            <button aria-pressed="false">Today</button>
            <button aria-pressed="true">14D</button>
            <button aria-pressed="false">30D</button>
            <button aria-pressed="false">90D</button>
          </div>
          <button className="btn"><IFilter size={14}/><span>Filter</span></button>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state" style={{ padding: '80px 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>아직 데이터가 없습니다</div>
          <div style={{ fontSize: 13, color: 'var(--fg-tertiary)' }}>
            좌측 메뉴에서 <strong>SKU</strong>를 등록하거나 <strong>WBS</strong>에 프로젝트를 추가해 시작하세요.
          </div>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label"><span className="ic"><IDollar size={14}/></span><span>Total Sales</span></div>
              <div className="kpi-value">{fmtMoney(totals.sales)}</div>
              <div className="kpi-meta">
                <span>{skus.length}개 SKU 합계</span>
              </div>
              {totals.sales > 0 && (
                <div className="kpi-spark"><Sparkline data={skuSeries.__total || []} color="#34C759"/></div>
              )}
            </div>
            <div className="kpi">
              <div className="kpi-label"><span className="ic" style={{background:"rgba(175,82,222,.12)",color:"var(--purple)"}}><ICart size={14}/></span><span>Total Orders</span></div>
              <div className="kpi-value">{fmtNum(totals.orders)}</div>
              <div className="kpi-meta">
                <span>판매 단위 수 · units</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><span className="ic" style={{background:"rgba(255,149,0,.12)",color:"var(--orange)"}}><ITrend size={14}/></span><span>TACoS</span></div>
              <div className="kpi-value">{totals.tacos.toFixed(1)}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>%</span></div>
              <div className="kpi-meta">
                <span>광고비 {fmtMoney(totals.adSpend)} ÷ 총매출</span>
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><span className="ic"><ITrend size={14}/></span><span>TRoAS</span></div>
              <div className="kpi-value">{totals.troas.toFixed(2)}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>x</span></div>
              <div className="kpi-meta">
                <span>총매출 ÷ 광고비</span>
              </div>
            </div>
          </div>

          <div className="row row-2">
            <div className="card">
              <div className="section-title">
                <h2>매출 추이</h2>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <select className="input chart-sku-select"
                          value={chartSku}
                          onChange={(e)=>setChartSku(e.target.value)}>
                    <option value="__total">Total · 전체 SKU 합계</option>
                    {skus.map(s => (
                      <option key={s.sku} value={s.sku}>{s.sku} · {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {skus.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 0 }}>
                  SKU가 등록되면 14일 매출 추이가 표시됩니다.
                </div>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"baseline",gap:12,margin:"4px 2px 6px"}}>
                    <div style={{fontSize:22,fontWeight:600,letterSpacing:"-0.02em"}}>
                      {fmtMoney(seriesTotal)}
                    </div>
                    <div style={{fontSize:12,color:"var(--fg-tertiary)"}}>
                      {activeSku ? `${activeSku.sku} · 14일 합계` : "전체 SKU · 14일 합계"}
                    </div>
                  </div>
                  <AreaChart data={activeSeries} labels={labels} color={chartSku === "__total" ? "var(--accent)" : "#34C759"}/>
                </>
              )}
            </div>
            <div className="card">
              <div className="section-title">
                <h2>다가오는 일정</h2>
                {upcoming.length > 0 && <span className="pill blue">{upcoming.length}</span>}
              </div>
              {upcoming.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)', padding: '20px 0' }}>
                  Calendar 페이지에서 일정을 추가하세요.
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {upcoming.map((e, i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"var(--bg)",borderRadius:8,border:"0.5px solid var(--border)"}}>
                      <div style={{width:3,height:28,borderRadius:2,background:`var(--${e.color === "blue" ? "accent" : (e.color || "accent")})`}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:"var(--fg)"}}>{e.title}</div>
                        <div style={{fontSize:11.5,color:"var(--fg-tertiary)"}}>{e.date.slice(5).replace("-","/")}</div>
                      </div>
                      <ICheck size={14} style={{color:"var(--fg-quaternary)"}}/>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid var(--separator)"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,color:"var(--fg-secondary)"}}>
                  <span>전체 작업 진행률</span>
                  <span style={{fontWeight:500,color:"var(--fg)"}}>
                    {leafProgress.total ? `${leafProgress.pct}% (${leafProgress.done}/${leafProgress.total})` : '—'}
                  </span>
                </div>
                <div className="bar" style={{marginTop:6}}><i style={{width:`${leafProgress.pct}%`}}/></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title">
              <h2>SKU 퍼포먼스</h2>
              <div className="meta">{skus.length} SKUs · 정렬: 매출순</div>
            </div>
            {skus.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 0 }}>
                좌측 메뉴 <strong>SKUs</strong>에서 첫 SKU를 등록하세요.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>ASIN</th>
                    <th className="num">Units</th>
                    <th className="num">Sales</th>
                    <th className="num">ACoS</th>
                    <th className="num">RoAS</th>
                    <th className="num">Stock</th>
                    <th>BSR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...skus].sort((a,b)=>b.sales-a.sales).map(s => (
                    <tr key={s.sku}>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:12}}>{s.sku}</td>
                      <td>{s.name}</td>
                      <td style={{color:"var(--fg-tertiary)",fontFamily:"var(--font-mono)",fontSize:12}}>{s.asin}</td>
                      <td className="num">{s.units}</td>
                      <td className="num">{fmtMoney(s.sales)}</td>
                      <td className="num">{s.acos}%</td>
                      <td className="num">{s.roas}x</td>
                      <td className="num">
                        <span className={"pill " + (s.status === "critical" ? "red" : s.status === "low" ? "orange" : "gray")}>
                          {s.stock}
                        </span>
                      </td>
                      <td>#{s.bsr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===== WBS =====
const DAY_PX = 28

function addDaysISO(iso, days) {
  if (!iso) return iso
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function updateNodeInTree(tree, id, updater) {
  return tree.map((n) => {
    if (n.id === id) return updater(n)
    if (n.children && n.children.length) return { ...n, children: updateNodeInTree(n.children, id, updater) }
    return n
  })
}

function removeNodeFromTree(tree, id) {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => (n.children && n.children.length ? { ...n, children: removeNodeFromTree(n.children, id) } : n))
}

/**
 * Aggregate effective date range for a node.
 *  - Leaf: returns its own start/end.
 *  - Parent: returns min(start) / max(end) over all descendants. The parent's
 *    own stored dates are ignored visually so that adding a child outside the
 *    parent's range still extends the parent's bar.
 */
function aggregateRange(node) {
  if (!node.children || !node.children.length) {
    return { start: node.start || null, end: node.end || null }
  }
  let minS = null, maxE = null
  for (const c of node.children) {
    const r = aggregateRange(c)
    if (r.start && (!minS || r.start < minS)) minS = r.start
    if (r.end && (!maxE || r.end > maxE)) maxE = r.end
  }
  return { start: minS || node.start || null, end: maxE || node.end || null }
}

function computeGanttRange(wbs) {
  // Always span from current month start to year-end (Dec 31), extending if
  // any task lives outside that window.
  const today = todayDate()
  let earliest = startOfMonth(today)
  let latest = new Date(today.getFullYear(), 11, 31)
  const walk = (nodes) => nodes.forEach((n) => {
    if (n.start) {
      const d = new Date(n.start)
      if (!isNaN(d.getTime()) && d < earliest) earliest = d
    }
    if (n.end) {
      const d = new Date(n.end)
      if (!isNaN(d.getTime()) && d > latest) latest = d
    }
    if (n.children) walk(n.children)
  })
  walk(wbs)
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
  const end = new Date(latest.getFullYear(), latest.getMonth() + 1, 0)
  const days = daysBetween(start, end) + 1
  // Cap at ~2 years to avoid pathological widths
  return { start, days: Math.max(28, Math.min(days, 730)) }
}

export function WBSPage({ wbs, setWbs, expanded, setExpanded, doneMap, setDoneMap }) {
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const dragRef = useRef(null);
  const [, setDragVer] = useState(0);
  const todayCellRef = useRef(null);
  const ganttScrollRef = useRef(null);
  const scrolledOnce = useRef(false);

  const flat = useMemo(() => flattenWBS(wbs, 0, expanded), [wbs, expanded]);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const toggleDone = (id) => setDoneMap(d => ({ ...d, [id]: !d[id] }));

  const openAdd = (parentId) => {
    setAdding(parentId);
    setEditing(null);
    setEditDraft(null);
    setNewTitle("");
    const t = todayISO();
    setNewStart(t);
    setNewEnd(t);
  };
  const closeAdd = () => {
    setAdding(null);
    setNewTitle("");
  };
  const addChild = (parentId) => {
    const title = newTitle.trim();
    if (!title) { closeAdd(); return; }
    const tISO = todayISO();
    const start = newStart || tISO;
    const end = newEnd && newEnd >= start ? newEnd : start;
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `n${Date.now()}`;
    const newNode = { id: newId, title, parent: parentId, owner: "", start, end, status: "todo" };
    const insert = (nodes) => nodes.map(n => {
      if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
      if (n.children) return { ...n, children: insert(n.children) };
      return n;
    });
    if (parentId === null) setWbs([...wbs, { ...newNode, children: [] }]);
    else setWbs(insert(wbs));
    setExpanded(e => ({ ...e, [parentId]: true }));
    closeAdd();
  };

  const openEdit = (node) => {
    setEditing(node.id);
    setAdding(null);
    setEditDraft({
      title: node.title || '',
      owner: node.owner || '',
      start: node.start || todayISO(),
      end: node.end || todayISO(),
      status: node.status || 'todo',
    });
  };
  const cancelEdit = () => { setEditing(null); setEditDraft(null); };
  const saveEdit = () => {
    if (!editDraft || !editing) return;
    const id = editing;
    const draft = editDraft;
    setWbs(prev => updateNodeInTree(prev, id, n => ({
      ...n,
      title: draft.title.trim() || n.title,
      owner: draft.owner,
      start: draft.start,
      end: draft.end && draft.end >= draft.start ? draft.end : draft.start,
      status: draft.status,
    })));
    cancelEdit();
  };
  const deleteNode = (node) => {
    if (!confirm(`"${node.title}" 작업을 삭제할까요? 모든 하위 작업이 함께 삭제됩니다.`)) return;
    setWbs(prev => removeNodeFromTree(prev, node.id));
    if (selected === node.id) setSelected(null);
    if (adding === node.id) closeAdd();
    if (editing === node.id) cancelEdit();
  };

  const startDrag = useCallback((e, mode, node) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(node.id);
    const startX = e.clientX;
    dragRef.current = { id: node.id, mode, dayDelta: 0 };
    setDragVer(v => v + 1);
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const days = Math.round(dx / DAY_PX);
      const cur = dragRef.current;
      if (cur && cur.dayDelta !== days) {
        dragRef.current = { ...cur, dayDelta: days };
        setDragVer(v => v + 1);
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      const cur = dragRef.current;
      if (cur && cur.dayDelta !== 0) {
        const { id, mode: m, dayDelta } = cur;
        setWbs(prev => updateNodeInTree(prev, id, n => {
          let s = n.start, ed = n.end;
          if (m === 'move' || m === 'resize-start') s = addDaysISO(n.start, dayDelta);
          if (m === 'move' || m === 'resize-end') ed = addDaysISO(n.end, dayDelta);
          if (s && ed && s > ed) {
            if (m === 'resize-start') s = ed;
            else if (m === 'resize-end') ed = s;
          }
          return { ...n, start: s, end: ed };
        }));
      }
      dragRef.current = null;
      setDragVer(v => v + 1);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setWbs]);

  const { start: ganttStart, days: ganttDays } = useMemo(() => computeGanttRange(wbs), [wbs])
  const days = useMemo(() => Array.from({ length: ganttDays }, (_, i) => {
    const d = new Date(ganttStart); d.setDate(d.getDate() + i);
    return d;
  }), [ganttStart, ganttDays]);
  const today = todayDate();
  const dateToCol = (dateStr) => {
    const d = new Date(dateStr);
    const diff = daysBetween(ganttStart, d);
    return Math.max(0, Math.min(ganttDays - 1, diff));
  };
  const ganttRows = flat;

  const ganttHeadLabel = (() => {
    const last = new Date(ganttStart); last.setDate(last.getDate() + ganttDays - 1)
    const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
    const a = fmt(ganttStart), b = fmt(last)
    return a === b ? a : `${a} ~ ${b}`
  })()

  // Auto-scroll Gantt to today on first render where today is visible.
  useEffect(() => {
    if (scrolledOnce.current) return
    if (todayCellRef.current && ganttScrollRef.current) {
      todayCellRef.current.scrollIntoView({ inline: 'center', block: 'nearest' })
      scrolledOnce.current = true
    }
  })

  const projectCount = wbs.length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">WBS</h1>
          <p className="page-subtitle">Work Breakdown Structure · {projectCount}개 프로젝트 · {ganttRows.length}개 작업</p>
        </div>
        <div className="page-actions">
          <button className="btn"><IFilter size={14}/><span>Owner</span></button>
          <button className="btn btn-primary" onClick={() => openAdd("__root")}>
            <IPlus size={14}/><span>새 프로젝트</span>
          </button>
        </div>
      </div>

      {wbs.length === 0 && adding !== "__root" && (
        <div className="empty-state">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>등록된 프로젝트가 없습니다</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)', marginBottom: 14 }}>
            첫 프로젝트를 만들어 작업을 단계별로 분해해보세요.
          </div>
          <button className="btn btn-primary" onClick={() => openAdd("__root")}>
            <IPlus size={14}/><span>새 프로젝트</span>
          </button>
        </div>
      )}

      {(wbs.length > 0 || adding === "__root") && (
        <>
          {adding === "__root" && (
            <div className="task-form">
              <input autoFocus placeholder="프로젝트 제목..." value={newTitle}
                     onChange={(e) => setNewTitle(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") addChild(null); if (e.key === "Escape") closeAdd(); }}/>
              <div className="task-form-row">
                <span className="task-form-label">기간</span>
                <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                <span className="task-form-sep">—</span>
                <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
              <div className="task-form-actions">
                <button className="btn" onClick={closeAdd}>취소</button>
                <button className="btn btn-primary" onClick={() => addChild(null)}>추가</button>
              </div>
            </div>
          )}

          {wbs.length > 0 && (
            <div className="gantt" ref={ganttScrollRef}>
              <div className="gantt-grid" style={{ minWidth: Math.max(1000, ganttDays * DAY_PX + 400) }}>
                <div className="gantt-head">
                  <div className="label-th">{ganttHeadLabel}</div>
                  <div className="gantt-days" style={{gridTemplateColumns:`repeat(${ganttDays}, 1fr)`}}>
                    {days.map((d, i) => {
                      const dow = d.getDay();
                      const isToday = sameDay(d, today);
                      return (
                        <div key={i}
                             ref={isToday ? todayCellRef : null}
                             className={"gantt-day" + (isToday ? " today" : "") + (dow === 0 || dow === 6 ? " weekend" : "")}>
                          <span className="num">{d.getDate()}</span>
                          <span>{["일","월","화","수","목","금","토"][dow]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {ganttRows.map(node => {
                  // Parents: aggregate range from descendants. Leaves: own dates.
                  const isParent = node.hasChildren
                  let baseStart = node.start, baseEnd = node.end
                  if (isParent) {
                    const r = aggregateRange(node)
                    baseStart = r.start || node.start
                    baseEnd = r.end || node.end
                  }
                  // Apply drag overlay (visual-only) only on leaves
                  const overlay = !isParent && dragRef.current && dragRef.current.id === node.id ? dragRef.current : null
                  let effStart = baseStart, effEnd = baseEnd
                  if (overlay && overlay.dayDelta !== 0) {
                    if (overlay.mode === 'move' || overlay.mode === 'resize-start') effStart = addDaysISO(baseStart, overlay.dayDelta)
                    if (overlay.mode === 'move' || overlay.mode === 'resize-end') effEnd = addDaysISO(baseEnd, overlay.dayDelta)
                    if (effStart && effEnd && effStart > effEnd) {
                      if (overlay.mode === 'resize-start') effStart = effEnd
                      else if (overlay.mode === 'resize-end') effEnd = effStart
                    }
                  }
                  const start = dateToCol(effStart);
                  const end = dateToCol(effEnd);
                  const span = Math.max(1, end - start + 1);
                  const pct = computeProgress(node, doneMap);
                  const klass = node.hasChildren ? "parent" : (pct === 100 ? "done" : "");
                  const isSelected = selected === node.id;
                  const checked = doneMap[node.id] || node.status === "done";
                  const isEditing = editing === node.id;
                  const isAddingHere = adding === node.id;
                  return (
                    <React.Fragment key={node.id}>
                      <div className="gantt-row" data-selected={isSelected}>
                        <div className={"gantt-name" + (node.hasChildren ? " parent" : "")}
                             style={{ paddingLeft: 10 + node.depth * 14 }}
                             onClick={() => setSelected(node.id)}>
                          {node.hasChildren ? (
                            <span className="gantt-chev"
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}>
                              {expanded[node.id]
                                ? <IChevD size={12} style={{color:"var(--fg-tertiary)"}}/>
                                : <IChev size={12} style={{color:"var(--fg-tertiary)"}}/>}
                            </span>
                          ) : <span style={{width:12,display:"inline-block"}}/>}
                          <button className={"check" + (checked ? " checked" : "")}
                                  onClick={(e) => { e.stopPropagation(); toggleDone(node.id); }}>
                            {checked && <ICheck size={11}/>}
                          </button>
                          <span className="gantt-name-text"
                                style={{textDecoration: checked ? "line-through" : "none", color: checked ? "var(--fg-tertiary)" : "var(--fg)"}}>
                            {node.title}
                            {node.owner && <span className="sub"> · {node.owner}</span>}
                          </span>
                          <div className="gantt-name-progress"><i style={{width:`${pct}%`}}/></div>
                          <span className="gantt-name-pct">{pct}%</span>
                        </div>
                        <div className="gantt-track" style={{gridTemplateColumns:`repeat(${ganttDays}, 1fr)`}}>
                          {days.map((d,i) => {
                            const dow = d.getDay();
                            const isToday = sameDay(d, today);
                            return <div key={i} className={"gantt-cell" + (dow===0||dow===6?" weekend":"") + (isToday?" today":"")}/>;
                          })}
                          <div className={"gantt-bar " + klass + (overlay ? " dragging" : "") + (isParent ? " readonly" : "")}
                               style={{ left: `calc(${(start/ganttDays)*100}% + 2px)`, width: `calc(${(span/ganttDays)*100}% - 4px)` }}
                               onMouseDown={isParent ? undefined : (e) => startDrag(e, 'move', node)}
                               title={isParent ? "하위 작업 일정으로 자동 계산됨" : "드래그: 이동 / 가장자리 드래그: 기간 조정"}>
                            {!isParent && (
                              <span className="bar-handle bar-handle-l"
                                    onMouseDown={(e) => startDrag(e, 'resize-start', node)}/>
                            )}
                            {span > 3 && <span className="bar-label">{node.title}</span>}
                            {!isParent && (
                              <span className="bar-handle bar-handle-r"
                                    onMouseDown={(e) => startDrag(e, 'resize-end', node)}/>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && isEditing && editDraft && (
                        <div className="gantt-add-row-line"
                             style={{ paddingLeft: 22 + node.depth * 14 }}>
                          <div className="task-form" style={{ flex: 1, maxWidth: 560 }}>
                            <input autoFocus placeholder="제목..." value={editDraft.title}
                                   onChange={(e) => setEditDraft(d => ({ ...d, title: e.target.value }))}
                                   onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}/>
                            <input placeholder="담당자 (선택)" value={editDraft.owner}
                                   onChange={(e) => setEditDraft(d => ({ ...d, owner: e.target.value }))}/>
                            <div className="task-form-row">
                              <span className="task-form-label">기간</span>
                              <input type="date" value={editDraft.start}
                                     onChange={(e) => setEditDraft(d => ({ ...d, start: e.target.value }))}/>
                              <span className="task-form-sep">—</span>
                              <input type="date" value={editDraft.end}
                                     onChange={(e) => setEditDraft(d => ({ ...d, end: e.target.value }))}/>
                            </div>
                            <div className="task-form-row">
                              <span className="task-form-label">상태</span>
                              <select value={editDraft.status}
                                      onChange={(e) => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                                <option value="todo">todo</option>
                                <option value="doing">doing</option>
                                <option value="done">done</option>
                              </select>
                            </div>
                            <div className="task-form-actions">
                              <button className="btn" onClick={cancelEdit}>취소</button>
                              <button className="btn btn-primary" onClick={saveEdit}>저장</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isSelected && isAddingHere && (
                        <div className="gantt-add-row-line"
                             style={{ paddingLeft: 22 + node.depth * 14 }}>
                          <div className="task-form" style={{ flex: 1, maxWidth: 560 }}>
                            <input autoFocus placeholder="새 하위 작업..." value={newTitle}
                                   onChange={(e) => setNewTitle(e.target.value)}
                                   onKeyDown={(e) => { if (e.key === "Enter") addChild(node.id); if (e.key === "Escape") closeAdd(); }}/>
                            <div className="task-form-row">
                              <span className="task-form-label">기간</span>
                              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)}/>
                              <span className="task-form-sep">—</span>
                              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}/>
                            </div>
                            <div className="task-form-actions">
                              <button className="btn" onClick={closeAdd}>취소</button>
                              <button className="btn btn-primary" onClick={() => addChild(node.id)}>추가</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isSelected && !isEditing && !isAddingHere && (
                        <div className="gantt-add-row-line"
                             style={{ paddingLeft: 22 + node.depth * 14, gap: 4 }}>
                          <button className="gantt-add-link"
                                  onClick={() => openAdd(node.id)}>
                            <IPlus size={12}/> <span>하위 작업 추가</span>
                          </button>
                          <button className="gantt-add-link"
                                  onClick={() => openEdit(node)}>
                            편집
                          </button>
                          <button className="gantt-add-link danger"
                                  onClick={() => deleteNode(node)}>
                            삭제
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== CALENDAR =====
export function CalendarPage({ events, setEvents, wbs = [] }) {
  const [cursor, setCursor] = useState(() => startOfMonth());
  const [newEventDate, setNewEventDate] = useState(null);
  const [newEventTitle, setNewEventTitle] = useState("");

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();
  const today = todayDate();

  const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  // ── WBS auto-sync: collect leaf tasks with normalized start/end so we can
  //    render them as continuous multi-day bars (Gantt-style) inside the
  //    calendar grid.
  const wbsTasks = useMemo(() => {
    const out = [];
    const walk = (nodes) => nodes.forEach((n) => {
      const isLeaf = !n.children || n.children.length === 0;
      if (isLeaf) {
        if (!n.start) return;
        const startD = new Date(n.start);
        if (isNaN(startD.getTime())) return;
        const start = n.start;
        const end = n.end && n.end >= n.start ? n.end : n.start;
        out.push({ id: n.id, title: n.title, start, end });
      } else if (n.children) walk(n.children);
    });
    walk(wbs);
    // Earliest start first; longer tasks first as tiebreaker so they take
    // lower tracks.
    out.sort((a, b) => {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      const la = a.end, lb = b.end;
      return la === lb ? 0 : la > lb ? -1 : 1;
    });
    return out;
  }, [wbs]);

  // Greedy track assignment: place each task on the lowest track whose last
  // task ends strictly before this task starts.
  const { trackOf, maxTrack } = useMemo(() => {
    const map = {};
    const trackEnd = []; // ISO end-date string per track
    for (const t of wbsTasks) {
      let placed = false;
      for (let i = 0; i < trackEnd.length; i++) {
        if (trackEnd[i] < t.start) {
          trackEnd[i] = t.end;
          map[t.id] = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        trackEnd.push(t.end);
        map[t.id] = trackEnd.length - 1;
      }
    }
    return { trackOf: map, maxTrack: trackEnd.length - 1 };
  }, [wbsTasks]);

  // Pre-compute slot arrays per ISO date so cell rendering is cheap.
  const slotsByDate = useMemo(() => {
    const m = {};
    if (maxTrack < 0) return m;
    for (const t of wbsTasks) {
      const startD = new Date(t.start);
      const endD = new Date(t.end);
      const cur = new Date(startD);
      let safety = 0;
      while (cur <= endD && safety < 400) {
        const key = fmtKey(cur);
        if (!m[key]) m[key] = new Array(maxTrack + 1).fill(null);
        const isStart = key === t.start;
        const isEnd = key === t.end;
        const isSingle = t.start === t.end;
        const pos = isSingle ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'middle';
        const isFirstOfWeek = cur.getDay() === 0; // Sunday — Calendar starts on Sunday
        const showLabel = pos === 'start' || pos === 'single' || isFirstOfWeek;
        m[key][trackOf[t.id]] = { id: t.id, title: t.title, pos, showLabel };
        cur.setDate(cur.getDate() + 1);
        safety += 1;
      }
    }
    return m;
  }, [wbsTasks, trackOf, maxTrack]);

  // Build 6-week grid
  const cells = [];
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: new Date(year, month - 1, prevMonthLast - startDow + 1 + i), other: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), other: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last); next.setDate(next.getDate() + 1);
    cells.push({ date: next, other: next.getMonth() !== month });
    if (cells.length >= 42) break;
  }

  const eventsByDate = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [events]);

  const addEvent = () => {
    if (!newEventTitle.trim()) { setNewEventDate(null); return; }
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `e${Date.now()}`;
    setEvents([...events, { id, date: newEventDate, title: newEventTitle, color: "blue", linked: null }]);
    setNewEventTitle(""); setNewEventDate(null);
  };

  const monthName = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{monthName}</h1>
          <p className="page-subtitle">
            {events.length}개 일정
            {wbsTasks.length > 0 && ` · WBS 작업 ${wbsTasks.length}개 자동 표시`}
          </p>
        </div>
        <div className="page-actions">
          <div className="segmented">
            <button aria-pressed="false">Day</button>
            <button aria-pressed="false">Week</button>
            <button aria-pressed="true">Month</button>
            <button aria-pressed="false">Year</button>
          </div>
          <button className="icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))}><IChevL size={14}/></button>
          <button className="btn" onClick={() => setCursor(startOfMonth())}>Today</button>
          <button className="icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))}><IChevR size={14}/></button>
        </div>
      </div>

      <div className="calendar">
        <div className="cal-header">
          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d,i) => (
            <div key={d} className={"cal-dow" + (i===0?" sun":"")}>{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((c, i) => {
            const key = fmtKey(c.date);
            const dayEvents = eventsByDate[key] || [];
            const slots = slotsByDate[key];
            const isToday = sameDay(c.date, today);
            const isSun = c.date.getDay() === 0;
            return (
              <div key={i}
                   className={"cal-cell" + (c.other?" other":"") + (isToday?" today":"") + (isSun?" sun":"")}
                   onDoubleClick={() => { setNewEventDate(key); setNewEventTitle(""); }}>
                <span className="cal-num">{c.date.getDate()}</span>
                {/* WBS multi-day bars on track-aligned slots */}
                {maxTrack >= 0 && Array.from({ length: maxTrack + 1 }).map((_, t) => {
                  const slot = slots ? slots[t] : null;
                  if (!slot) return <div key={`s-${t}`} className="cal-wbs-bar-placeholder" aria-hidden />;
                  return (
                    <div key={`s-${t}`}
                         className={"cal-wbs-bar " + slot.pos}
                         title={slot.title}>
                      {slot.showLabel ? slot.title : ' '}
                    </div>
                  );
                })}
                {/* Manual events */}
                {dayEvents.slice(0,3).map((e, j) => (
                  <div key={j} className={"cal-event" + (e.color==="blue"?"":` ${e.color}`)} title={e.title}>
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="cal-more">+{dayEvents.length - 3} more</div>}
                {newEventDate === key && (
                  <input autoFocus className="input" style={{fontSize:11,padding:"2px 6px",marginTop:2}}
                         placeholder="새 일정"
                         value={newEventTitle}
                         onChange={(e)=>setNewEventTitle(e.target.value)}
                         onBlur={addEvent}
                         onKeyDown={(e)=>{ if (e.key==="Enter") addEvent(); if (e.key==="Escape") setNewEventDate(null); }}/>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p style={{marginTop:12,fontSize:12,color:"var(--fg-tertiary)"}}>💡 빈 셀을 더블클릭하면 새 일정을 추가할 수 있습니다.</p>
    </div>
  );
}

// ===== Week helpers =====
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr);
  const dow = d.getDay(); // Sunday = 0
  const diff = dow === 0 ? -6 : 1 - dow; // ISO week starts Monday
  d.setDate(d.getDate() + diff);
  // produce local-date ISO key
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
};
const getWeekEnd = (weekStart) => {
  const d = new Date(weekStart); d.setDate(d.getDate() + 6);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
};
const getWeekKey = (dateStr) => {
  const d = new Date(getWeekStart(dateStr));
  // ISO week number
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  const wn = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${d.getFullYear()}-W${String(wn).padStart(2,"0")}`;
};

// ===== DAILY LOG =====
export function DailyLogPage({ logs, setLogs, wbs, doneMap, setDoneMap, wraps, setWraps, initialView }) {
  const [view, setView] = useState(initialView || "daily");
  React.useEffect(() => { if (initialView) setView(initialView); }, [initialView]);
  const [selectedId, setSelectedId] = useState(logs[0]?.id);
  const sel = logs.find(l => l.id === selectedId) || logs[0];

  const update = (patch) => {
    setLogs(logs.map(l => l.id === sel.id ? { ...l, ...patch } : l));
  };

  const newLog = () => {
    const today = todayISO();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `l${Date.now()}`;
    const fresh = { id, date: today, title: "", body: "", issues: "", next_actions: "", tags: [], linked: [] };
    setLogs([fresh, ...logs]);
    setSelectedId(id);
  };

  // ----- Weekly Wrap-up state -----
  const [weekCursor, setWeekCursor] = useState(() => getWeekStart(todayISO()));
  const weekEnd = getWeekEnd(weekCursor);
  const weekLogs = logs.filter(l => l.date >= weekCursor && l.date <= weekEnd)
                       .sort((a,b) => a.date.localeCompare(b.date));
  const weekKey = getWeekKey(weekCursor);
  const wrap = wraps[weekKey] || { highlights: "", learnings: "", nextWeek: "", aiGenerated: false };
  const updateWrap = (patch) => setWraps({ ...wraps, [weekKey]: { ...wrap, ...patch } });

  const issueLogCount = weekLogs.filter(l => l.issues && l.issues.trim()).length;
  const nextActionLogCount = weekLogs.filter(l => l.next_actions && l.next_actions.trim()).length;

  const allLinked = [...new Set(weekLogs.flatMap(l => l.linked || []))];
  const completedThisWeek = allLinked.map(id => findInWBS(wbs, id)).filter(Boolean)
                                     .filter(t => doneMap[t.id] || t.status === "done");
  const inProgressThisWeek = allLinked.map(id => findInWBS(wbs, id)).filter(Boolean)
                                      .filter(t => !(doneMap[t.id] || t.status === "done"));
  const allTags = [...new Set(weekLogs.flatMap(l => l.tags || []))];

  const generateAI = async () => {
    updateWrap({ aiGenerated: "loading" });
    const prompt = `다음은 한 주간의 Amazon 셀러 업무 일지입니다. 한국어로 주간 회고를 작성해주세요.

일지 내용:
${weekLogs.map(l => `[${l.date}] ${l.title}
- 오늘 한 일: ${l.body || '(없음)'}
- 이슈/메모: ${l.issues || '(없음)'}
- 다음 액션: ${l.next_actions || '(없음)'}`).join("\n\n")}

다음 형식의 JSON으로 답해주세요 (코드블록 없이 JSON만):
{"highlights":"이번 주 주요 성과를 3-4 bullet point로(• 로 시작)","learnings":"배운 점/인사이트","nextWeek":"다음주 우선순위 액션 아이템(• 로 시작)"}`;

    try {
      if (!window.claude || !window.claude.complete) {
        throw new Error("AI 기능은 서버 연동 후 사용 가능합니다.");
      }
      const res = await window.claude.complete(prompt);
      const json = JSON.parse(res.replace(/```json|```/g, "").trim());
      updateWrap({ ...json, aiGenerated: true });
    } catch (e) {
      updateWrap({ aiGenerated: false });
      alert(e.message || "AI 생성에 실패했어요. 다시 시도해주세요.");
    }
  };

  const fmtDate = (s) => `${s.slice(5,7)}.${s.slice(8,10)}`;

  // ===== Weekly view (works even without daily logs) =====
  if (view === "weekly") {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Weekly Wrap-up</h1>
            <p className="page-subtitle">{fmtDate(weekCursor)} – {fmtDate(weekEnd)} · {weekKey} · {weekLogs.length}개 일지</p>
          </div>
          <div className="page-actions">
            <button className="icon-btn" onClick={()=>{
              const d = new Date(weekCursor); d.setDate(d.getDate()-7);
              setWeekCursor(getWeekStart(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`));
            }}><IChevL size={14}/></button>
            <button className="btn" onClick={()=>setWeekCursor(getWeekStart(todayISO()))}>This Week</button>
            <button className="icon-btn" onClick={()=>{
              const d = new Date(weekCursor); d.setDate(d.getDate()+7);
              setWeekCursor(getWeekStart(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`));
            }}><IChevR size={14}/></button>
          </div>
        </div>

        <div className="kpi-grid" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
          <div className="kpi">
            <div className="kpi-label"><span className="ic"><ILog size={14}/></span><span>작성한 일지</span></div>
            <div className="kpi-value">{weekLogs.length}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>일</span></div>
            <div className="kpi-meta"><span>이번 주 기록</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(52,199,89,.12)",color:"var(--green)"}}><ICheck size={14}/></span><span>완료 작업</span></div>
            <div className="kpi-value">{completedThisWeek.length}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}> / {allLinked.length}</span></div>
            <div className="kpi-meta"><span>WBS 연결 기준</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(255,149,0,.12)",color:"var(--orange)"}}><ITrend size={14}/></span><span>이슈 기록</span></div>
            <div className="kpi-value">{issueLogCount}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>일</span></div>
            <div className="kpi-meta"><span>이슈/메모 작성일</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(175,82,222,.12)",color:"var(--purple)"}}><ICart size={14}/></span><span>액션 등록</span></div>
            <div className="kpi-value">{nextActionLogCount}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>일</span></div>
            <div className="kpi-meta"><span>다음 액션 작성일</span></div>
          </div>
        </div>

        <div className="row row-2">
          <div className="card">
            <div className="section-title">
              <h2>주간 회고</h2>
              <button className="btn btn-primary" onClick={generateAI} disabled={wrap.aiGenerated==="loading"}>
                ✦ <span>{wrap.aiGenerated==="loading" ? "생성 중..." : "AI로 자동 작성"}</span>
              </button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",color:"var(--fg-tertiary)",marginBottom:6}}>✓ Highlights · 이번주 성과</div>
                <textarea className="log-body" style={{minHeight:90,padding:"10px 12px",background:"var(--bg)",borderRadius:8,border:"0.5px solid var(--border)"}}
                          placeholder="이번 주 어떤 성과가 있었나요?"
                          value={wrap.highlights}
                          onChange={(e)=>updateWrap({highlights: e.target.value})}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",color:"var(--fg-tertiary)",marginBottom:6}}>✦ Learnings · 배운 점</div>
                <textarea className="log-body" style={{minHeight:90,padding:"10px 12px",background:"var(--bg)",borderRadius:8,border:"0.5px solid var(--border)"}}
                          placeholder="어떤 인사이트를 얻었나요?"
                          value={wrap.learnings}
                          onChange={(e)=>updateWrap({learnings: e.target.value})}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",color:"var(--fg-tertiary)",marginBottom:6}}>→ Next Week · 다음주 우선순위</div>
                <textarea className="log-body" style={{minHeight:90,padding:"10px 12px",background:"var(--bg)",borderRadius:8,border:"0.5px solid var(--border)"}}
                          placeholder="다음 주에 가장 중요한 일은?"
                          value={wrap.nextWeek}
                          onChange={(e)=>updateWrap({nextWeek: e.target.value})}/>
              </div>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div className="card">
              <div className="section-title"><h2>이번 주 일지</h2><span className="pill gray">{weekLogs.length}</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {weekLogs.length === 0 && <div style={{color:"var(--fg-tertiary)",fontSize:13,padding:"8px 0"}}>이번 주에 작성된 일지가 없습니다.</div>}
                {weekLogs.map(l => (
                  <div key={l.id} style={{padding:"8px 10px",borderRadius:8,background:"var(--bg)",border:"0.5px solid var(--border)"}}>
                    <div style={{fontSize:11.5,color:"var(--fg-tertiary)",fontVariantNumeric:"tabular-nums"}}>{fmtDate(l.date)} · {["일","월","화","수","목","금","토"][new Date(l.date).getDay()]}</div>
                    <div style={{fontSize:13,fontWeight:500,marginTop:1}}>{l.title || "제목 없음"}</div>
                    {l.issues && <div style={{fontSize:11.5,color:"var(--orange)",marginTop:2}}>⚠ {l.issues.slice(0,40)}{l.issues.length>40?"…":""}</div>}
                    {l.next_actions && <div style={{fontSize:11.5,color:"var(--fg-tertiary)",marginTop:1}}>→ {l.next_actions.slice(0,40)}{l.next_actions.length>40?"…":""}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-title"><h2>완료한 작업</h2><span className="pill green">{completedThisWeek.length}</span></div>
              <div className="linked-list" style={{padding:0}}>
                {completedThisWeek.length === 0 && <div style={{color:"var(--fg-tertiary)",fontSize:13}}>완료된 작업이 없습니다.</div>}
                {completedThisWeek.map(t => (
                  <div key={t.id} className="linked-item">
                    <button className="check checked"><ICheck size={11}/></button>
                    <span style={{flex:1,textDecoration:"line-through",color:"var(--fg-tertiary)"}}>{t.title}</span>
                  </div>
                ))}
              </div>
              {inProgressThisWeek.length > 0 && (
                <>
                  <div className="section-title" style={{marginTop:14}}><h2 style={{fontSize:14}}>진행 중</h2><span className="pill orange">{inProgressThisWeek.length}</span></div>
                  <div className="linked-list" style={{padding:0}}>
                    {inProgressThisWeek.map(t => (
                      <div key={t.id} className="linked-item">
                        <button className="check"></button>
                        <span style={{flex:1}}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="card">
                <div className="section-title"><h2>이번 주 태그</h2></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {allTags.map(t => <span key={t} className="pill blue">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== Daily view =====
  if (!sel) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Daily Log</h1>
            <p className="page-subtitle">매일의 운영 기록 · 0개 항목</p>
          </div>
        </div>
        <div className="empty-state">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>아직 작성된 일지가 없습니다</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)', marginBottom: 14 }}>
            오늘의 운영 기록을 남겨보세요. 매출/주문/ACoS, 메모, 연결 작업까지 한 번에.
          </div>
          <button className="btn btn-primary" onClick={newLog}><IPlus size={14}/> 첫 일지 작성</button>
        </div>
      </div>
    );
  }

  const linkedTasks = (sel.linked || []).map(id => findInWBS(wbs, id)).filter(Boolean);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Log</h1>
          <p className="page-subtitle">매일의 운영 기록 · {logs.length}개 항목</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={newLog}><IPlus size={14}/><span>새 일지</span></button>
        </div>
      </div>

      <div className="log-layout">
        <div className="log-list">
          {logs.map(l => (
            <button key={l.id} className="log-list-item"
                    aria-current={l.id === sel.id}
                    onClick={() => setSelectedId(l.id)}>
              <div className="date">{l.date.slice(5).replace("-",". ")} · {["일","월","화","수","목","금","토"][new Date(l.date).getDay()]}요일</div>
              <div className="preview">{l.title || "제목 없음"}</div>
              <div className="snippet">{(l.body || "").slice(0,40) || "내용 없음"}</div>
            </button>
          ))}
        </div>

        <div className="log-editor">
          <input className="log-date-input" type="text" value={sel.date}
                 onChange={(e)=>update({date: e.target.value})}/>
          <input className="log-title-input" placeholder="오늘의 제목..." value={sel.title}
                 onChange={(e)=>update({title: e.target.value})}/>

          {(sel.tags || []).length > 0 && (
            <div className="log-meta-row">
              <div className="log-meta" style={{flex:1,minWidth:0}}>
                <span className="log-meta-key">태그</span>
                <div className="log-tag-row">
                  {(sel.tags || []).map((t,i) => <span key={i} className="pill blue">{t}</span>)}
                </div>
              </div>
            </div>
          )}

          <div className="log-section">
            <div className="log-section-label">오늘 한 일</div>
            <textarea className="log-body" placeholder="오늘 진행한 업무를 기록하세요." value={sel.body || ''}
                      onChange={(e)=>update({body: e.target.value})}/>
          </div>
          <div className="log-section">
            <div className="log-section-label">이슈 / 메모</div>
            <textarea className="log-body" placeholder="문제점, 특이사항, 확인이 필요한 것..." value={sel.issues || ''}
                      onChange={(e)=>update({issues: e.target.value})}/>
          </div>
          <div className="log-section">
            <div className="log-section-label">다음 액션</div>
            <textarea className="log-body" placeholder="내일 또는 다음에 처리할 업무..." value={sel.next_actions || ''}
                      onChange={(e)=>update({next_actions: e.target.value})}/>
          </div>

          {linkedTasks.length > 0 && (
            <div>
              <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",color:"var(--fg-tertiary)",marginBottom:6}}>
                연결된 WBS 작업 · {linkedTasks.length}
              </div>
              <div className="linked-list">
                {linkedTasks.map(t => {
                  const checked = doneMap[t.id] || t.status === "done";
                  return (
                    <div key={t.id} className="linked-item">
                      <button className={"check" + (checked?" checked":"")}
                              onClick={()=>setDoneMap(d=>({...d,[t.id]:!d[t.id]}))}>
                        {checked && <ICheck size={11}/>}
                      </button>
                      <span style={{flex:1,textDecoration: checked?"line-through":"none",color: checked?"var(--fg-tertiary)":"var(--fg)"}}>{t.title}</span>
                      {t.owner && <span className="pill gray">{t.owner}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== DAILY SALES =====
const isoFromDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export function DailySalesPage({ skus, dailySales, setDailySales }) {
  const [date, setDate] = useState(todayISO)

  const shiftDay = (delta) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(isoFromDate(d))
  }

  // 이 날짜의 기존 행들
  const todayRows = dailySales.filter(r => r.date === date)

  const getVal = (sku, field) => {
    const row = todayRows.find(r => r.sku === sku)
    return row ? (row[field] || '') : ''
  }

  const updateCell = (sku, field, raw) => {
    const num = field === 'orders' ? parseInt(raw) || 0 : parseFloat(raw) || 0
    const existing = dailySales.find(r => r.date === date && r.sku === sku)
    if (existing) {
      setDailySales(prev => prev.map(r => r.id === existing.id ? { ...r, [field]: num } : r))
    } else {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dm${Date.now()}`
      setDailySales(prev => [...prev, { id, date, sku, sales: 0, orders: 0, acos: 0, [field]: num }])
    }
  }

  // 오늘 합계
  const totals = skus.reduce(
    (acc, s) => {
      const row = todayRows.find(r => r.sku === s.sku)
      return {
        sales:   acc.sales   + (row?.sales   || 0),
        orders:  acc.orders  + (row?.orders  || 0),
        acosSum: acc.acosSum + (row?.acos    || 0),
        acosN:   acc.acosN   + (row?.acos ? 1 : 0),
      }
    },
    { sales: 0, orders: 0, acosSum: 0, acosN: 0 }
  )
  const avgAcos = totals.acosN ? totals.acosSum / totals.acosN : 0

  // 이번 주 합계
  const weekStart = getWeekStart(date)
  const weekEnd   = getWeekEnd(weekStart)
  const weekRows  = dailySales.filter(r => r.date >= weekStart && r.date <= weekEnd)
  const weekSales  = weekRows.reduce((a, r) => a + (r.sales  || 0), 0)
  const weekOrders = weekRows.reduce((a, r) => a + (r.orders || 0), 0)
  const filledDays = new Set(weekRows.filter(r => r.sales || r.orders).map(r => r.date)).size

  // 날짜 표시
  const dateObj  = new Date(date)
  const dowLabel = ["일","월","화","수","목","금","토"][dateObj.getDay()]
  const dateLabel = `${dateObj.getFullYear()}.${String(dateObj.getMonth()+1).padStart(2,'0')}.${String(dateObj.getDate()).padStart(2,'0')} (${dowLabel})`

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Sales</h1>
          <p className="page-subtitle">SKU별 일별 실적 입력 · {skus.length}개 SKU</p>
        </div>
        <div className="page-actions">
          <button className="icon-btn" onClick={() => shiftDay(-1)}><IChevL size={14}/></button>
          <input className="input" type="date" value={date}
                 onChange={e => setDate(e.target.value)}
                 style={{width: 148}}/>
          <button className="btn" onClick={() => setDate(todayISO())}>오늘</button>
          <button className="icon-btn" onClick={() => shiftDay(1)}><IChevR size={14}/></button>
        </div>
      </div>

      <div className="kpi-grid" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
        <div className="kpi">
          <div className="kpi-label"><span className="ic"><IDollar size={14}/></span><span>오늘 매출</span></div>
          <div className="kpi-value">{fmtMoney(totals.sales)}</div>
          <div className="kpi-meta"><span>{dateLabel}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(175,82,222,.12)",color:"var(--purple)"}}><ICart size={14}/></span><span>오늘 주문</span></div>
          <div className="kpi-value">{fmtNum(totals.orders)}</div>
          <div className="kpi-meta"><span>총 주문 건수</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(255,149,0,.12)",color:"var(--orange)"}}><ITrend size={14}/></span><span>평균 ACoS</span></div>
          <div className="kpi-value">{avgAcos.toFixed(1)}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>%</span></div>
          <div className="kpi-meta"><span>입력된 SKU 기준</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(52,199,89,.12)",color:"var(--green)"}}><ISales size={14}/></span><span>주간 매출</span></div>
          <div className="kpi-value">{fmtMoney(weekSales)}</div>
          <div className="kpi-meta"><span>이번 주 {filledDays}일 / 주문 {fmtNum(weekOrders)}건</span></div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h2>{dateLabel} · SKU별 실적</h2>
          <span className="meta">{todayRows.filter(r => r.sales || r.orders).length}개 SKU 입력됨</span>
        </div>

        {skus.length === 0 ? (
          <div className="empty-state" style={{marginTop:0}}>
            좌측 <strong>SKUs</strong> 메뉴에서 SKU를 먼저 등록하세요.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>제품명</th>
                <th className="num">매출 ($)</th>
                <th className="num">주문</th>
                <th className="num">ACoS (%)</th>
              </tr>
            </thead>
            <tbody>
              {skus.map(s => (
                <tr key={s.sku}>
                  <td style={{fontFamily:"var(--font-mono)",fontSize:12}}>{s.sku}</td>
                  <td style={{color:"var(--fg-secondary)"}}>{s.name}</td>
                  <td className="num">
                    <input className="input cell-input" type="number" min="0" step="0.01"
                           placeholder="0"
                           value={getVal(s.sku, 'sales')}
                           onChange={e => updateCell(s.sku, 'sales', e.target.value)}/>
                  </td>
                  <td className="num">
                    <input className="input cell-input" type="number" min="0"
                           placeholder="0"
                           value={getVal(s.sku, 'orders')}
                           onChange={e => updateCell(s.sku, 'orders', e.target.value)}/>
                  </td>
                  <td className="num">
                    <input className="input cell-input" type="number" min="0" step="0.1"
                           placeholder="0"
                           value={getVal(s.sku, 'acos')}
                           onChange={e => updateCell(s.sku, 'acos', e.target.value)}/>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="sales-total-row">
                <td colSpan="2" style={{fontWeight:600,fontSize:12,color:"var(--fg-secondary)"}}>합계</td>
                <td className="num" style={{fontWeight:600}}>{fmtMoney(totals.sales)}</td>
                <td className="num" style={{fontWeight:600}}>{fmtNum(totals.orders)}</td>
                <td className="num" style={{color:"var(--fg-tertiary)"}}>{avgAcos.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
