-- ============================================================
-- Simulation: 릴라헤이븐 Amazon US 2026년 5~12월
-- Source: 매출 & 비용 시뮬레이션 스프레드시트
-- Supabase SQL Editor에서 schema.sql 실행 후 이 파일 실행
-- 재실행 안전: skus·daily_metrics는 ON CONFLICT, 나머지는 중복 방지 처리
-- ============================================================

-- ── 1. SKU ────────────────────────────────────────────────────
INSERT INTO skus (sku, name, asin, price, units, sales, acos, roas, stock, bsr, status)
VALUES (
  'LILA-001',
  '릴라헤이븐',
  '',
  14.99,    -- Dec AOV
  1250,     -- Dec 목표 판매량
  18738,    -- Dec 월매출
  60.00,    -- Dec ACoS (%)
  1.67,     -- Dec ROAS (paid sales / ad spend)
  910,      -- Dec 월말 재고
  0,
  'active'
)
ON CONFLICT (sku) DO UPDATE SET
  name   = EXCLUDED.name,
  price  = EXCLUDED.price,
  units  = EXCLUDED.units,
  sales  = EXCLUDED.sales,
  acos   = EXCLUDED.acos,
  roas   = EXCLUDED.roas,
  stock  = EXCLUDED.stock,
  status = EXCLUDED.status;

-- ── 2. Monthly metrics (월 1일 기준 1행/월) ───────────────────
-- date        sku         sales    orders  acos
INSERT INTO daily_metrics (date, sku, sales, orders, acos) VALUES
  ('2026-05-01', 'LILA-001',  2249,   150, 120.00),
  ('2026-06-01', 'LILA-001',  7495,   500, 110.00),
  ('2026-07-01', 'LILA-001',  9744,   650,  95.00),
  ('2026-08-01', 'LILA-001', 11893,   700,  80.00),
  ('2026-09-01', 'LILA-001', 13493,   750,  75.00),
  ('2026-10-01', 'LILA-001', 15191,   950,  70.00),
  ('2026-11-01', 'LILA-001', 15389,  1100,  65.00),
  ('2026-12-01', 'LILA-001', 18738,  1250,  60.00)
ON CONFLICT (date, sku) DO UPDATE SET
  sales  = EXCLUDED.sales,
  orders = EXCLUDED.orders,
  acos   = EXCLUDED.acos;

-- ── 3. PPC Campaign ──────────────────────────────────────────
-- 총 누적치: 광고비 $52,572 / 유료매출 $59,257 / 유료주문 3,794건
INSERT INTO campaigns (sku, name, type, targeting, status, start_date, budget, spend, sales, orders)
SELECT
  'LILA-001', '릴라헤이븐 SP Auto', 'Sponsored Products', 'Auto',
  'active', '2026-05-01', 300.00, 52572.00, 59257.00, 3794
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns WHERE sku = 'LILA-001' AND name = '릴라헤이븐 SP Auto'
);

-- ── 4. Monthly operation logs ────────────────────────────────
-- metrics JSON: { sales($), orders(개), acos(%) }

INSERT INTO logs (date, title, body, metrics)
SELECT v.d::date, v.t, v.b, v.m::jsonb
FROM (VALUES
  ('2026-05-31',
   '5월 운영 요약',
   '런칭 첫 달. 유료광고 의존도 85%, ACoS 120%. 목표 판매량 150개 달성. 초기 광고비 집중 집행으로 누적 손실 -$3,962. 오가닉 비중 15% 진입.',
   '{"sales":2249,"orders":150,"acos":120}'),
  ('2026-06-30',
   '6월 운영 요약',
   '판매량 500개로 3배 이상 성장. ACoS 110%로 소폭 개선. 오가닉 비중 20% 달성. 누적 손실 -$9,394.',
   '{"sales":7495,"orders":500,"acos":110}'),
  ('2026-07-31',
   '7월 운영 요약',
   '판매량 650개. ACoS 95%로 개선 추세. 오가닉 비중 25% 달성. 누적 손실 -$14,601.',
   '{"sales":9744,"orders":650,"acos":95}'),
  ('2026-08-31',
   '8월 운영 요약',
   '가격 $16.99으로 인상 후 판매량 700개 유지. ACoS 80%로 개선. 오가닉 30% 달성. 누적 손실 -$18,271.',
   '{"sales":11893,"orders":700,"acos":80}'),
  ('2026-09-30',
   '9월 운영 요약',
   '가격 $17.99. 판매량 750개. ACoS 75%. 오가닉 35% 달성. 누적 손실 -$21,023.',
   '{"sales":13493,"orders":750,"acos":75}'),
  ('2026-10-31',
   '10월 운영 요약',
   '가격 $15.99으로 조정, 판매량 950개로 확대. ACoS 70%. 오가닉 40% 달성. 누적 손실 -$23,806.',
   '{"sales":15191,"orders":950,"acos":70}'),
  ('2026-11-30',
   '11월 운영 요약',
   'Black Friday/Cyber Monday 시즌. 가격 $13.99으로 할인 공세. 판매량 1,100개. ACoS 65%. 오가닉 45%. 누적 손실 -$26,698.',
   '{"sales":15389,"orders":1100,"acos":65}'),
  ('2026-12-31',
   '12월 운영 요약',
   '크리스마스 시즌 최대 매출. 판매량 1,250개, 월매출 $18,738. ACoS 60%, 오가닉 50% 달성. 누적 손실 -$28,303. 연말 재고 910개.',
   '{"sales":18738,"orders":1250,"acos":60}')
) AS v(d, t, b, m)
WHERE NOT EXISTS (
  SELECT 1 FROM logs WHERE date = v.d::date AND title = v.t
);

-- ── 5. Keywords (타겟 · 네거티브 샘플) ──────────────────────────
INSERT INTO keywords (sku, keyword, match_type, keyword_type, bids, status, note, created_at)
SELECT v.sku, v.kw, v.mt, v.kt, v.bids::jsonb, 'active', v.note, '2026-05-01'::date
FROM (VALUES
  ('LILA-001', 'lilahaven', 'Exact', 'positive',
   '[{"date":"2026-05-01","bid":1.20,"note":"첫 입찰가"},{"date":"2026-07-01","bid":1.50,"note":"노출 증가"},{"date":"2026-09-01","bid":1.80,"note":"ACoS 개선 후 상향"}]',
   'Brand KW'),
  ('LILA-001', 'lila haven', 'Phrase', 'positive',
   '[{"date":"2026-05-01","bid":1.00,"note":"첫 입찰가"},{"date":"2026-08-01","bid":1.30,"note":"CTR 상승"}]',
   'Brand variation'),
  ('LILA-001', 'natural hair serum', 'Broad', 'positive',
   '[{"date":"2026-05-01","bid":0.80,"note":"첫 입찰가"},{"date":"2026-06-01","bid":1.00,"note":"노출 확대"},{"date":"2026-10-01","bid":1.20,"note":"피크시즌"}]',
   'Generic KW'),
  ('LILA-001', 'hair growth serum', 'Exact', 'positive',
   '[{"date":"2026-05-01","bid":1.50,"note":"첫 입찰가"},{"date":"2026-07-01","bid":1.80,"note":"상위 노출"},{"date":"2026-11-01","bid":2.00,"note":"BF 시즌"}]',
   'High-intent KW'),
  ('LILA-001', 'hair oil for men', 'Phrase', 'negative',
   '[]',
   '타겟 외 성별 제외'),
  ('LILA-001', 'cheap hair product', 'Exact', 'negative',
   '[]',
   '저가 검색어 제외')
) AS v(sku, kw, mt, kt, bids, note)
WHERE NOT EXISTS (
  SELECT 1 FROM keywords WHERE sku = v.sku AND keyword = v.kw AND keyword_type = v.kt
);

-- ── 6. Targeting ASINs (타겟 · 네거티브 샘플) ──────────────────
INSERT INTO targeting_asins (sku, asin, title, asin_type, bids, status, note, created_at)
SELECT v.sku, v.asin, v.title, v.at, v.bids::jsonb, 'active', v.note, '2026-05-01'::date
FROM (VALUES
  ('LILA-001', 'B0CXHAIR01', 'Competitor Hair Serum A', 'target',
   '[{"date":"2026-05-01","bid":0.75,"note":"첫 입찰가"},{"date":"2026-08-01","bid":1.00,"note":"노출 확대"}]',
   '경쟁사 메인 ASIN'),
  ('LILA-001', 'B0CXHAIR02', 'Competitor Hair Serum B', 'target',
   '[{"date":"2026-06-01","bid":0.80,"note":"첫 입찰가"}]',
   '유사 상품'),
  ('LILA-001', 'B0CXHAIR03', 'Unrelated Hair Clip Set', 'negative',
   '[]',
   '관련 없는 카테고리 제외')
) AS v(sku, asin, title, at, bids, note)
WHERE NOT EXISTS (
  SELECT 1 FROM targeting_asins WHERE sku = v.sku AND asin = v.asin
);
