import { useState, useMemo } from 'react'

const MONTHS = ['5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const INITIAL_INPUTS = [
  { aov: 14.99, fbqty: 2000, targetUnits: 150,  paidUnits: 128,  acos: 120, logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 14.99, fbqty: 0,    targetUnits: 500,  paidUnits: 400,  acos: 110, logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 14.99, fbqty: 2000, targetUnits: 650,  paidUnits: 488,  acos: 95,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 16.99, fbqty: 0,    targetUnits: 700,  paidUnits: 490,  acos: 80,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 17.99, fbqty: 1500, targetUnits: 750,  paidUnits: 488,  acos: 75,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 15.99, fbqty: 0,    targetUnits: 950,  paidUnits: 570,  acos: 70,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 13.99, fbqty: 1500, targetUnits: 1100, paidUnits: 605,  acos: 65,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
  { aov: 14.99, fbqty: 0,    targetUnits: 1250, paidUnits: 625,  acos: 60,  logistics: 2.00, tariff: 0.50, cogs: 4.00, opex: 1000 },
]

const DEFAULT_FEES = {
  fbaFee: 3.22,
  storageFee: 0.10,
  commissionRate: 15,
  refundRate: 2,
  professionalPlan: 40,
  inboundPlacementFee: 0.30,
}

function calcAll(inputs, fees) {
  const commRate = fees.commissionRate / 100
  const refRate  = fees.refundRate / 100
  const results  = []
  let prevEndStock = 0
  let cumProfit    = 0

  for (let i = 0; i < inputs.length; i++) {
    const m = inputs[i]

    // ── Revenue
    const targetRevenue  = m.aov * m.targetUnits
    const paidRevenue    = m.aov * m.paidUnits
    const paidRatio      = m.targetUnits > 0 ? m.paidUnits / m.targetUnits : 0
    const adSpend        = paidRevenue * (m.acos / 100)
    const organicUnits   = Math.max(0, m.targetUnits - m.paidUnits)
    const organicRatio   = m.targetUnits > 0 ? organicUnits / m.targetUnits : 0
    const organicRevenue = m.aov * organicUnits

    // ── Costs
    const refund         = targetRevenue * refRate
    const commission     = targetRevenue * commRate
    const fbaService     = m.targetUnits * fees.fbaFee
    const endStock       = prevEndStock + m.fbqty - m.targetUnits
    const endInventory   = Math.max(0, endStock)
    const storage        = endInventory * fees.storageFee
    const profPlan       = fees.professionalPlan
    const inboundFee     = m.fbqty * fees.inboundPlacementFee
    const logisticsCost  = m.targetUnits * m.logistics
    const tariffCost     = m.targetUnits * m.tariff
    const cogsCost       = m.targetUnits * m.cogs

    const totalCost = adSpend + refund + commission + fbaService + storage
                    + profPlan + inboundFee + logisticsCost + tariffCost
                    + cogsCost + m.opex

    // ── P&L
    const operatingProfit = targetRevenue - totalCost
    const operatingMargin = targetRevenue > 0 ? operatingProfit / targetRevenue : 0
    cumProfit += operatingProfit

    // ── Inventory
    const inventoryCash = endInventory * m.cogs

    // ── Unit economics
    // Contribution margin per unit (before ad spend)
    const contributionMargin = m.aov * (1 - refRate - commRate)
                             - fees.fbaFee - m.logistics - m.tariff - m.cogs
    const adSpendPerUnit     = m.targetUnits > 0 ? adSpend / m.targetUnits : 0
    const contributionAfterAd = contributionMargin - adSpendPerUnit
    // Break-even ACoS = (contribution margin before ad) / paid-unit AOV
    const breakEvenAcos = m.aov > 0 ? Math.max(0, contributionMargin) / m.aov : 0

    results.push({
      targetRevenue, paidRevenue, paidRatio, adSpend,
      organicUnits, organicRatio, organicRevenue,
      refund, commission, fbaService, storage, profPlan, inboundFee,
      logisticsCost, tariffCost, cogsCost,
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
  return v < 0 ? `-${s}` : s
}
const fN  = (v) => isFinite(v) ? Math.round(v).toLocaleString() : '–'
const fP  = (v) => isFinite(v) ? `${(v * 100).toFixed(1)}%` : '–'
const fPr = (v) => isFinite(v) ? `${(v * 100).toFixed(1)}%` : '–'

// ── Row sub-components
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
    <td className={`sim-val ${extra}${neg ? ' sim-neg' : ''}`}>
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

export function SimulationPage() {
  const [inputs, setInputs]       = useState(INITIAL_INPUTS)
  const [fees, setFees]           = useState(DEFAULT_FEES)
  const [showSettings, setShowSettings] = useState(false)

  const calc = useMemo(() => calcAll(inputs, fees), [inputs, fees])

  const handleCell = (idx, field, raw) => {
    const v = parseFloat(raw)
    if (raw === '' || raw === '-') return
    if (isNaN(v)) return
    setInputs((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: v } : m))
  }

  const handleFee = (field, raw) => {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setFees((prev) => ({ ...prev, [field]: v }))
  }

  // shared props for InputCell
  const ic = (idx, field, opts = {}) => ({
    idx, field, inputs, onChange: handleCell, ...opts,
  })

  return (
    <div className="page simulation-page">
      {/* ── Header */}
      <div className="page-header">
        <div>
          <div className="page-title">매출 시뮬레이션</div>
          <div className="page-subtitle">릴라헤이븐 Amazon US 2026년 5~12월 · 입력값 변경 시 자동 계산</div>
        </div>
        <button className="btn" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? '설정 닫기' : '수수료 · 요율 설정'}
        </button>
      </div>

      {/* ── Fee settings panel */}
      {showSettings && (
        <div className="sim-settings">
          <FeeInput label="FBA 수수료 / unit" value={fees.fbaFee} onChange={(v) => handleFee('fbaFee', v)} unit="$" />
          <FeeInput label="FBA 보관료 / unit / 월" value={fees.storageFee} onChange={(v) => handleFee('storageFee', v)} unit="$" />
          <FeeInput label="Amazon 판매 수수료율" value={fees.commissionRate} onChange={(v) => handleFee('commissionRate', v)} unit="%" />
          <FeeInput label="반품 / 환불 충당율" value={fees.refundRate} onChange={(v) => handleFee('refundRate', v)} unit="%" />
          <FeeInput label="Professional Selling Plan" value={fees.professionalPlan} onChange={(v) => handleFee('professionalPlan', v)} unit="$/월" />
          <FeeInput label="인바운드 배치 수수료 / unit" value={fees.inboundPlacementFee} onChange={(v) => handleFee('inboundPlacementFee', v)} unit="$" />
        </div>
      )}

      {/* ── Spreadsheet table */}
      <div className="sim-scroll">
        <table className="sim-tbl">
          <thead>
            <tr>
              <th className="sim-lbl-th">항목</th>
              {MONTHS.map((m) => <th key={m} className="sim-mo-th">{m}</th>)}
            </tr>
          </thead>
          <tbody>

            {/* ════ 입력값 ════ */}
            <SectionRow label="입력값 (직접 입력)" />

            <tr className="sim-input-row">
              <td className="sim-lbl">소비자 가격 (AOV)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'aov', { prefix: '$', step: '0.01' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">FBA 입고 수량</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'fbqty', { suffix: '개', step: '1', min: '0' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">목표 월간 판매량</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'targetUnits', { suffix: '개', step: '1', min: '0' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">유료매출 판매량</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'paidUnits', { suffix: '개', step: '1', min: '0' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">ACoS</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'acos', { suffix: '%', step: '0.1' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">물류비 / unit</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'logistics', { prefix: '$', step: '0.01' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">수입관세 / unit</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'tariff', { prefix: '$', step: '0.01' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">제조원가 / unit</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'cogs', { prefix: '$', step: '0.01' })} />)}
            </tr>
            <tr className="sim-input-row">
              <td className="sim-lbl">판관비 (월 고정)</td>
              {inputs.map((_, i) => <InputCell key={i} {...ic(i, 'opex', { prefix: '$', step: '10' })} />)}
            </tr>

            {/* ════ 매출 분석 ════ */}
            <SectionRow label="매출 분석" />

            <tr>
              <td className="sim-lbl sim-bold">목표 월간매출</td>
              {calc.map((c, i) => <ValCell key={i} v={c.targetRevenue} extra="sim-bold" />)}
            </tr>
            <tr>
              <td className="sim-lbl">유료광고 매출비율</td>
              {calc.map((c, i) => <ValCell key={i} v={c.paidRatio} fmt={fP} />)}
            </tr>
            <tr>
              <td className="sim-lbl">유료광고 매출액</td>
              {calc.map((c, i) => <ValCell key={i} v={c.paidRevenue} />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">광고비 지출 (Ad Spend)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.adSpend} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl">오가닉 판매량</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicUnits} fmt={fN} />)}
            </tr>
            <tr>
              <td className="sim-lbl">오가닉 매출비율</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicRatio} fmt={fP} />)}
            </tr>
            <tr>
              <td className="sim-lbl">오가닉 매출액</td>
              {calc.map((c, i) => <ValCell key={i} v={c.organicRevenue} />)}
            </tr>

            {/* ════ 비용 분석 ════ */}
            <SectionRow label="비용 분석" />

            <tr>
              <td className="sim-lbl sim-cost-lbl">반품 / 환불충당금</td>
              {calc.map((c, i) => <ValCell key={i} v={c.refund} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">Sales Commission ({fees.commissionRate}%)</td>
              {calc.map((c, i) => <ValCell key={i} v={c.commission} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA 서비스 수수료</td>
              {calc.map((c, i) => <ValCell key={i} v={c.fbaService} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA 보관료</td>
              {calc.map((c, i) => <ValCell key={i} v={c.storage} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">Professional Selling Plan</td>
              {calc.map((c, i) => <ValCell key={i} v={c.profPlan} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">FBA 인바운드 배치 수수료</td>
              {calc.map((c, i) => <ValCell key={i} v={c.inboundFee} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">물류비 합계</td>
              {calc.map((c, i) => <ValCell key={i} v={c.logisticsCost} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">수입관세 합계</td>
              {calc.map((c, i) => <ValCell key={i} v={c.tariffCost} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">제조원가 합계</td>
              {calc.map((c, i) => <ValCell key={i} v={c.cogsCost} extra="sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-cost-lbl">판관비</td>
              {inputs.map((m, i) => <ValCell key={i} v={m.opex} extra="sim-cost" />)}
            </tr>

            {/* ════ 손익 요약 ════ */}
            <SectionRow label="손익 요약" />

            <tr>
              <td className="sim-lbl sim-bold sim-cost-lbl">총 비용</td>
              {calc.map((c, i) => <ValCell key={i} v={c.totalCost} extra="sim-bold sim-cost" />)}
            </tr>
            <tr>
              <td className="sim-lbl sim-bold">영업이익</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val sim-bold ${c.operatingProfit >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.operatingProfit)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl">영업이익률</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.operatingMargin >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {fP(c.operatingMargin)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl sim-bold">누적 영업이익</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val sim-bold ${c.cumProfit >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.cumProfit)}
                </td>
              ))}
            </tr>

            {/* ════ 재고 ════ */}
            <SectionRow label="재고" />

            <tr>
              <td className="sim-lbl">월말 재고수량</td>
              {calc.map((c, i) => <ValCell key={i} v={c.endInventory} fmt={fN} />)}
            </tr>
            <tr>
              <td className="sim-lbl">재고현금</td>
              {calc.map((c, i) => <ValCell key={i} v={c.inventoryCash} />)}
            </tr>

            {/* ════ 단위 경제 ════ */}
            <SectionRow label="단위 경제 (Unit Economics)" />

            <tr>
              <td className="sim-lbl">공헌이익 / unit</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.contributionMargin >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.contributionMargin)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl">광고 후 공헌이익 / unit</td>
              {calc.map((c, i) => (
                <td key={i} className={`sim-val ${c.contributionAfterAd >= 0 ? 'sim-pos' : 'sim-neg'}`}>
                  {f$(c.contributionAfterAd)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sim-lbl">Break-even ACoS</td>
              {calc.map((c, i) => <ValCell key={i} v={c.breakEvenAcos} fmt={fPr} />)}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}

function FeeInput({ label, value, onChange, unit }) {
  return (
    <div className="sim-fee-item">
      <span className="sim-fee-label">{label}</span>
      <div className="sim-fee-ctrl">
        <input
          type="number"
          step="any"
          className="sim-fee-inp"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="sim-fee-unit">{unit}</span>
      </div>
    </div>
  )
}
