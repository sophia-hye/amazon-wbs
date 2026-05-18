import { useState, useMemo } from 'react'

const MONTHS = ['5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// Per-month editable inputs
// paidRatio: 유료광고 매출비율 (%) — primary driver; paidUnits is derived
const INITIAL_INPUTS = [
  { aov: 14.99, targetUnits: 150,  paidRatio: 85, acos: 120, opex: 2200 },
  { aov: 14.99, targetUnits: 500,  paidRatio: 80, acos: 110, opex: 700  },
  { aov: 14.99, targetUnits: 650,  paidRatio: 75, acos: 95,  opex: 700  },
  { aov: 16.99, targetUnits: 700,  paidRatio: 70, acos: 80,  opex: 700  },
  { aov: 17.99, targetUnits: 750,  paidRatio: 65, acos: 75,  opex: 700  },
  { aov: 15.99, targetUnits: 950,  paidRatio: 60, acos: 70,  opex: 700  },
  { aov: 13.99, targetUnits: 1100, paidRatio: 55, acos: 65,  opex: 700  },
  { aov: 14.99, targetUnits: 1250, paidRatio: 50, acos: 60,  opex: 700  },
]

// Unit rates & fee parameters (global settings)
// logistics / tariff / inboundPlacementFee are all per unit SOLD
// (amortised over sold units, same as spreadsheet formula)
const DEFAULT_RATES = {
  inboundRatio:         115,    // % of target sales → FBA 입고 수량
  commissionRate:        20,    // % Amazon Jewelry Referral Fee
  refundRate:             4,    // % of revenue
  fbaFee:              3.81,    // $/unit sold — FBA Service Commission
  fbaStorageFee:       0.004,   // $/unit/month (end inventory)
  professionalPlan:      40,    // $/month
  inboundPlacementFee:  0.46,   // $/unit sold (FBA inbound placement)
  logistics:            0.55,   // $/unit sold (CN-US 직수입 물류비)
  tariff:               0.315,  // $/unit sold (수입관세)
  cogs:                 2.10,   // $/unit sold
  packaging:            0.35,   // $/unit sold (패키징/브랜딩/Prep)
}

function calcAll(inputs, rates) {
  const commRate = rates.commissionRate / 100
  const refRate  = rates.refundRate / 100
  const results  = []
  let prevEndStock = 0
  let cumProfit    = 0

  for (let i = 0; i < inputs.length; i++) {
    const m = inputs[i]

    // ── 예상 목표
    const fbqty         = Math.round(m.targetUnits * rates.inboundRatio / 100)
    const targetRevenue = m.aov * m.targetUnits

    // ── 유료 매출
    // paidRevenue = targetRevenue × paidRatio% (matches sheet formula)
    const paidRatioDec = m.paidRatio / 100
    const paidRevenue  = targetRevenue * paidRatioDec
    const paidUnits    = Math.round(m.targetUnits * paidRatioDec)
    const adSpend      = paidRevenue * (m.acos / 100)

    // ── 오가닉 매출
    // organicRevenue = targetRevenue × (1 - paidRatio%) — same as sheet
    const organicRatioDec = 1 - paidRatioDec
    const organicUnits    = m.targetUnits - paidUnits
    const organicRevenue  = targetRevenue * organicRatioDec

    // ── 수수료
    const refund       = targetRevenue * refRate
    const commission   = targetRevenue * commRate
    const fbaService   = m.targetUnits * rates.fbaFee
    const endStock     = prevEndStock + fbqty - m.targetUnits
    const endInventory = Math.max(0, endStock)
    const storage      = endInventory * rates.fbaStorageFee
    const profPlan     = rates.professionalPlan

    // ── 유통/물류 — per unit SOLD (amortised, matches spreadsheet)
    const inboundFee    = m.targetUnits * rates.inboundPlacementFee
    const logisticsCost = m.targetUnits * rates.logistics

    // ── 통관비 — per unit sold
    const tariffCost = m.targetUnits * rates.tariff

    // ── 제조원가
    const cogsCost = m.targetUnits * rates.cogs

    // ── 판관비
    const packagingCost = m.targetUnits * rates.packaging
    const opex          = m.opex

    // ── 비용 합계
    const totalCost = adSpend + refund + commission + fbaService + storage
                    + profPlan + inboundFee + logisticsCost + tariffCost
                    + cogsCost + packagingCost + opex

    // ── 손익
    const operatingProfit = targetRevenue - totalCost
    const operatingMargin = targetRevenue > 0 ? operatingProfit / targetRevenue : 0
    cumProfit += operatingProfit

    // ── 재고
    // inventoryCash: 입고 기준 — fbqty × total landed cost per inbound unit
    const landedCostPerInbound = rates.cogs
                                + rates.logistics    // per sold → same amortised base
                                + rates.tariff
                                + rates.inboundPlacementFee
                                + rates.packaging
    const inventoryCash = fbqty * landedCostPerInbound

    // ── 단위경제 (광고·고정비 제외)
    const contributionMargin   = m.aov * (1 - refRate - commRate)
                                 - rates.fbaFee - rates.cogs - rates.packaging
    const adSpendPerUnit       = m.targetUnits > 0 ? adSpend / m.targetUnits : 0
    const contributionAfterAd  = contributionMargin - adSpendPerUnit
    const breakEvenAcos        = m.aov > 0 ? Math.max(0, contributionMargin) / m.aov : 0

    results.push({
      fbqty, targetRevenue,
      paidRatioDec, paidRevenue, paidUnits, adSpend,
      organicRatioDec, organicUnits, organicRevenue,
      refund, commission, fbaService, storage, profPlan,
      inboundFee, logisticsCost,
      tariffCost,
      cogsCost,
      packagingCost, opex,
      totalCost, operatingProfit, operatingMargin, cumProfit,
      endInventory, inventoryCash,
      contributionMargin, adSpendPerUnit, contributionAfterAd, breakEvenAcos,
    })
    prevEndStock = endInventory
  }
  return results
}

// ── formatters
const f$ = (v) => {
  if (!isFinite(v)) return '–'
  const abs = Math.abs(v)
  const s   = abs >= 10000 ? `$${Math.round(abs).toLocaleString()}`
            : abs >= 100   ? `$${abs.toFixed(0)}`
            :                `$${abs.toFixed(2)}`
  return v < 0 ? `(${s})` : s
}
const fN  = (v) => isFinite(v) ? Math.round(v).toLocaleString() : '–'
const fP  = (v) => isFinite(v) ? `${(v * 100).toFixed(2)}%` : '–'
const fPp = (v) => isFinite(v) ? `${(v * 100).toFixed(1)}%` : '–'

// ── Sub-components
function SectionRow({ label }) {
  return (
    <tr className="sim-section-row">
      <td colSpan={9}>{label}</td>
    </tr>
  )
}

function ValCell({ v, fmt = f$, extra = '' }) {
  const neg = typeof v === 'number' && v < 0
  return (
    <td className={`sim-val${extra ? ' ' + extra : ''}${neg ? ' sim-neg' : ''}`}>
      {fmt(v)}
    </td>
  )
}

function InputCell({ idx, field, inputs, onChange, prefix, suffix, step = 'any', min }) {
  return (
    <td className="sim-in">
      <label className="sim-in-wrap">
        {prefix && <span className="sim-pre">{prefix}</span>}
        <input
          type="number"
          step={step}
          min={min}
          className="sim-inp"
          value={inputs[idx][field]}
          onChange={(e) => onChange(idx, field, e.target.value)}
        />
        {suffix && <span className="sim-suf">{suffix}</span>}
      </label>
    </td>
  )
}

function FeeInput({ label, value, onChange, unit, step = 'any' }) {
  return (
    <div className="sim-fee-item">
      <span className="sim-fee-label">{label}</span>
      <div className="sim-fee-ctrl">
        <input
          type="number"
          step={step}
          className="sim-fee-inp"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="sim-fee-unit">{unit}</span>
      </div>
    </div>
  )
}

export function SimulationPage() {
  const [inputs, setInputs]             = useState(INITIAL_INPUTS)
  const [rates, setRates]               = useState(DEFAULT_RATES)
  const [showSettings, setShowSettings] = useState(false)

  const calc = useMemo(() => calcAll(inputs, rates), [inputs, rates])

  const handleCell = (idx, field, raw) => {
    const v = parseFloat(raw)
    if (raw === '' || raw === '-') return
    if (isNaN(v)) return
    setInputs((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: v } : m))
  }

  const handleRate = (field, raw) => {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setRates((prev) => ({ ...prev, [field]: v }))
  }

  const ic = (idx, field, opts = {}) => ({ idx, field, inputs, onChange: handleCell, ...opts })

  return (
    <div className="page simulation-page">
      {/* ── Header */}
      <div className="page-header">
        <div>
          <div className="page-title">매출 시뮬레이션</div>
          <div className="page-subtitle">
            릴라헤이븐 Amazon US 2026년 5~12월 · 파란색 셀 입력 시 자동 계산
          </div>
        </div>
        <button className="btn" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? '설정 닫기' : '단가 · 수수료 설정'}
        </button>
      </div>

      {/* ── Rate settings panel */}
      {showSettings && (
        <div className="sim-settings">
          <FeeInput label="FBA 입고 비율 (목표판매량 대비)" value={rates.inboundRatio} step="1"
            onChange={(v) => handleRate('inboundRatio', v)} unit="%" />
          <FeeInput label="Amazon 판매 수수료율 (Jewelry)" value={rates.commissionRate} step="0.1"
            onChange={(v) => handleRate('commissionRate', v)} unit="%" />
          <FeeInput label="반품 / 환불 충당율" value={rates.refundRate} step="0.1"
            onChange={(v) => handleRate('refundRate', v)} unit="%" />
          <FeeInput label="FBA Service Commission / unit 판매" value={rates.fbaFee} step="0.01"
            onChange={(v) => handleRate('fbaFee', v)} unit="$" />
          <FeeInput label="FBA 보관료 / unit / 월" value={rates.fbaStorageFee} step="0.001"
            onChange={(v) => handleRate('fbaStorageFee', v)} unit="$" />
          <FeeInput label="Professional Selling Plan" value={rates.professionalPlan} step="1"
            onChange={(v) => handleRate('professionalPlan', v)} unit="$/월" />
          <FeeInput label="FBA 인바운드 배치 수수료 / unit 판매" value={rates.inboundPlacementFee} step="0.01"
            onChange={(v) => handleRate('inboundPlacementFee', v)} unit="$" />
          <FeeInput label="CN-US 물류비 / unit 판매" value={rates.logistics} step="0.01"
            onChange={(v) => handleRate('logistics', v)} unit="$" />
          <FeeInput label="수입관세 / unit 판매" value={rates.tariff} step="0.001"
            onChange={(v) => handleRate('tariff', v)} unit="$" />
          <FeeInput label="제조원가 / unit" value={rates.cogs} step="0.01"
            onChange={(v) => handleRate('cogs', v)} unit="$" />
          <FeeInput label="패키징 / 브랜딩 / Prep / unit" value={rates.packaging} step="0.01"
            onChange={(v) => handleRate('packaging', v)} unit="$" />
        </div>
      )}

      {/* ── Spreadsheet */}
      <div className="sim-scroll">
        <table className="sim-tbl">
          <thead>
            <tr>
              <th className="sim-lbl-th">항목</th>
              {MONTHS.map((m) => <th key={m} className="sim-mo-th">{m}</th>)}
            </tr>
          </thead>
          <tbody>

            {/* ════ 예상 목표 ════ */}
            <SectionRow label="예상 목표" />
            <tr className="sim-input-row">
              <td className="sim-lbl">아마존 소비자 가격 (AOV, $)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'aov', { prefix: '$', step: '0.01' })} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-calc-lbl">FBA 입고 수량 (목표 × {rates.inboundRatio}%)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.fbqty} fmt={fN} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">목표 월간판매량 (개)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'targetUnits', { suffix: '개', step: '1', min: '0' })} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-bold">목표 월간매출 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.targetRevenue} extra="sim-bold" />)}
            </tr>

            {/* ════ 유료 매출 ════ */}
            <SectionRow label="유료 매출" />
            <tr>
              <td className="sim-lbl sim-calc-lbl">판매량 (개)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.paidUnits} fmt={fN} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">유료광고 매출비율 (%)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'paidRatio', { suffix: '%', step: '1', min: '0' })} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-calc-lbl">유료광고 매출액 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.paidRevenue} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">ACoS</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'acos', { suffix: '%', step: '0.1' })} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-bold sim-cost-lbl">내부 유료광고 지출비용 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.adSpend} extra="sim-bold sim-cost" />)}
            </tr>

            {/* ════ 오가닉 매출 ════ */}
            <SectionRow label="오가닉 매출" />
            <tr>
              <td className="sim-lbl sim-calc-lbl">판매량 (개)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicUnits} fmt={fN} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-calc-lbl">오가닉 매출비율 (전체 매출의 %)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicRatioDec} fmt={fP} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-calc-lbl">오가닉 매출액 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicRevenue} />)}
            </tr>

            {/* ════ 수수료 ════ */}
            <SectionRow label="수수료" />
            <tr>
              <td className="sim-lbl sim-cost-lbl">반품/환불충당금 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.refund} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">Sales Commission — Jewelry Referral Fee {rates.commissionRate}%</td>
              {calc.map((c, i) => <ValCell key={i} v={c.commission} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA Service Commission / Fulfillment ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.fbaService} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA Storage Fee ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.storage} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">Professional Selling Plan ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.profPlan} extra="sim-cost" />)}
            </tr>

            {/* ════ 유통/물류 ════ */}
            <SectionRow label="유통/물류" />
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA inbound placement fee ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.inboundFee} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">CN-US 직수입/아마존 FBA 입고 물류비 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.logisticsCost} extra="sim-cost" />)}
            </tr>

            {/* ════ 통관비 ════ */}
            <SectionRow label="통관비" />
            <tr>
              <td className="sim-lbl sim-cost-lbl">상호 수입관세 / Duties ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.tariffCost} extra="sim-cost" />)}
            </tr>

            {/* ════ 제조원가 ════ */}
            <SectionRow label="제조원가" />
            <tr>
              <td className="sim-lbl sim-cost-lbl">Unit 당 제품 제조원가 합계 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.cogsCost} extra="sim-cost" />)}
            </tr>

            {/* ════ 판관비 ════ */}
            <SectionRow label="판관비" />
            <tr>
              <td className="sim-lbl sim-cost-lbl">패키징/브랜딩/Prep ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.packagingCost} extra="sim-cost" />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">운영고정비/툴/CS/콘텐츠 ($)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'opex', { prefix: '$', step: '100' })} />)}
            </tr>

            {/* ════ 비용 합계 ════ */}
            <SectionRow label="비용 합계" />
            <tr>
              <td className="sim-lbl sim-bold sim-cost-lbl">총비용 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.totalCost} extra="sim-bold sim-cost" />)}
            </tr>

            {/* ════ 합산 영업이익 ════ */}
            <SectionRow label="합산 영업이익" />
            <tr>
              <td className="sim-lbl sim-bold">영업이익 ($)</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val sim-bold ${c.operatingProfit >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.operatingProfit)}
                </td>
              ))}
            </tr>

            {/* ════ 합산 영업이익률 ════ */}
            <SectionRow label="합산 영업이익률" />
            <tr>
              <td className="sim-lbl">영업이익률</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.operatingMargin >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {fPp(c.operatingMargin)}
                </td>
              ))}
            </tr>

            {/* ════ 누적 영업이익 ════ */}
            <SectionRow label="누적 영업이익" />
            <tr>
              <td className="sim-lbl sim-bold">누적 영업이익 ($)</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val sim-bold ${c.cumProfit >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.cumProfit)}
                </td>
              ))}
            </tr>

            {/* ════ 재고 ════ */}
            <SectionRow label="재고" />
            <tr>
              <td className="sim-lbl">월말 재고수량 (개)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.endInventory} fmt={fN} />)}
            </tr>
            <tr>
              <td className="sim-lbl">입고 기준 재고현금 ($)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.inventoryCash} />)}
            </tr>

            {/* ════ 단위경제 ════ */}
            <SectionRow label="단위경제" />
            <tr>
              <td className="sim-lbl">공헌이익/개 — 광고·고정비 제외 ($)</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.contributionMargin >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.contributionMargin)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl">광고 후 공헌이익/개 ($)</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.contributionAfterAd >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.contributionAfterAd)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl">Break-even ACoS (광고매출 기준)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.breakEvenAcos} fmt={fPp} />)}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}
