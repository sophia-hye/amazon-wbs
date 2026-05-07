# Amazon Operations WBS · SKU · PPC

아마존 셀러 운영을 위한 통합 대시보드. **WBS·간트 / 캘린더 / 일일·주간 로그 / SKU 관리 / PPC 캠페인** 7개 페이지를 한 곳에서 사용합니다. 데이터는 PostgreSQL (Supabase)에 저장되어 어떤 기기에서 접속해도 동일하게 보입니다.

## 주요 기능

- **Dashboard**: 매출/주문/TACoS/TRoAS KPI, 14일 매출 추이, 다가오는 일정, 전체 작업 진행률
- **WBS**: 트리 + 동적 Gantt (작업 일정에 맞춰 자동 범위 계산), 하위 작업 무한 분해
- **Calendar**: 월간 뷰, 빈 셀 더블클릭으로 일정 추가
- **Daily / Weekly Log**: 매일 운영 기록 + 자동 주간 집계 + 회고 노트
- **SKUs**: 상품별 매출/광고/재고 CRUD, 검색·필터
- **PPC**: SKU → 캠페인 → Daily Bid 3단계 드릴다운, 입찰가 추이 차트
- **테마/설정**: 다크모드, 포인트 컬러, 정보 밀도, 타이포 크기, 사이드바 접기

## 기술 스택

- **Frontend**: Vite + React 18 (JSX, no TypeScript on UI), Apple-style design tokens (`src/styles.css`)
- **Database**: Supabase PostgreSQL (8개 테이블, RLS + permissive policies)
- **Hosting**: GitHub Pages (`base: '/amazon-wbs/'`)
- **CI/CD**: GitHub Actions로 main 푸시 시 자동 빌드·배포

## Supabase 설정 (최초 1회)

데이터를 영속화하려면 Supabase 프로젝트가 필요합니다. **무료 티어(500MB DB, 50K MAU)로 충분**합니다.

### 1. Supabase 프로젝트 생성

1. https://supabase.com 가입 후 **New Project** 클릭
2. **Region**: `Northeast Asia (Seoul)` 권장 (한국에서 가장 빠름)
3. **Database password**는 강력하게 설정 후 안전하게 보관 (DB 직접 접속 시 필요)
4. 1-2분 대기

### 2. 스키마 생성

1. 좌측 메뉴 **SQL Editor → New query**
2. 이 저장소의 [`supabase/schema.sql`](./supabase/schema.sql) 전체 내용 복사 → 붙여넣기 → **Run**
3. 8개 테이블, RLS 정책, `truncate_all_user_data()` 함수, `updated_at` 트리거가 생성됩니다

### 3. API 키 확보

좌측 메뉴 **Project Settings → API**에서 두 값을 복사:

- **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
- **Project API keys → anon public**: `eyJhbGc...` (⚠ `service_role`이 아니라 `anon` 키)

### 4. 로컬 환경 설정

저장소 루트에 `.env.local` 파일을 만듭니다 (git-ignored):

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

dev 서버 재시작:

```bash
npm install
npm run dev
```

브라우저에서 SKU/일정 등을 추가한 뒤 새로고침하거나 다른 기기에서 접속해도 그대로 유지되면 성공입니다.

### 5. GitHub Pages 배포 secret 등록

배포된 사이트도 같은 DB에 접근해야 하므로 GitHub Actions가 빌드 시 환경변수를 알아야 합니다.

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
2. 두 개 추가:
   - `VITE_SUPABASE_URL` ← 위 4단계의 Project URL
   - `VITE_SUPABASE_ANON_KEY` ← anon key
3. main 브랜치에 push하면 자동으로 빌드 → 배포

배포 URL: https://sophia-hye.github.io/amazon-wbs/

## 보안 주의사항 (현 단계)

현재는 **단일 사용자 / 인증 없음** 구성입니다.

- anon 키는 클라이언트 번들에 포함되어 누구나 인스펙터로 확인 가능
- RLS 정책은 `USING (true) WITH CHECK (true)` (전체 허용)
- 즉, **Supabase URL을 알면 누구나 데이터 읽기·쓰기 가능**

✅ **개인 사용** 또는 **저장소를 비공개**로 운영한다면 충분합니다.
⚠️ **공개 배포·다중 사용자** 환경에서는 인증을 먼저 추가하세요. 향후 단계에서 Supabase Auth 또는 Clerk 통합 예정.

## 로컬 개발

```bash
npm install
npm run dev       # http://localhost:5173/amazon-wbs/
npm run build     # 프로덕션 빌드
npm run preview   # 프로덕션 미리보기
```

`.env.local`에 Supabase 키를 안 넣으면 앱은 동작하지만 우측 상단에 경고 배너가 뜨고 변경사항이 저장되지 않습니다.

## 디렉토리 구조

```
src/
├── App.jsx                  # 메인 셸 + 사이드바 + Tweaks 패널
├── main.jsx                 # 진입점
├── styles.css               # Apple 디자인 토큰
├── icons.jsx                # SF-Symbols 풍 SVG 아이콘
├── pages.jsx                # Dashboard / WBS / Calendar / Daily Log
├── sku-ppc.jsx              # SKU / PPC
├── tweaks-panel.jsx         # 우하단 설정 패널 (다크모드, 컬러 등)
├── usePersisted.js          # localStorage 헬퍼 (UI-only 상태)
├── lib/
│   └── supabase.js          # Supabase 클라이언트
└── hooks/
    ├── useSupabaseTable.js      # 일반 array CRUD 동기화
    ├── useSupabaseSingleRow.js  # profile 단일행 upsert
    ├── useSupabaseWBS.js        # WBS 트리 ↔ flat 변환
    ├── useSupabaseDoneMap.js    # task_done 테이블 동기화
    └── useSupabaseWraps.js      # weekly_wraps 동기화

supabase/
└── schema.sql               # 1회 실행하는 DB 스키마
```

## 다음 단계 (PDCA Plan: `seller-tool-fullstack`)

1. **Auth 추가**: Supabase Auth (이메일·OAuth) → RLS를 `auth.uid()` 기반으로 강화
2. **SP-API 연동**: Supabase Edge Functions로 카탈로그·재고·정산 자동 동기화
3. **Amazon Ads API 연동**: PPC 성과 자동 수집 + 입찰 변경 mutation + 감사 로그
4. **자동화**: Vercel/Supabase Cron으로 일별 KPI 스냅샷, 이상치 알림

자세한 계획은 [`docs/01-plan/features/seller-tool-fullstack.plan.md`](./docs/01-plan/features/seller-tool-fullstack.plan.md) 참고.
