// Pages: Dashboard, WBS, Calendar, Daily Log
import React, { useState, useMemo } from 'react'
import {
  IFilter, IPlus, IChev, IChevD, IChevL, IChevR, ICheck,
  IDollar, ICart, ITrend,
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
function computeGanttRange(wbs) {
  const today = todayDate()
  const fallbackStart = startOfMonth(today)
  const fallbackEnd = endOfMonth(today)
  if (!wbs.length) {
    return { start: fallbackStart, days: fallbackEnd.getDate() }
  }
  let minD = null, maxD = null
  const walk = (nodes) => nodes.forEach((n) => {
    if (n.start) { const d = new Date(n.start); if (!isNaN(d.getTime()) && (!minD || d < minD)) minD = d }
    if (n.end) { const d = new Date(n.end); if (!isNaN(d.getTime()) && (!maxD || d > maxD)) maxD = d }
    if (n.children) walk(n.children)
  })
  walk(wbs)
  if (!minD || !maxD) return { start: fallbackStart, days: fallbackEnd.getDate() }
  const start = new Date(minD.getFullYear(), minD.getMonth(), 1)
  const end = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0)
  const days = daysBetween(start, end) + 1
  return { start, days: Math.max(28, Math.min(days, 186)) }
}

export function WBSPage({ wbs, setWbs, expanded, setExpanded, doneMap, setDoneMap }) {
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const flat = useMemo(() => flattenWBS(wbs, 0, expanded), [wbs, expanded]);

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const toggleDone = (id) => setDoneMap(d => ({ ...d, [id]: !d[id] }));

  const addChild = (parentId) => {
    if (!newTitle.trim()) { setAdding(null); return; }
    const today = todayISO();
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `n${Date.now()}`;
    const newNode = { id: newId, title: newTitle, parent: parentId, owner: "", start: today, end: today, status: "todo" };
    const insert = (nodes) => nodes.map(n => {
      if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
      if (n.children) return { ...n, children: insert(n.children) };
      return n;
    });
    if (parentId === null) setWbs([...wbs, newNode]);
    else setWbs(insert(wbs));
    setExpanded(e => ({ ...e, [parentId]: true }));
    setNewTitle("");
    setAdding(null);
  };

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
          <button className="btn btn-primary" onClick={()=>{ setAdding("__root"); setNewTitle(""); }}>
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
          <button className="btn btn-primary" onClick={()=>{ setAdding("__root"); setNewTitle(""); }}>
            <IPlus size={14}/><span>새 프로젝트</span>
          </button>
        </div>
      )}

      {(wbs.length > 0 || adding === "__root") && (
        <div className="wbs-layout">
          <div>
            <div className="tree">
              {flat.map(node => {
                const pct = computeProgress(node, doneMap);
                const checked = doneMap[node.id] || node.status === "done";
                return (
                  <div key={node.id}>
                    <div className={"tree-row" + (node.hasChildren ? " parent" : "")}
                         data-selected={selected === node.id}
                         onClick={() => setSelected(node.id)}
                         style={{ paddingLeft: 8 + node.depth * 18 }}>
                      {node.hasChildren ? (
                        <div className={"chev" + (expanded[node.id] ? " open" : "")}
                             onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}>
                          <IChev size={12}/>
                        </div>
                      ) : <div className="chev spacer"/>}
                      <button className={"check" + (checked ? " checked" : "")}
                              onClick={(e) => { e.stopPropagation(); toggleDone(node.id); }}>
                        {checked && <ICheck size={12}/>}
                      </button>
                      <div className="label">
                        <span style={{textDecoration: checked ? "line-through" : "none", color: checked ? "var(--fg-tertiary)" : "var(--fg)"}}>
                          {node.title}
                        </span>
                        {node.owner && <span className="sub">· {node.owner}</span>}
                      </div>
                      <div className="progress"><i style={{width:`${pct}%`}}/></div>
                      <div className="pct">{pct}%</div>
                    </div>
                    {adding === node.id && (
                      <div className="add-row" style={{ marginLeft: 8 + (node.depth + 1) * 18 }}>
                        <input autoFocus placeholder="새 하위 작업..." value={newTitle}
                               onChange={(e) => setNewTitle(e.target.value)}
                               onKeyDown={(e) => { if (e.key === "Enter") addChild(node.id); if (e.key === "Escape") setAdding(null); }}/>
                        <button className="btn btn-primary" onClick={() => addChild(node.id)}>추가</button>
                        <button className="btn" onClick={() => setAdding(null)}>취소</button>
                      </div>
                    )}
                    {selected === node.id && adding !== node.id && (
                      <div style={{paddingLeft: 8 + (node.depth + 1) * 18, padding: "2px 8px 2px " + (28 + node.depth * 18) + "px"}}>
                        <button className="nav-item" style={{padding:"4px 8px",fontSize:12,color:"var(--accent)"}}
                                onClick={() => { setAdding(node.id); setNewTitle(""); }}>
                          <IPlus size={12}/> <span>하위 작업 추가</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {adding === "__root" && (
                <div className="add-row">
                  <input autoFocus placeholder="새 프로젝트..." value={newTitle}
                         onChange={(e) => setNewTitle(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === "Enter") {
                             if (!newTitle.trim()) { setAdding(null); return; }
                             const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
                               ? crypto.randomUUID()
                               : `n${Date.now()}`;
                             const today = todayISO();
                             setWbs([...wbs, { id, title: newTitle, parent: null, owner: "", start: today, end: today, status: "todo", children: [] }]);
                             setNewTitle(""); setAdding(null);
                           }
                           if (e.key === "Escape") setAdding(null);
                         }}/>
                  <button className="btn" onClick={() => setAdding(null)}>취소</button>
                </div>
              )}
            </div>
          </div>

          {wbs.length > 0 && (
            <div className="gantt">
              <div className="gantt-grid" style={{ minWidth: Math.max(800, ganttDays * 28) }}>
                <div className="gantt-head">
                  <div className="label-th">{ganttHeadLabel}</div>
                  <div className="gantt-days" style={{gridTemplateColumns:`repeat(${ganttDays}, 1fr)`}}>
                    {days.map((d, i) => {
                      const dow = d.getDay();
                      const isToday = sameDay(d, today);
                      return (
                        <div key={i} className={"gantt-day" + (isToday ? " today" : "") + (dow === 0 || dow === 6 ? " weekend" : "")}>
                          <span className="num">{d.getDate()}</span>
                          <span>{["일","월","화","수","목","금","토"][dow]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {ganttRows.map(node => {
                  const start = dateToCol(node.start);
                  const end = dateToCol(node.end);
                  const span = Math.max(1, end - start + 1);
                  const pct = computeProgress(node, doneMap);
                  const klass = node.hasChildren ? "parent" : (pct === 100 ? "done" : "");
                  const isSelected = selected === node.id;
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
                          <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{node.title}</span>
                        </div>
                        <div className="gantt-track" style={{gridTemplateColumns:`repeat(${ganttDays}, 1fr)`}}>
                          {days.map((d,i) => {
                            const dow = d.getDay();
                            const isToday = sameDay(d, today);
                            return <div key={i} className={"gantt-cell" + (dow===0||dow===6?" weekend":"") + (isToday?" today":"")}/>;
                          })}
                          <div className={"gantt-bar " + klass}
                               style={{ left: `calc(${(start/ganttDays)*100}% + 2px)`, width: `calc(${(span/ganttDays)*100}% - 4px)` }}>
                            {span > 3 && <span style={{opacity:.95}}>{node.title}</span>}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="gantt-add-row-line"
                             style={{ paddingLeft: 22 + node.depth * 14 }}>
                          {adding === node.id ? (
                            <div className="add-row" style={{ margin: 0, flex: 1, maxWidth: 480 }}>
                              <input autoFocus placeholder="새 하위 작업..." value={newTitle}
                                     onChange={(e) => setNewTitle(e.target.value)}
                                     onKeyDown={(e) => { if (e.key === "Enter") addChild(node.id); if (e.key === "Escape") setAdding(null); }}/>
                              <button className="btn btn-primary" onClick={() => addChild(node.id)}>추가</button>
                              <button className="btn" onClick={() => setAdding(null)}>취소</button>
                            </div>
                          ) : (
                            <button className="gantt-add-link"
                                    onClick={() => { setAdding(node.id); setNewTitle(""); }}>
                              <IPlus size={12}/> <span>하위 작업 추가</span>
                            </button>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== CALENDAR =====
export function CalendarPage({ events, setEvents }) {
  const [cursor, setCursor] = useState(() => startOfMonth());
  const [newEventDate, setNewEventDate] = useState(null);
  const [newEventTitle, setNewEventTitle] = useState("");

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();
  const today = todayDate();

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
    events.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [events]);

  const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

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
          <p className="page-subtitle">{events.length}개의 일정 · WBS와 자동 연동</p>
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
            const isToday = sameDay(c.date, today);
            const isSun = c.date.getDay() === 0;
            return (
              <div key={i}
                   className={"cal-cell" + (c.other?" other":"") + (isToday?" today":"") + (isSun?" sun":"")}
                   onDoubleClick={() => { setNewEventDate(key); setNewEventTitle(""); }}>
                <span className="cal-num">{c.date.getDate()}</span>
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
    const fresh = { id, date: today, title: "", weather: "맑음", mood: "보통", body: "", tags: [], linked: [], metrics: { sales: 0, orders: 0, acos: 0 } };
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

  const weekMetrics = weekLogs.reduce((acc, l) => ({
    sales: acc.sales + (l.metrics?.sales || 0),
    orders: acc.orders + (l.metrics?.orders || 0),
    acos: acc.acos + (l.metrics?.acos || 0),
    n: acc.n + (l.metrics?.acos ? 1 : 0),
  }), { sales: 0, orders: 0, acos: 0, n: 0 });
  const avgAcos = weekMetrics.n ? (weekMetrics.acos / weekMetrics.n) : 0;

  const allLinked = [...new Set(weekLogs.flatMap(l => l.linked || []))];
  const completedThisWeek = allLinked.map(id => findInWBS(wbs, id)).filter(Boolean)
                                     .filter(t => doneMap[t.id] || t.status === "done");
  const inProgressThisWeek = allLinked.map(id => findInWBS(wbs, id)).filter(Boolean)
                                      .filter(t => !(doneMap[t.id] || t.status === "done"));
  const allTags = [...new Set(weekLogs.flatMap(l => l.tags || []))];

  const generateAI = async () => {
    updateWrap({ aiGenerated: "loading" });
    const prompt = `다음은 한 주간의 Amazon 운영 일지입니다. 한국어로 주간 회고를 작성해주세요.

주간 매출: $${weekMetrics.sales.toLocaleString()}
주간 주문: ${weekMetrics.orders}건
평균 ACoS: ${avgAcos.toFixed(1)}%

일지 내용:
${weekLogs.map(l => `[${l.date}] ${l.title}\n${l.body}`).join("\n\n")}

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
            <div className="segmented">
              <button aria-pressed={view==="daily"} onClick={()=>setView("daily")}>Daily</button>
              <button aria-pressed={view==="weekly"} onClick={()=>setView("weekly")}>Weekly</button>
            </div>
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
            <div className="kpi-label"><span className="ic"><IDollar size={14}/></span><span>주간 매출</span></div>
            <div className="kpi-value">${weekMetrics.sales.toLocaleString()}</div>
            <div className="kpi-meta"><span>{weekLogs.length}일 합계</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(175,82,222,.12)",color:"var(--purple)"}}><ICart size={14}/></span><span>주간 주문</span></div>
            <div className="kpi-value">{weekMetrics.orders}</div>
            <div className="kpi-meta"><span>일평균 {weekLogs.length ? Math.round(weekMetrics.orders/weekLogs.length) : 0}건</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(255,149,0,.12)",color:"var(--orange)"}}><ITrend size={14}/></span><span>평균 ACoS</span></div>
            <div className="kpi-value">{avgAcos.toFixed(1)}%</div>
            <div className="kpi-meta"><span>{weekMetrics.n}일 측정</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><span className="ic" style={{background:"rgba(52,199,89,.12)",color:"var(--green)"}}><ICheck size={14}/></span><span>완료한 작업</span></div>
            <div className="kpi-value">{completedThisWeek.length}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}> / {allLinked.length}</span></div>
            <div className="kpi-meta"><span>WBS 연결 기준</span></div>
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
          <div className="page-actions">
            <div className="segmented">
              <button aria-pressed={view==="daily"} onClick={()=>setView("daily")}>Daily</button>
              <button aria-pressed={view==="weekly"} onClick={()=>setView("weekly")}>Weekly</button>
            </div>
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
          <div className="segmented">
            <button aria-pressed={view==="daily"} onClick={()=>setView("daily")}>Daily</button>
            <button aria-pressed={view==="weekly"} onClick={()=>setView("weekly")}>Weekly</button>
          </div>
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

          <div className="log-meta-row">
            <div className="log-meta">
              <span className="log-meta-key">기상</span>
              <select className="input" style={{width:90}} value={sel.weather}
                      onChange={(e)=>update({weather: e.target.value})}>
                <option>맑음</option><option>흐림</option><option>비</option><option>눈</option>
              </select>
            </div>
            <div className="log-meta">
              <span className="log-meta-key">컨디션</span>
              <select className="input" style={{width:90}} value={sel.mood}
                      onChange={(e)=>update({mood: e.target.value})}>
                <option>집중</option><option>보통</option><option>피곤</option><option>기쁨</option>
              </select>
            </div>
            <div className="log-meta" style={{flex:1,minWidth:0}}>
              <span className="log-meta-key">태그</span>
              <div className="log-tag-row">
                {(sel.tags || []).map((t,i) => <span key={i} className="pill blue">{t}</span>)}
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:24,fontSize:12.5,color:"var(--fg-secondary)",paddingBottom:8,borderBottom:"0.5px solid var(--separator)",flexWrap:"wrap"}}>
            <div>
              <span style={{color:"var(--fg-tertiary)"}}>매출 $</span>
              <input className="input" type="number" style={{width:90,display:"inline-block",marginLeft:4}} value={sel.metrics?.sales || 0}
                     onChange={(e)=>update({metrics: {...sel.metrics, sales: parseFloat(e.target.value) || 0}})}/>
            </div>
            <div>
              <span style={{color:"var(--fg-tertiary)"}}>주문</span>
              <input className="input" type="number" style={{width:80,display:"inline-block",marginLeft:4}} value={sel.metrics?.orders || 0}
                     onChange={(e)=>update({metrics: {...sel.metrics, orders: parseInt(e.target.value) || 0}})}/>
            </div>
            <div>
              <span style={{color:"var(--fg-tertiary)"}}>ACoS %</span>
              <input className="input" type="number" step="0.1" style={{width:80,display:"inline-block",marginLeft:4}} value={sel.metrics?.acos || 0}
                     onChange={(e)=>update({metrics: {...sel.metrics, acos: parseFloat(e.target.value) || 0}})}/>
            </div>
          </div>

          <textarea className="log-body" placeholder="오늘 어떤 일이 있었나요?" value={sel.body}
                    onChange={(e)=>update({body: e.target.value})}/>

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
