// SKU Management + PPC Campaigns + Targeting
import React, { useState, useMemo } from 'react'
import {
  IPlus, IChev, IChevL, ISearch,
  IDollar, ICart, ITrend, IBox, ITarget,
} from './icons.jsx'
import { todayISO } from './usePersisted.js'

// ===== SKU MANAGEMENT =====
export function SKUPage({ skus, setSkus }) {
  const [editingId, setEditingId] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const blank = { sku: "", name: "", asin: "", price: 0, units: 0, sales: 0, acos: 0, roas: 0, stock: 0, bsr: 0, status: "active" };
  const [draft, setDraft] = useState(blank);

  const filtered = useMemo(() => skus.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (query && !(`${s.sku} ${s.name} ${s.asin}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [skus, filter, query]);

  const totals = useMemo(() => skus.reduce((a, s) => ({
    sales: a.sales + s.sales, units: a.units + s.units, stock: a.stock + s.stock,
    acos: a.acos + s.acos, roas: a.roas + s.roas,
  }), { sales: 0, units: 0, stock: 0, acos: 0, roas: 0 }), [skus]);
  const avgAcos = skus.length ? (totals.acos / skus.length) : 0;
  const avgRoas = skus.length ? (totals.roas / skus.length) : 0;

  const startEdit = (sku) => { setEditingId(sku.sku); setDraft({ ...sku }); setDrafting(false); };
  const startNew = () => { setDrafting(true); setEditingId(null); setDraft(blank); };
  const cancel = () => { setEditingId(null); setDrafting(false); setDraft(blank); };
  const save = () => {
    if (!draft.sku.trim() || !draft.name.trim()) return;
    if (drafting) {
      if (skus.some(s => s.sku === draft.sku)) { alert("이미 존재하는 SKU입니다."); return; }
      setSkus([...skus, { ...draft }]);
    } else {
      setSkus(skus.map(s => s.sku === editingId ? { ...draft } : s));
    }
    cancel();
  };
  const remove = (sku) => {
    if (!confirm(`${sku} SKU를 삭제하시겠습니까?`)) return;
    setSkus(skus.filter(s => s.sku !== sku));
  };
  const stockStatus = (s) => s.stock < 30 ? "critical" : s.stock < 100 ? "low" : "active";
  const isEditing = drafting || editingId;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">SKU Management</h1>
          <p className="page-subtitle">상품별 매출 · 광고 효율 · 재고 관리 · {skus.length}개 SKU</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={startNew}><IPlus size={14}/><span>새 SKU 등록</span></button>
        </div>
      </div>

      <div className="kpi-grid" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
        <div className="kpi">
          <div className="kpi-label"><span className="ic"><IDollar size={14}/></span><span>총 매출</span></div>
          <div className="kpi-value">${totals.sales.toLocaleString()}</div>
          <div className="kpi-meta"><span>{skus.length}개 SKU 합계</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(175,82,222,.12)",color:"var(--purple)"}}><ICart size={14}/></span><span>총 판매수</span></div>
          <div className="kpi-value">{totals.units.toLocaleString()}</div>
          <div className="kpi-meta"><span>이번 달 누적</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(255,149,0,.12)",color:"var(--orange)"}}><ITrend size={14}/></span><span>평균 ACoS · RoAS</span></div>
          <div className="kpi-value">{avgAcos.toFixed(1)}<span style={{fontSize:18,color:"var(--fg-tertiary)",fontWeight:500}}>% · {avgRoas.toFixed(1)}x</span></div>
          <div className="kpi-meta"><span>전체 SKU 평균</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{background:"rgba(52,199,89,.12)",color:"var(--green)"}}><IBox size={14}/></span><span>총 재고</span></div>
          <div className="kpi-value">{totals.stock.toLocaleString()}</div>
          <div className="kpi-meta"><span className="card-delta down">{skus.filter(s => s.stock < 30).length}개 위험</span></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="segmented">
            <button aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>All</button>
            <button aria-pressed={filter==="active"} onClick={()=>setFilter("active")}>Active</button>
            <button aria-pressed={filter==="low"} onClick={()=>setFilter("low")}>Low</button>
            <button aria-pressed={filter==="critical"} onClick={()=>setFilter("critical")}>Critical</button>
          </div>
        </div>
        <div className="toolbar-right">
          <div className="search" style={{width:240}}>
            <ISearch size={14}/>
            <input placeholder="SKU, 상품명, ASIN 검색" value={query} onChange={(e)=>setQuery(e.target.value)}/>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="card" style={{marginBottom:16,background:"var(--bg-elev-2)",border:"0.5px solid var(--accent)"}}>
          <div className="section-title"><h2>{drafting ? "새 SKU 등록" : `${editingId} 편집`}</h2></div>
          <div className="sku-form">
            <label><span>SKU</span><input className="input" value={draft.sku} disabled={!drafting}
                                          onChange={(e)=>setDraft({...draft, sku: e.target.value})}/></label>
            <label><span>상품명</span><input className="input" value={draft.name}
                                            onChange={(e)=>setDraft({...draft, name: e.target.value})}/></label>
            <label><span>ASIN</span><input className="input" value={draft.asin}
                                          onChange={(e)=>setDraft({...draft, asin: e.target.value})}/></label>
            <label><span>판매가 ($)</span><input className="input" type="number" value={draft.price}
                                                onChange={(e)=>setDraft({...draft, price: parseFloat(e.target.value) || 0})}/></label>
            <label><span>이번 달 매출 ($)</span><input className="input" type="number" value={draft.sales}
                                                      onChange={(e)=>setDraft({...draft, sales: parseFloat(e.target.value) || 0})}/></label>
            <label><span>판매수</span><input className="input" type="number" value={draft.units}
                                              onChange={(e)=>setDraft({...draft, units: parseInt(e.target.value) || 0})}/></label>
            <label><span>ACoS (%)</span><input className="input" type="number" step="0.1" value={draft.acos}
                                                onChange={(e)=>setDraft({...draft, acos: parseFloat(e.target.value) || 0})}/></label>
            <label><span>RoAS (x)</span><input className="input" type="number" step="0.1" value={draft.roas}
                                                onChange={(e)=>setDraft({...draft, roas: parseFloat(e.target.value) || 0})}/></label>
            <label><span>재고</span><input className="input" type="number" value={draft.stock}
                                            onChange={(e)=>setDraft({...draft, stock: parseInt(e.target.value) || 0})}/></label>
            <label><span>BSR 순위</span><input className="input" type="number" value={draft.bsr}
                                                onChange={(e)=>setDraft({...draft, bsr: parseInt(e.target.value) || 0})}/></label>
            <label><span>상태</span>
              <select className="input" value={draft.status} onChange={(e)=>setDraft({...draft, status: e.target.value})}>
                <option value="active">Active</option><option value="low">Low Stock</option>
                <option value="critical">Critical</option><option value="paused">Paused</option>
              </select>
            </label>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <button className="btn" onClick={cancel}>취소</button>
            <button className="btn btn-primary" onClick={save}>{drafting ? "등록" : "저장"}</button>
          </div>
        </div>
      )}

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="table sku-table">
          <thead>
            <tr>
              <th style={{width:140}}>SKU</th><th>Product</th><th style={{width:120}}>ASIN</th>
              <th className="num">Price</th><th className="num">Units</th><th className="num">Sales</th>
              <th className="num">ACoS</th><th className="num">RoAS</th><th className="num">Stock</th>
              <th className="num">BSR</th><th style={{width:90}}>Status</th><th style={{width:80}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const ss = stockStatus(s);
              return (
                <tr key={s.sku}>
                  <td><code style={{fontFamily:"var(--font-mono)",fontSize:12}}>{s.sku}</code></td>
                  <td style={{fontWeight:500}}>{s.name}</td>
                  <td style={{color:"var(--fg-tertiary)",fontFamily:"var(--font-mono)",fontSize:12}}>{s.asin}</td>
                  <td className="num">${s.price.toFixed(2)}</td>
                  <td className="num">{s.units}</td>
                  <td className="num" style={{fontWeight:500}}>${s.sales.toLocaleString()}</td>
                  <td className="num" style={{color: s.acos > 25 ? "var(--red)" : s.acos > 20 ? "var(--orange)" : "var(--fg)"}}>{s.acos.toFixed(1)}%</td>
                  <td className="num" style={{color: s.roas < 4 ? "var(--orange)" : "var(--fg)"}}>{s.roas.toFixed(1)}x</td>
                  <td className="num"><span style={{color: ss === "critical" ? "var(--red)" : ss === "low" ? "var(--orange)" : "var(--fg)", fontWeight: ss !== "active" ? 600 : 400}}>{s.stock}</span></td>
                  <td className="num" style={{color:"var(--fg-tertiary)"}}>#{s.bsr}</td>
                  <td><span className={`pill ${s.status === "active" ? "green" : s.status === "critical" ? "red" : s.status === "low" ? "orange" : "gray"}`}>{s.status}</span></td>
                  <td>
                    <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                      <button className="icon-btn" title="편집" onClick={()=>startEdit(s)} style={{width:26,height:26}}>
                        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 13.5L2 16l2.5-.5 9-9-2-2-9 9zM12 4l2 2"/></svg>
                      </button>
                      <button className="icon-btn" title="삭제" onClick={()=>remove(s.sku)} style={{width:26,height:26,color:"var(--red)"}}>
                        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 5h11M7 5V3.5h4V5M5 5l.5 10h7L13 5"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="12" style={{textAlign:"center",padding:"40px 0",color:"var(--fg-tertiary)"}}>검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== PPC: 3-level drill-down (SKU → Campaign → Daily Bids) =====
export function PPCPage({ campaigns, setCampaigns, skus }) {
  const [selectedSku, setSelectedSku] = useState(skus[0]?.sku || null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [bidDraft, setBidDraft] = useState(() => ({ date: todayISO(), bid: 1.0, note: "" }));
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCamp, setNewCamp] = useState(() => ({
    name: "", type: "Sponsored Products", targeting: "Auto",
    status: "active", startDate: todayISO(), budget: 50,
  }));

  // Auto-select first SKU when SKU list changes
  React.useEffect(() => {
    if (!selectedSku && skus.length > 0) setSelectedSku(skus[0].sku);
  }, [skus, selectedSku]);

  const skuObj = skus.find(s => s.sku === selectedSku);
  const skuCampaigns = campaigns.filter(c => c.sku === selectedSku);
  const sel = campaigns.find(c => c.id === selectedCampaign && c.sku === selectedSku);

  // Per-SKU rollup for the catalog tiles
  const skuStats = (sku) => {
    const list = campaigns.filter(c => c.sku === sku);
    const r = list.reduce((a,c) => ({
      spend: a.spend + c.spend, sales: a.sales + c.sales, count: a.count + 1,
      active: a.active + (c.status === "active" ? 1 : 0),
    }), { spend: 0, sales: 0, count: 0, active: 0 });
    return { ...r, acos: r.sales ? (r.spend / r.sales * 100) : 0, roas: r.spend ? (r.sales / r.spend) : 0 };
  };

  // SKU-level totals
  const totals = skuCampaigns.reduce((a, c) => ({
    spend: a.spend + c.spend, sales: a.sales + c.sales,
    impressions: a.impressions + c.impressions, clicks: a.clicks + c.clicks, orders: a.orders + c.orders,
  }), { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 });
  const totalAcos = totals.sales ? (totals.spend / totals.sales * 100) : 0;
  const totalRoas = totals.spend ? (totals.sales / totals.spend) : 0;

  const addBid = () => {
    if (!sel) return;
    setCampaigns(campaigns.map(c => c.id === sel.id
      ? { ...c, bids: [{ ...bidDraft, bid: parseFloat(bidDraft.bid) || 0 }, ...c.bids.filter(b => b.date !== bidDraft.date)].sort((a,b)=>b.date.localeCompare(a.date)) }
      : c));
    setBidDraft({ date: todayISO(), bid: 1.0, note: "" });
    setDrafting(false);
  };
  const removeBid = (date) => {
    if (!sel) return;
    setCampaigns(campaigns.map(c => c.id === sel.id ? { ...c, bids: c.bids.filter(b => b.date !== date) } : c));
  };
  const addCampaign = () => {
    if (!selectedSku || !newCamp.name.trim()) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : "c" + Date.now();
    const camp = {
      id, sku: selectedSku, ...newCamp,
      impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0,
      bids: [{ date: newCamp.startDate, bid: 1.0, note: "캠페인 런칭" }],
    };
    setCampaigns([...campaigns, camp]);
    setSelectedCampaign(camp.id);
    setShowNewCampaign(false);
    setNewCamp({ ...newCamp, name: "" });
  };
  const toggleStatus = (c) => setCampaigns(campaigns.map(x => x.id === c.id ? { ...x, status: x.status === "active" ? "paused" : "active" } : x));
  const removeCampaign = (c) => {
    if (!confirm(`'${c.name}' 캠페인을 삭제하시겠습니까?`)) return;
    setCampaigns(campaigns.filter(x => x.id !== c.id));
    if (sel?.id === c.id) setSelectedCampaign(null);
  };

  const renderBidChart = (bids) => {
    if (!bids || bids.length === 0) return null;
    const sorted = [...bids].sort((a,b) => a.date.localeCompare(b.date));
    const min = Math.min(...sorted.map(b => b.bid));
    const max = Math.max(...sorted.map(b => b.bid));
    const range = max - min || 1;
    const W = 100, H = 100;
    const pts = sorted.map((b, i) => {
      const x = sorted.length === 1 ? W/2 : (i / (sorted.length - 1)) * W;
      const y = H - ((b.bid - min) / range) * (H - 20) - 10;
      return [x, y];
    });
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:120,display:"block"}}>
        <defs>
          <linearGradient id="bidg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`M ${pts[0][0]} ${H} L ${pts.map(p => `${p[0]} ${p[1]}`).join(" L ")} L ${pts[pts.length-1][0]} ${H} Z`} fill="url(#bidg)"/>
        <path d={`M ${pts.map(p => `${p[0]} ${p[1]}`).join(" L ")}`} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="var(--accent)" vectorEffect="non-scaling-stroke"/>)}
      </svg>
    );
  };

  // Reset campaign selection when SKU changes
  React.useEffect(() => { setSelectedCampaign(null); }, [selectedSku]);

  if (skus.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">PPC Campaigns</h1>
            <p className="page-subtitle">SKU → 캠페인 → Daily Bid · 3단계 광고 관리</p>
          </div>
        </div>
        <div className="empty-state">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>먼저 SKU를 등록해주세요</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-tertiary)' }}>
            PPC 캠페인은 SKU 단위로 관리됩니다. 좌측 메뉴 <strong>SKUs</strong>에서 상품을 먼저 등록하세요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">PPC Campaigns</h1>
          <p className="page-subtitle">SKU → 캠페인 → Daily Bid · 3단계 광고 관리</p>
        </div>
      </div>

      {/* Breadcrumb / level indicator */}
      <div className="ppc-crumbs">
        <button className={"ppc-crumb " + (selectedSku && !sel ? "active" : sel ? "" : "active")}
                onClick={()=>{ setSelectedCampaign(null); }}>
          <span className="ppc-crumb-step">1</span>
          <div>
            <div className="ppc-crumb-label">SKU 선택</div>
            <div className="ppc-crumb-value">{skuObj ? `${skuObj.sku} · ${skuObj.name}` : "선택 안 됨"}</div>
          </div>
        </button>
        <span className="ppc-crumb-sep"><IChev size={12}/></span>
        <button className={"ppc-crumb " + (sel ? "active" : selectedSku ? "" : "disabled")}
                onClick={()=>setSelectedCampaign(null)}
                disabled={!selectedSku}>
          <span className="ppc-crumb-step">2</span>
          <div>
            <div className="ppc-crumb-label">PPC 캠페인 선택</div>
            <div className="ppc-crumb-value">{sel ? sel.name : `${skuCampaigns.length}개 캠페인`}</div>
          </div>
        </button>
        <span className="ppc-crumb-sep"><IChev size={12}/></span>
        <div className={"ppc-crumb " + (sel ? "active" : "disabled")}>
          <span className="ppc-crumb-step">3</span>
          <div>
            <div className="ppc-crumb-label">Daily Bid 기록</div>
            <div className="ppc-crumb-value">{sel ? `${sel.bids.length}개 기록` : "캠페인 선택 후"}</div>
          </div>
        </div>
      </div>

      {/* LEVEL 1 + 2: SKU selector + Campaign list */}
      {!sel && (
        <div className="ppc-layout-single">
          <div className="ppc-sku-selector">
            <label className="ppc-sku-selector-label">SKU 선택</label>
            <div className="ppc-sku-selector-row">
              <select className="input ppc-sku-select"
                      value={selectedSku || ""}
                      onChange={(e)=>setSelectedSku(e.target.value || null)}>
                <option value="">— SKU를 선택하세요 —</option>
                {skus.map(s => {
                  const st = skuStats(s.sku);
                  return (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} · {s.name} · {st.count} 캠페인 · ACoS {st.count ? st.acos.toFixed(1) + "%" : "—"}
                    </option>
                  );
                })}
              </select>
              {skuObj && (
                <div className="ppc-sku-selector-meta">
                  <span><span style={{color:"var(--fg-tertiary)"}}>ASIN</span> <code style={{fontFamily:"var(--font-mono)",fontSize:11.5}}>{skuObj.asin}</code></span>
                  <span><span style={{color:"var(--fg-tertiary)"}}>재고</span> <strong>{skuObj.stock}</strong></span>
                  <span><span style={{color:"var(--fg-tertiary)"}}>BSR</span> <strong>#{skuObj.bsr}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="ppc-detail">
            {skuObj ? (
              <>
                <div className="ppc-detail-head">
                  <div>
                    <h2 style={{margin:0,fontSize:22,fontWeight:600,letterSpacing:"-0.02em"}}>{skuObj.name}</h2>
                    <div style={{fontSize:12.5,color:"var(--fg-tertiary)",marginTop:4}}>
                      <code style={{fontFamily:"var(--font-mono)"}}>{skuObj.sku}</code> 의 PPC 캠페인을 관리하세요
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={()=>setShowNewCampaign(true)}><IPlus size={14}/><span>새 캠페인</span></button>
                </div>

                {/* SKU-level rollup */}
                <div className="ppc-perf">
                  <div><span>Campaigns</span><strong>{skuCampaigns.length}</strong></div>
                  <div><span>Active</span><strong>{skuCampaigns.filter(c=>c.status==="active").length}</strong></div>
                  <div><span>Spend</span><strong>${totals.spend.toFixed(0)}</strong></div>
                  <div><span>Ad Sales</span><strong>${totals.sales.toFixed(0)}</strong></div>
                  <div><span>ACoS</span><strong style={{color: totalAcos > 25 ? "var(--red)" : "var(--fg)"}}>{totals.sales ? totalAcos.toFixed(1) + "%" : "—"}</strong></div>
                  <div><span>RoAS</span><strong>{totals.spend ? totalRoas.toFixed(2) + "x" : "—"}</strong></div>
                </div>

                {showNewCampaign && (
                  <div className="card" style={{margin:"14px 0 0",border:"0.5px solid var(--accent)"}}>
                    <div className="section-title"><h2>새 캠페인 · {skuObj.sku}</h2></div>
                    <div className="sku-form">
                      <label><span>캠페인 이름</span><input className="input" value={newCamp.name} placeholder="예: SP Auto · 메인"
                                                            onChange={(e)=>setNewCamp({...newCamp, name: e.target.value})}/></label>
                      <label><span>광고 유형</span>
                        <select className="input" value={newCamp.type} onChange={(e)=>setNewCamp({...newCamp, type: e.target.value})}>
                          <option>Sponsored Products</option><option>Sponsored Brands</option><option>Sponsored Display</option>
                        </select>
                      </label>
                      <label><span>타겟팅</span>
                        <select className="input" value={newCamp.targeting} onChange={(e)=>setNewCamp({...newCamp, targeting: e.target.value})}>
                          <option>Auto</option><option>Keyword</option><option>Product</option><option>Category</option>
                        </select>
                      </label>
                      <label><span>일일 예산 ($)</span><input className="input" type="number" value={newCamp.budget}
                                                              onChange={(e)=>setNewCamp({...newCamp, budget: parseFloat(e.target.value) || 0})}/></label>
                      <label><span>시작일</span><input className="input" type="date" value={newCamp.startDate}
                                                        onChange={(e)=>setNewCamp({...newCamp, startDate: e.target.value})}/></label>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
                      <button className="btn" onClick={()=>setShowNewCampaign(false)}>취소</button>
                      <button className="btn btn-primary" onClick={addCampaign}>등록</button>
                    </div>
                  </div>
                )}

                {/* Campaign list */}
                <div className="section-title" style={{marginTop:18}}>
                  <h2>캠페인 목록</h2>
                  <span style={{fontSize:12,color:"var(--fg-tertiary)"}}>캠페인을 선택해 Daily Bid를 관리하세요</span>
                </div>

                {skuCampaigns.length === 0 ? (
                  <div className="empty-state">
                    <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>등록된 캠페인이 없습니다</div>
                    <div style={{fontSize:12.5,color:"var(--fg-tertiary)",marginBottom:14}}>이 SKU의 첫 PPC 캠페인을 만들어 보세요.</div>
                    <button className="btn btn-primary" onClick={()=>setShowNewCampaign(true)}><IPlus size={14}/><span>새 캠페인</span></button>
                  </div>
                ) : (
                  <div className="ppc-camp-grid">
                    {skuCampaigns.map(c => {
                      const acos = c.sales ? (c.spend / c.sales * 100) : 0;
                      const roas = c.spend ? (c.sales / c.spend) : 0;
                      const lastBid = c.bids[0]?.bid;
                      return (
                        <button key={c.id} className="ppc-camp-card" onClick={()=>setSelectedCampaign(c.id)}>
                          <div className="ppc-camp-head">
                            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                              <span className={`pill ${c.status === "active" ? "green" : "gray"}`}>{c.status}</span>
                              <span className="pill blue">{c.type.replace("Sponsored ","SP ")}</span>
                              <span className="pill gray">{c.targeting}</span>
                            </div>
                            <span style={{color:"var(--fg-quaternary)"}}><IChev size={14}/></span>
                          </div>
                          <div className="ppc-camp-name">{c.name}</div>
                          <div className="ppc-camp-stats">
                            <div><span>ACoS</span><strong style={{color: acos > 25 ? "var(--red)" : "var(--fg)"}}>{c.sales ? acos.toFixed(1)+"%" : "—"}</strong></div>
                            <div><span>RoAS</span><strong>{c.spend ? roas.toFixed(1)+"x" : "—"}</strong></div>
                            <div><span>Spend</span><strong>${c.spend.toFixed(0)}</strong></div>
                            <div><span>Last Bid</span><strong>{lastBid ? "$"+lastBid.toFixed(2) : "—"}</strong></div>
                          </div>
                          <div className="ppc-camp-foot">
                            <span>{c.bids.length}개 입찰 기록</span>
                            <span>예산 ${c.budget}/일</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>SKU를 선택해주세요</div>
                <div style={{fontSize:12.5,color:"var(--fg-tertiary)"}}>위 셀렉트박스에서 관리할 SKU를 선택하면 캠페인이 표시됩니다.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 3: Daily Bid Log */}
      {sel && (
        <div className="ppc-detail" style={{padding:"calc(20px * var(--density))"}}>
          <div className="ppc-detail-head">
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <code style={{fontSize:12,color:"var(--fg-tertiary)",fontFamily:"var(--font-mono)"}}>{sel.sku}</code>
                <span className={`pill ${sel.status === "active" ? "green" : "gray"}`}>{sel.status}</span>
                <span className="pill blue">{sel.type}</span>
                <span className="pill gray">{sel.targeting}</span>
              </div>
              <h2 style={{margin:0,fontSize:22,fontWeight:600,letterSpacing:"-0.02em"}}>{sel.name}</h2>
              <div style={{fontSize:12,color:"var(--fg-tertiary)",marginTop:4}}>
                {skuObj?.name} · 시작 {sel.startDate} · 일일 예산 ${sel.budget}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn" onClick={()=>setSelectedCampaign(null)}><IChevL size={13}/><span>캠페인 목록</span></button>
              <button className="btn" onClick={()=>toggleStatus(sel)}>{sel.status === "active" ? "일시정지" : "재개"}</button>
              <button className="btn" onClick={()=>removeCampaign(sel)} style={{color:"var(--red)"}}>삭제</button>
            </div>
          </div>

          <div className="ppc-perf">
            <div><span>Impressions</span><strong>{sel.impressions.toLocaleString()}</strong></div>
            <div><span>Clicks</span><strong>{sel.clicks.toLocaleString()}</strong></div>
            <div><span>Orders</span><strong>{sel.orders}</strong></div>
            <div><span>Spend</span><strong>${sel.spend.toFixed(2)}</strong></div>
            <div><span>Ad Sales</span><strong>${sel.sales.toFixed(2)}</strong></div>
            <div><span>ACoS</span><strong style={{color: sel.sales && (sel.spend/sel.sales*100) > 25 ? "var(--red)" : "var(--fg)"}}>{sel.sales ? (sel.spend/sel.sales*100).toFixed(1)+"%" : "—"}</strong></div>
            <div><span>RoAS</span><strong>{sel.spend ? (sel.sales/sel.spend).toFixed(2)+"x" : "—"}</strong></div>
          </div>

          {sel.bids.length > 0 && (
            <div className="card" style={{padding:14,marginTop:14}}>
              <div className="section-title" style={{marginBottom:6}}>
                <h2 style={{fontSize:14}}>입찰가 추이</h2>
                <span style={{fontSize:12,color:"var(--fg-tertiary)",fontVariantNumeric:"tabular-nums"}}>
                  최저 ${Math.min(...sel.bids.map(b=>b.bid)).toFixed(2)} · 최고 ${Math.max(...sel.bids.map(b=>b.bid)).toFixed(2)}
                </span>
              </div>
              {renderBidChart(sel.bids)}
            </div>
          )}

          <div style={{marginTop:14}}>
            <div className="section-title">
              <h2>Daily Bid Log</h2>
              <button className="btn btn-primary" onClick={()=>setDrafting(true)}><IPlus size={14}/><span>입찰가 기록</span></button>
            </div>

            {drafting && (
              <div className="bid-add-row">
                <input className="input" type="date" style={{width:140}} value={bidDraft.date}
                       onChange={(e)=>setBidDraft({...bidDraft, date: e.target.value})}/>
                <input className="input" type="number" step="0.01" style={{width:100}} placeholder="입찰가 ($)" value={bidDraft.bid}
                       onChange={(e)=>setBidDraft({...bidDraft, bid: e.target.value})}/>
                <input className="input" placeholder="메모 (선택)" value={bidDraft.note}
                       onChange={(e)=>setBidDraft({...bidDraft, note: e.target.value})}/>
                <button className="btn" onClick={()=>setDrafting(false)}>취소</button>
                <button className="btn btn-primary" onClick={addBid}>저장</button>
              </div>
            )}

            <table className="table bid-table">
              <thead>
                <tr><th style={{width:130}}>날짜</th><th className="num" style={{width:100}}>입찰가</th>
                  <th className="num" style={{width:80}}>변동</th><th>메모</th><th style={{width:50}}></th></tr>
              </thead>
              <tbody>
                {sel.bids.map((b, i) => {
                  const prev = sel.bids[i+1];
                  const delta = prev ? b.bid - prev.bid : 0;
                  return (
                    <tr key={b.date}>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:12.5}}>{b.date}</td>
                      <td className="num" style={{fontWeight:600,fontSize:14}}>${b.bid.toFixed(2)}</td>
                      <td className="num">
                        {delta !== 0 ? (
                          <span className={`card-delta ${delta > 0 ? "up" : "down"}`}>
                            {delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(2)}
                          </span>
                        ) : <span style={{color:"var(--fg-quaternary)"}}>—</span>}
                      </td>
                      <td style={{color:"var(--fg-secondary)"}}>{b.note || <span style={{color:"var(--fg-quaternary)"}}>—</span>}</td>
                      <td>
                        <button className="icon-btn" onClick={()=>removeBid(b.date)} style={{width:24,height:24,color:"var(--fg-tertiary)"}}>
                          <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l8 8M13 5l-8 8"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sel.bids.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:"center",padding:"30px 0",color:"var(--fg-tertiary)"}}>입찰가 기록이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== TARGETING: SKU → Keyword/ASIN → Daily Bid (3-level drill-down) =====
// Positive: Exact / Phrase / Broad  |  Negative: Exact / Phrase only (Amazon SP)
const POS_MATCH_COLORS = { Exact: "blue", Phrase: "orange", Broad: "gray" };
const NEG_MATCH_COLORS = { Exact: "red", Phrase: "orange" };

export function TargetingPage({ skus, keywords, setKeywords, targetingAsins, setTargetingAsins }) {
  // Navigation
  const [selectedSku,    setSelectedSku]    = useState(skus[0]?.sku || null);
  const [activeTab,      setActiveTab]      = useState("keywords"); // "keywords" | "asins"
  const [kwType,         setKwType]         = useState("positive"); // "positive" | "negative"
  const [asinType,       setAsinType]       = useState("target");   // "target"   | "negative"
  const [selectedKwId,   setSelectedKwId]   = useState(null);       // keyword detail drill-down
  const [selectedAsinId, setSelectedAsinId] = useState(null);       // asin detail drill-down

  // Bid log form (shared between kw and asin detail)
  const [addingBid, setAddingBid] = useState(false);
  const [bidDraft,  setBidDraft]  = useState(() => ({ date: todayISO(), bid: 1.0, note: "" }));

  // Add-new forms
  const [addingKw,   setAddingKw]   = useState(false);
  const [kwDraft,    setKwDraft]    = useState({ keyword: "", match_type: "Exact", startBid: 1.0, note: "" });
  const [addingAsin, setAddingAsin] = useState(false);
  const [asinDraft,  setAsinDraft]  = useState({ asin: "", title: "", startBid: 1.0, note: "" });

  // Auto-select first SKU
  React.useEffect(() => {
    if (!selectedSku && skus.length > 0) setSelectedSku(skus[0].sku);
  }, [skus, selectedSku]);

  // Reset drill-down on context changes
  React.useEffect(() => {
    setSelectedKwId(null); setSelectedAsinId(null);
    setAddingBid(false); setAddingKw(false); setAddingAsin(false);
  }, [selectedSku]);
  React.useEffect(() => { setSelectedKwId(null);   setAddingBid(false); setAddingKw(false);   }, [kwType]);
  React.useEffect(() => { setSelectedAsinId(null); setAddingBid(false); setAddingAsin(false); }, [asinType]);
  React.useEffect(() => { setSelectedKwId(null);   setSelectedAsinId(null); setAddingBid(false); }, [activeTab]);
  React.useEffect(() => {
    setAddingBid(false);
    setBidDraft({ date: todayISO(), bid: 1.0, note: "" });
  }, [selectedKwId, selectedAsinId]);

  // Derived lists
  const skuObj   = skus.find(s => s.sku === selectedSku);
  const skuKws   = keywords.filter(k => k.sku === selectedSku);
  const skuAsins = targetingAsins.filter(a => a.sku === selectedSku);

  const positiveKws   = skuKws.filter(k => (k.keyword_type || "positive") === "positive");
  const negativeKws   = skuKws.filter(k => k.keyword_type === "negative");
  const targetAsins   = skuAsins.filter(a => (a.asin_type || "target") === "target");
  const negativeAsins = skuAsins.filter(a => a.asin_type === "negative");

  const displayedKws   = kwType   === "positive" ? positiveKws  : negativeKws;
  const displayedAsins = asinType === "target"   ? targetAsins  : negativeAsins;

  const selKw   = keywords.find(k => k.id === selectedKwId);
  const selAsin = targetingAsins.find(a => a.id === selectedAsinId);

  // KPI helpers
  const activePosKws      = positiveKws.filter(k => k.status === "active");
  const activeTargetAsins = targetAsins.filter(a => a.status === "active");
  const latestBid = (bids) => bids?.length > 0 ? bids[0].bid : null;
  const newId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "id" + Date.now();

  const POSITIVE_MATCH_TYPES = ["Exact", "Phrase", "Broad"];
  const NEGATIVE_MATCH_TYPES = ["Exact", "Phrase"];

  // ── Keyword CRUD ───────────────────────────────────────────────
  const addKeyword = () => {
    if (!selectedSku || !kwDraft.keyword.trim()) return;
    const isNeg = kwType === "negative";
    setKeywords([...keywords, {
      id: newId(), sku: selectedSku,
      keyword: kwDraft.keyword.trim(), match_type: kwDraft.match_type,
      bids: isNeg ? [] : [{ date: todayISO(), bid: parseFloat(kwDraft.startBid) || 0, note: "첫 입찰가" }],
      status: "active", note: kwDraft.note, keyword_type: kwType,
    }]);
    setKwDraft({ keyword: "", match_type: "Exact", startBid: 1.0, note: "" });
    setAddingKw(false);
  };
  const toggleKwStatus = (id) => setKeywords(keywords.map(k =>
    k.id === id ? { ...k, status: k.status === "active" ? "paused" : "active" } : k
  ));
  const removeKeyword = (id) => {
    if (!confirm("키워드를 삭제하시겠습니까?")) return;
    setKeywords(keywords.filter(k => k.id !== id));
    if (selectedKwId === id) setSelectedKwId(null);
  };

  // ── Keyword Bid CRUD ───────────────────────────────────────────
  const addKwBid = () => {
    if (!selKw) return;
    setKeywords(keywords.map(k => k.id === selKw.id ? {
      ...k, bids: [
        { date: bidDraft.date, bid: parseFloat(bidDraft.bid) || 0, note: bidDraft.note },
        ...(k.bids || []).filter(b => b.date !== bidDraft.date),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    } : k));
    setBidDraft({ date: todayISO(), bid: 1.0, note: "" });
    setAddingBid(false);
  };
  const removeKwBid = (date) => setKeywords(keywords.map(k =>
    k.id === selKw?.id ? { ...k, bids: (k.bids || []).filter(b => b.date !== date) } : k
  ));

  // ── ASIN CRUD ─────────────────────────────────────────────────
  const addAsin = () => {
    if (!selectedSku || !asinDraft.asin.trim()) return;
    const isNeg = asinType === "negative";
    setTargetingAsins([...targetingAsins, {
      id: newId(), sku: selectedSku,
      asin: asinDraft.asin.trim(), title: asinDraft.title,
      bids: isNeg ? [] : [{ date: todayISO(), bid: parseFloat(asinDraft.startBid) || 0, note: "첫 입찰가" }],
      status: "active", note: asinDraft.note, asin_type: asinType,
    }]);
    setAsinDraft({ asin: "", title: "", startBid: 1.0, note: "" });
    setAddingAsin(false);
  };
  const toggleAsinStatus = (id) => setTargetingAsins(targetingAsins.map(a =>
    a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a
  ));
  const removeAsin = (id) => {
    if (!confirm("광고 ASIN을 삭제하시겠습니까?")) return;
    setTargetingAsins(targetingAsins.filter(a => a.id !== id));
    if (selectedAsinId === id) setSelectedAsinId(null);
  };

  // ── ASIN Bid CRUD ──────────────────────────────────────────────
  const addAsinBid = () => {
    if (!selAsin) return;
    setTargetingAsins(targetingAsins.map(a => a.id === selAsin.id ? {
      ...a, bids: [
        { date: bidDraft.date, bid: parseFloat(bidDraft.bid) || 0, note: bidDraft.note },
        ...(a.bids || []).filter(b => b.date !== bidDraft.date),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    } : a));
    setBidDraft({ date: todayISO(), bid: 1.0, note: "" });
    setAddingBid(false);
  };
  const removeAsinBid = (date) => setTargetingAsins(targetingAsins.map(a =>
    a.id === selAsin?.id ? { ...a, bids: (a.bids || []).filter(b => b.date !== date) } : a
  ));

  // ── Helpers ───────────────────────────────────────────────────
  const matchPill = (match_type, keyword_type) => {
    const isNeg = keyword_type === "negative";
    const color = isNeg ? (NEG_MATCH_COLORS[match_type] || "red") : (POS_MATCH_COLORS[match_type] || "gray");
    return <span className={`pill ${color}`}>{isNeg ? `-${match_type}` : match_type}</span>;
  };

  const renderBidChart = (bids) => {
    if (!bids || bids.length === 0) return null;
    const sorted = [...bids].sort((a, b) => a.date.localeCompare(b.date));
    const min = Math.min(...sorted.map(b => b.bid));
    const max = Math.max(...sorted.map(b => b.bid));
    const range = max - min || 1;
    const W = 100, H = 100;
    const pts = sorted.map((b, i) => {
      const x = sorted.length === 1 ? W / 2 : (i / (sorted.length - 1)) * W;
      const y = H - ((b.bid - min) / range) * (H - 20) - 10;
      return [x, y];
    });
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, display: "block" }}>
        <defs>
          <linearGradient id="tbidg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${pts[0][0]} ${H} L ${pts.map(p=>`${p[0]} ${p[1]}`).join(" L ")} L ${pts[pts.length-1][0]} ${H} Z`} fill="url(#tbidg)" />
        <path d={`M ${pts.map(p=>`${p[0]} ${p[1]}`).join(" L ")}`} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="var(--accent)" vectorEffect="non-scaling-stroke" />)}
      </svg>
    );
  };

  // ── Shared bid log section ─────────────────────────────────────
  const BidLog = ({ bids, onAdd, onRemove }) => (
    <div style={{ marginTop: 14 }}>
      <div className="section-title">
        <h2>Daily Bid 기록</h2>
        {!addingBid && (
          <button className="btn btn-primary" onClick={() => setAddingBid(true)}>
            <IPlus size={14} /><span>입찰가 기록</span>
          </button>
        )}
      </div>
      {addingBid && (
        <div className="bid-add-row">
          <input className="input" type="date" style={{ width: 140 }} value={bidDraft.date}
            onChange={(e) => setBidDraft({ ...bidDraft, date: e.target.value })} />
          <input className="input" type="number" step="0.01" style={{ width: 100 }} placeholder="입찰가 ($)"
            value={bidDraft.bid} onChange={(e) => setBidDraft({ ...bidDraft, bid: e.target.value })} />
          <input className="input" placeholder="메모 (선택)" value={bidDraft.note}
            onChange={(e) => setBidDraft({ ...bidDraft, note: e.target.value })} />
          <button className="btn" onClick={() => setAddingBid(false)}>취소</button>
          <button className="btn btn-primary" onClick={onAdd}>저장</button>
        </div>
      )}
      <table className="table bid-table">
        <thead>
          <tr>
            <th style={{ width: 130 }}>날짜</th>
            <th className="num" style={{ width: 100 }}>입찰가</th>
            <th className="num" style={{ width: 80 }}>변동</th>
            <th>메모</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {(bids || []).map((b, i) => {
            const prev  = (bids || [])[i + 1];
            const delta = prev ? b.bid - prev.bid : 0;
            return (
              <tr key={b.date}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{b.date}</td>
                <td className="num" style={{ fontWeight: 600, fontSize: 14 }}>${b.bid.toFixed(2)}</td>
                <td className="num">
                  {delta !== 0
                    ? <span className={`card-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(2)}</span>
                    : <span style={{ color: "var(--fg-quaternary)" }}>—</span>}
                </td>
                <td style={{ color: "var(--fg-secondary)" }}>{b.note || <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>
                <td>
                  <button className="icon-btn" onClick={() => onRemove(b.date)} style={{ width: 24, height: 24, color: "var(--fg-tertiary)" }}>
                    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l8 8M13 5l-8 8" /></svg>
                  </button>
                </td>
              </tr>
            );
          })}
          {(!bids || bids.length === 0) && (
            <tr><td colSpan="5" style={{ textAlign: "center", padding: "30px 0", color: "var(--fg-tertiary)" }}>입찰가 기록이 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (skus.length === 0) return (
    <div className="page">
      <div className="page-header"><div>
        <h1 className="page-title">Targeting</h1>
        <p className="page-subtitle">SKU별 키워드 · 광고 ASIN 관리</p>
      </div></div>
      <div className="empty-state">
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>먼저 SKU를 등록해주세요</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>좌측 메뉴 <strong>SKUs</strong>에서 상품을 먼저 등록하세요.</div>
      </div>
    </div>
  );

  // ── Keyword detail view ────────────────────────────────────────
  const kwDetail = selKw && activeTab === "keywords" && (
    <div className="ppc-detail" style={{ padding: "calc(20px * var(--density))" }}>
      <div className="ppc-detail-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            {matchPill(selKw.match_type, selKw.keyword_type || "positive")}
            <span className={`pill ${selKw.status === "active" ? "green" : "gray"}`}>{selKw.status}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{selKw.keyword}</h2>
          {selKw.note && <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>{selKw.note}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={() => setSelectedKwId(null)}><IChevL size={13} /><span>키워드 목록</span></button>
          <button className="btn" onClick={() => toggleKwStatus(selKw.id)}>{selKw.status === "active" ? "일시정지" : "재개"}</button>
          <button className="btn" onClick={() => removeKeyword(selKw.id)} style={{ color: "var(--red)" }}>삭제</button>
        </div>
      </div>
      <div className="ppc-perf">
        <div><span>최근 입찰가</span><strong>{latestBid(selKw.bids) != null ? "$" + latestBid(selKw.bids).toFixed(2) : "—"}</strong></div>
        <div><span>최저</span><strong>{selKw.bids?.length ? "$" + Math.min(...selKw.bids.map(b=>b.bid)).toFixed(2) : "—"}</strong></div>
        <div><span>최고</span><strong>{selKw.bids?.length ? "$" + Math.max(...selKw.bids.map(b=>b.bid)).toFixed(2) : "—"}</strong></div>
        <div><span>기록 수</span><strong>{selKw.bids?.length ?? 0}개</strong></div>
      </div>
      {selKw.bids?.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 14 }}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <h2 style={{ fontSize: 14 }}>입찰가 추이</h2>
            <span style={{ fontSize: 12, color: "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums" }}>
              최저 ${Math.min(...selKw.bids.map(b=>b.bid)).toFixed(2)} · 최고 ${Math.max(...selKw.bids.map(b=>b.bid)).toFixed(2)}
            </span>
          </div>
          {renderBidChart(selKw.bids)}
        </div>
      )}
      <BidLog bids={selKw.bids} onAdd={addKwBid} onRemove={removeKwBid} />
    </div>
  );

  // ── ASIN detail view ───────────────────────────────────────────
  const asinDetail = selAsin && activeTab === "asins" && (
    <div className="ppc-detail" style={{ padding: "calc(20px * var(--density))" }}>
      <div className="ppc-detail-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <code style={{ fontSize: 12, color: "var(--fg-tertiary)", fontFamily: "var(--font-mono)" }}>{selAsin.asin}</code>
            <span className={`pill ${selAsin.status === "active" ? "green" : "gray"}`}>{selAsin.status}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{selAsin.title || selAsin.asin}</h2>
          {selAsin.note && <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>{selAsin.note}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={() => setSelectedAsinId(null)}><IChevL size={13} /><span>ASIN 목록</span></button>
          <button className="btn" onClick={() => toggleAsinStatus(selAsin.id)}>{selAsin.status === "active" ? "일시정지" : "재개"}</button>
          <button className="btn" onClick={() => removeAsin(selAsin.id)} style={{ color: "var(--red)" }}>삭제</button>
        </div>
      </div>
      <div className="ppc-perf">
        <div><span>최근 입찰가</span><strong>{latestBid(selAsin.bids) != null ? "$" + latestBid(selAsin.bids).toFixed(2) : "—"}</strong></div>
        <div><span>최저</span><strong>{selAsin.bids?.length ? "$" + Math.min(...selAsin.bids.map(b=>b.bid)).toFixed(2) : "—"}</strong></div>
        <div><span>최고</span><strong>{selAsin.bids?.length ? "$" + Math.max(...selAsin.bids.map(b=>b.bid)).toFixed(2) : "—"}</strong></div>
        <div><span>기록 수</span><strong>{selAsin.bids?.length ?? 0}개</strong></div>
      </div>
      {selAsin.bids?.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 14 }}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <h2 style={{ fontSize: 14 }}>입찰가 추이</h2>
            <span style={{ fontSize: 12, color: "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums" }}>
              최저 ${Math.min(...selAsin.bids.map(b=>b.bid)).toFixed(2)} · 최고 ${Math.max(...selAsin.bids.map(b=>b.bid)).toFixed(2)}
            </span>
          </div>
          {renderBidChart(selAsin.bids)}
        </div>
      )}
      <BidLog bids={selAsin.bids} onAdd={addAsinBid} onRemove={removeAsinBid} />
    </div>
  );

  // ── Keyword list table ─────────────────────────────────────────
  const kwList = (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--separator)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="segmented">
          <button aria-pressed={kwType === "positive"} onClick={() => setKwType("positive")}>타겟 키워드 ({positiveKws.length})</button>
          <button aria-pressed={kwType === "negative"} onClick={() => setKwType("negative")}>네거티브 ({negativeKws.length})</button>
        </div>
        <button className="btn btn-primary" onClick={() => setAddingKw(true)} disabled={!selectedSku}>
          <IPlus size={13} /><span>{kwType === "positive" ? "타겟 키워드 추가" : "네거티브 추가"}</span>
        </button>
      </div>
      {kwType === "negative" && (
        <div style={{ padding: "7px 16px", background: "rgba(255,59,48,.06)", borderBottom: "0.5px solid var(--separator)", fontSize: 12, color: "var(--fg-secondary)" }}>
          네거티브 키워드는 해당 검색어에 광고가 노출되지 않도록 제외합니다. Broad 매치는 지원되지 않습니다.
        </div>
      )}
      {addingKw && (
        <div className="bid-add-row" style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--separator)" }}>
          <input className="input" placeholder="키워드" style={{ flex: 2, minWidth: 140 }} value={kwDraft.keyword}
            onChange={(e) => setKwDraft({ ...kwDraft, keyword: e.target.value })} />
          <select className="input" style={{ width: 110 }} value={kwDraft.match_type}
            onChange={(e) => setKwDraft({ ...kwDraft, match_type: e.target.value })}>
            {(kwType === "positive" ? POSITIVE_MATCH_TYPES : NEGATIVE_MATCH_TYPES).map(m => <option key={m}>{m}</option>)}
          </select>
          {kwType === "positive" && (
            <input className="input" type="number" step="0.01" placeholder="시작 입찰가 ($)" style={{ width: 130 }} value={kwDraft.startBid}
              onChange={(e) => setKwDraft({ ...kwDraft, startBid: e.target.value })} />
          )}
          <input className="input" placeholder="메모 (선택)" style={{ flex: 2 }} value={kwDraft.note}
            onChange={(e) => setKwDraft({ ...kwDraft, note: e.target.value })} />
          <button className="btn" onClick={() => setAddingKw(false)}>취소</button>
          <button className="btn btn-primary" onClick={addKeyword}>추가</button>
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>키워드</th>
            <th style={{ width: 120 }}>매치 타입</th>
            {kwType === "positive" && <th className="num" style={{ width: 100 }}>최근 입찰가</th>}
            {kwType === "positive" && <th className="num" style={{ width: 70 }}>기록</th>}
            <th style={{ width: 90 }}>상태</th>
            <th>메모</th>
            <th style={{ width: kwType === "positive" ? 36 : 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {displayedKws.map(k => {
            const lb = latestBid(k.bids);
            return (
              <tr key={k.id} style={{ opacity: k.status === "paused" ? 0.5 : 1, cursor: kwType === "positive" ? "pointer" : "default" }}
                onClick={kwType === "positive" ? () => setSelectedKwId(k.id) : undefined}>
                <td style={{ fontWeight: 500 }}>{k.keyword}</td>
                <td onClick={(e) => e.stopPropagation()}>{matchPill(k.match_type, k.keyword_type || "positive")}</td>
                {kwType === "positive" && <td className="num" style={{ fontWeight: 600 }}>{lb != null ? "$"+lb.toFixed(2) : <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>}
                {kwType === "positive" && <td className="num" style={{ color: "var(--fg-tertiary)" }}>{k.bids?.length ?? 0}</td>}
                <td onClick={(e) => e.stopPropagation()}>
                  <button className={`pill ${k.status === "active" ? "green" : "gray"}`}
                    style={{ cursor: "pointer", border: "none", background: "none", padding: 0 }}
                    onClick={() => toggleKwStatus(k.id)}>{k.status}</button>
                </td>
                <td style={{ color: "var(--fg-secondary)", fontSize: 12.5 }}>{k.note || <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {kwType === "positive"
                    ? <span style={{ color: "var(--fg-quaternary)" }}><IChev size={14} /></span>
                    : <button className="icon-btn" onClick={() => removeKeyword(k.id)} style={{ width: 24, height: 24, color: "var(--fg-tertiary)" }}>
                        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l8 8M13 5l-8 8" /></svg>
                      </button>}
                </td>
              </tr>
            );
          })}
          {displayedKws.length === 0 && (
            <tr><td colSpan={kwType === "positive" ? 7 : 5} style={{ textAlign: "center", padding: "36px 0", color: "var(--fg-tertiary)" }}>
              {selectedSku ? (kwType === "positive" ? "등록된 타겟 키워드가 없습니다." : "등록된 네거티브 키워드가 없습니다.") : "SKU를 먼저 선택하세요."}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ── ASIN list table ────────────────────────────────────────────
  const asinList = (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--separator)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="segmented">
          <button aria-pressed={asinType === "target"} onClick={() => setAsinType("target")}>타겟 ASIN ({targetAsins.length})</button>
          <button aria-pressed={asinType === "negative"} onClick={() => setAsinType("negative")}>네거티브 ({negativeAsins.length})</button>
        </div>
        <button className="btn btn-primary" onClick={() => setAddingAsin(true)} disabled={!selectedSku}>
          <IPlus size={13} /><span>{asinType === "target" ? "타겟 ASIN 추가" : "네거티브 ASIN 추가"}</span>
        </button>
      </div>
      {asinType === "negative" && (
        <div style={{ padding: "7px 16px", background: "rgba(255,59,48,.06)", borderBottom: "0.5px solid var(--separator)", fontSize: 12, color: "var(--fg-secondary)" }}>
          네거티브 ASIN은 해당 상품 페이지에 광고가 노출되지 않도록 제외합니다.
        </div>
      )}
      {addingAsin && (
        <div className="bid-add-row" style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--separator)" }}>
          <input className="input" placeholder="ASIN (예: B0XXXXXX)" style={{ width: 150 }} value={asinDraft.asin}
            onChange={(e) => setAsinDraft({ ...asinDraft, asin: e.target.value })} />
          <input className="input" placeholder="상품명 (선택)" style={{ flex: 2 }} value={asinDraft.title}
            onChange={(e) => setAsinDraft({ ...asinDraft, title: e.target.value })} />
          {asinType === "target" && (
            <input className="input" type="number" step="0.01" placeholder="시작 입찰가 ($)" style={{ width: 130 }} value={asinDraft.startBid}
              onChange={(e) => setAsinDraft({ ...asinDraft, startBid: e.target.value })} />
          )}
          <input className="input" placeholder="메모 (선택)" style={{ flex: 2 }} value={asinDraft.note}
            onChange={(e) => setAsinDraft({ ...asinDraft, note: e.target.value })} />
          <button className="btn" onClick={() => setAddingAsin(false)}>취소</button>
          <button className="btn btn-primary" onClick={addAsin}>추가</button>
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 140 }}>ASIN</th>
            <th>상품명</th>
            {asinType === "target" && <th className="num" style={{ width: 100 }}>최근 입찰가</th>}
            {asinType === "target" && <th className="num" style={{ width: 70 }}>기록</th>}
            <th style={{ width: 90 }}>상태</th>
            <th>메모</th>
            <th style={{ width: asinType === "target" ? 36 : 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {displayedAsins.map(a => {
            const lb = latestBid(a.bids);
            return (
              <tr key={a.id} style={{ opacity: a.status === "paused" ? 0.5 : 1, cursor: asinType === "target" ? "pointer" : "default" }}
                onClick={asinType === "target" ? () => setSelectedAsinId(a.id) : undefined}>
                <td onClick={(e) => e.stopPropagation()}><code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{a.asin}</code></td>
                <td style={{ color: "var(--fg-secondary)", fontSize: 12.5 }}>{a.title || <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>
                {asinType === "target" && <td className="num" style={{ fontWeight: 600 }}>{lb != null ? "$"+lb.toFixed(2) : <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>}
                {asinType === "target" && <td className="num" style={{ color: "var(--fg-tertiary)" }}>{a.bids?.length ?? 0}</td>}
                <td onClick={(e) => e.stopPropagation()}>
                  <button className={`pill ${a.status === "active" ? "green" : "gray"}`}
                    style={{ cursor: "pointer", border: "none", background: "none", padding: 0 }}
                    onClick={() => toggleAsinStatus(a.id)}>{a.status}</button>
                </td>
                <td style={{ color: "var(--fg-secondary)", fontSize: 12.5 }}>{a.note || <span style={{ color: "var(--fg-quaternary)" }}>—</span>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {asinType === "target"
                    ? <span style={{ color: "var(--fg-quaternary)" }}><IChev size={14} /></span>
                    : <button className="icon-btn" onClick={() => removeAsin(a.id)} style={{ width: 24, height: 24, color: "var(--fg-tertiary)" }}>
                        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 5l8 8M13 5l-8 8" /></svg>
                      </button>}
                </td>
              </tr>
            );
          })}
          {displayedAsins.length === 0 && (
            <tr><td colSpan={asinType === "target" ? 7 : 5} style={{ textAlign: "center", padding: "36px 0", color: "var(--fg-tertiary)" }}>
              {selectedSku ? (asinType === "target" ? "등록된 타겟 ASIN이 없습니다." : "등록된 네거티브 ASIN이 없습니다.") : "SKU를 먼저 선택하세요."}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header"><div>
        <h1 className="page-title">Targeting</h1>
        <p className="page-subtitle">SKU별 타겟 · 네거티브 키워드 / 광고 ASIN 관리 · {skus.length}개 SKU</p>
      </div></div>

      <div className="ppc-sku-selector">
        <label className="ppc-sku-selector-label">SKU 선택</label>
        <div className="ppc-sku-selector-row">
          <select className="input ppc-sku-select" value={selectedSku || ""}
            onChange={(e) => setSelectedSku(e.target.value || null)}>
            <option value="">— SKU를 선택하세요 —</option>
            {skus.map(s => <option key={s.sku} value={s.sku}>{s.sku} · {s.name}</option>)}
          </select>
          {skuObj && (
            <div className="ppc-sku-selector-meta">
              <span><span style={{ color: "var(--fg-tertiary)" }}>ASIN</span> <code style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{skuObj.asin}</code></span>
              <span><span style={{ color: "var(--fg-tertiary)" }}>재고</span> <strong>{skuObj.stock}</strong></span>
            </div>
          )}
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label"><span className="ic"><ITarget size={14} /></span><span>타겟 키워드</span></div>
          <div className="kpi-value">{activePosKws.length}<span style={{ fontSize: 16, color: "var(--fg-tertiary)", fontWeight: 500 }}>/{positiveKws.length}</span></div>
          <div className="kpi-meta"><span>활성/전체</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{ background: "rgba(255,59,48,.12)", color: "var(--red)" }}><ITarget size={14} /></span><span>네거티브 KW</span></div>
          <div className="kpi-value">{negativeKws.length}</div>
          <div className="kpi-meta"><span>제외 키워드</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{ background: "rgba(52,199,89,.12)", color: "var(--green)" }}><ITarget size={14} /></span><span>타겟 ASIN</span></div>
          <div className="kpi-value">{activeTargetAsins.length}<span style={{ fontSize: 16, color: "var(--fg-tertiary)", fontWeight: 500 }}>/{targetAsins.length}</span></div>
          <div className="kpi-meta"><span>활성/전체</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="ic" style={{ background: "rgba(255,59,48,.12)", color: "var(--red)" }}><ITarget size={14} /></span><span>네거티브 ASIN</span></div>
          <div className="kpi-value">{negativeAsins.length}</div>
          <div className="kpi-meta"><span>제외 ASIN</span></div>
        </div>
      </div>

      <div className="segmented" style={{ alignSelf: "flex-start" }}>
        <button aria-pressed={activeTab === "keywords"} onClick={() => setActiveTab("keywords")}>키워드 ({skuKws.length})</button>
        <button aria-pressed={activeTab === "asins"}    onClick={() => setActiveTab("asins")}>광고 ASIN ({skuAsins.length})</button>
      </div>

      {activeTab === "keywords" && (selKw ? kwDetail : kwList)}
      {activeTab === "asins"    && (selAsin ? asinDetail : asinList)}
    </div>
  );
}

