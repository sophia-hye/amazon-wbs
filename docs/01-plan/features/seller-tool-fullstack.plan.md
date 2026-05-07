---
template: plan
version: 1.2
feature: seller-tool-fullstack
date: 2026-05-07
author: sophia
project: amazon-wbs
project_version: 0.1.0
status: Draft
---

# seller-tool-fullstack Planning Document

> **Summary**: 정적 WBS 체크리스트 사이트를 Amazon SP-API/Ads API와 연동되는 SKU·PPC 관리 풀스택 운영 도구로 확장한다.
>
> **Project**: amazon-wbs
> **Version**: 0.1.0 → 0.2.0 (target)
> **Author**: sophia
> **Date**: 2026-05-07
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 amazon-wbs는 운영 작업 항목을 수동 체크하는 정적 사이트다. 실제 셀러 운영에서는 SP-API에서 가져온 **실시간 데이터(SKU 마스터, 재고, 주문, PPC 성과)** 를 기반으로 의사결정과 일부 쓰기 작업(입찰 조정 등)이 일어나야 한다. 이 문서는 정적 WBS의 가치를 유지하면서 데이터 기반 운영 도구로 진화시키기 위한 계획을 정의한다.

### 1.2 Background

- **사용 대상**: 소규모 팀 (2-5명), 단일 또는 소수 Seller Central 계정 운영
- **현재 한계**: 작업 체크 외 데이터 자동 수집 불가, 시크릿 관리 불가, 멀티 유저 협업 불가
- **상위 의사결정**(이전 대화 요약):
  - 풀스택 구조: **Next.js + Postgres + Vercel** (옵션 B 채택)
  - mutation 범위: 읽기 + 간단한 쓰기 (PPC 입찰 조정, SKU 메모/태그)
- **외부 의존성**: SP-API Developer 등록(영업일 1-3일), Amazon Ads API 별도 등록

### 1.3 Related Documents

- 기존 WBS 데이터: `src/data/wbs.ts`
- 배포 워크플로우: `.github/workflows/deploy.yml`
- Amazon SP-API 문서: https://developer-docs.amazon.com/sp-api/
- Amazon Ads API 문서: https://advertising.amazon.com/API/docs/

---

## 2. Scope

### 2.1 In Scope

- [ ] Vite SPA를 **Next.js 14+ App Router**로 마이그레이션 (기존 WBS UI 이식)
- [ ] **인증** (Clerk 또는 Supabase Auth) — 팀원 초대/권한
- [ ] **Postgres 스키마**: User, Workspace, SkuMaster, AdCampaign, AdKeyword, SyncLog, WbsTaskState
- [ ] **SP-API 연동**: Catalog Items, Listings, FBA Inventory, Orders, Reports (Settlement V2)
- [ ] **Amazon Ads API 연동**: Campaigns, AdGroups, Keywords, Reports (성과 일자별)
- [ ] **SKU 관리**: 카탈로그 sync → 마스터 저장 → 메모/태그/내부 단가 추가 → 손익 계산
- [ ] **PPC 관리**: 캠페인/키워드 성과 조회 + 입찰 변경 mutation (감사 로그 필수)
- [ ] **Vercel Cron**: 일별 Reports/Settlement 백그라운드 동기화
- [ ] **WBS 진행 상태** Postgres 이전 (현재 localStorage)
- [ ] CI/CD: Vercel 자동 배포, GitHub Pages 배포 워크플로우는 deprecate

### 2.2 Out of Scope

- 결제/구독 (단일 워크스페이스 가정)
- 다국가 셀러 (US 마켓 우선, EU/JP 추후)
- 이미지/A+ Content 편집 (조회만)
- 자동화 룰 엔진 (조건부 자동 입찰) — Phase 4 옵션
- 모바일 앱
- 멀티 테넌트 SaaS 청구 시스템

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자는 이메일로 가입/로그인하고 워크스페이스에 초대받을 수 있다 | High | Pending |
| FR-02 | 워크스페이스 관리자는 SP-API Refresh Token, Ads API 자격증명을 등록/회전할 수 있다 | High | Pending |
| FR-03 | 시스템은 Catalog Items API에서 SKU 메타데이터를 동기화하고 SkuMaster 테이블에 저장한다 | High | Pending |
| FR-04 | 사용자는 SKU에 내부 메모, 태그, 원가, 손익 임계값을 추가/수정할 수 있다 | High | Pending |
| FR-05 | 시스템은 매일 새벽 Settlement Report와 FBA 재고 스냅샷을 자동 동기화한다 (Vercel Cron) | High | Pending |
| FR-06 | 사용자는 Sponsored Products 캠페인/키워드 성과를 조회하고 ACoS/TACoS 추이를 본다 | High | Pending |
| FR-07 | 사용자는 키워드 단위로 입찰가를 변경할 수 있고, 변경 이력은 감사 로그에 기록된다 | High | Pending |
| FR-08 | 기존 WBS 6대 영역 체크리스트가 Next.js 페이지로 이식되고 진행 상태는 DB에 저장된다 | High | Pending |
| FR-09 | 대시보드는 매출/광고비/순이익/IPI/Account Health 핵심 지표를 한 화면에 표시한다 | Medium | Pending |
| FR-10 | 모든 SP-API/Ads API 호출은 서버 측에서만 수행되며 시크릿은 클라이언트에 노출되지 않는다 | High | Pending |
| FR-11 | API rate limit 초과 시 지수 백오프로 재시도하고 SyncLog에 결과를 남긴다 | Medium | Pending |
| FR-12 | 사용자는 자신의 워크스페이스 데이터만 볼 수 있다 (Row-Level Security) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 대시보드 초기 로드 LCP < 2.5s (캐시된 데이터 기준) | Vercel Analytics, Lighthouse |
| Performance | API 라우트 응답 P95 < 500ms (DB 쿼리 한정) | Vercel logs |
| Security | 시크릿은 환경변수/Vercel Encrypted Env에만 저장, 코드 push 시 시크릿 스캔 | gitleaks, Vercel env |
| Security | OWASP Top 10 대응 (특히 A01 권한, A07 인증, A08 무결성) | 수동 체크리스트 + security-reviewer 에이전트 |
| Reliability | Cron 잡 실패 시 알림 (Slack/Email), 24시간 이내 재시도 성공 95%+ | SyncLog 통계 |
| Compliance | SP-API Data Protection Policy(고객 PII 분리 보관, 30일 retention 등) 준수 | 정책 체크리스트 |
| Accessibility | WCAG 2.1 AA (대시보드 핵심 인터랙션) | axe-core 자동 검증 |
| Cost | 월 인프라 비용 < $30 (Vercel Hobby + Neon Free + Clerk Free 한도 내) | 청구서 추적 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-12 모두 구현 및 수동 시나리오 테스트 통과
- [ ] Vite 프로젝트 deprecate, GitHub Pages → Vercel 배포 전환
- [ ] SP-API/Ads API 호출 단위 테스트 + 통합 테스트(모의 응답) 작성
- [ ] 코드 리뷰 (security-reviewer + code-reviewer 에이전트) 통과
- [ ] README + 운영 가이드 (`docs/operations.md`) 작성

### 4.2 Quality Criteria

- [ ] 단위 + 통합 테스트 커버리지 ≥ 80%
- [ ] TypeScript strict 모드, lint 0 에러
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 90
- [ ] 빌드 성공 + Preview 배포 검증
- [ ] gitleaks 스캔 0 leak
- [ ] PDCA Match Rate ≥ 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **SP-API Developer 승인 지연** (1-7일 소요 가능) | High | Medium | Phase 1과 병렬 진행, 승인 전엔 모의 응답으로 개발 |
| **Ads API 별도 OAuth 흐름** 복잡성 | Medium | High | SP-API와 분리된 인증 모듈, 통합 테스트 우선 |
| **Vite → Next.js 마이그레이션 중 회귀** | High | Medium | 별도 디렉토리 (`apps/web-next`) 병행 운영, WBS UI는 마지막에 이식 |
| **SP-API rate limit** (초당/시간당 제한) | Medium | High | 토큰 버킷 + 큐, Cron 분산 실행, 캐시 우선 |
| **PPC 입찰 mutation 사고** (잘못된 입찰가 일괄 변경) | High | Low | 변경 전 confirm modal, 일괄 변경 상한, 감사 로그, dry-run 모드 |
| **PII/주문 데이터 처리** SP-API DPP 정책 위반 | High | Medium | 주문 PII 필드는 표시만 하고 저장 금지, 로그 마스킹 |
| **Vercel/Neon 무료 한도 초과** | Medium | Medium | 사용량 모니터링, 캐시 적극 활용, Pro 전환 비용 사전 검토 |
| **마이그레이션 중 기존 WBS 사용자 작업 손실** (localStorage → DB) | Medium | Low | 1회성 import UI 제공, 기존 Vite 사이트 1개월 병행 운영 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs, fullstack apps | **☑** |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

**Rationale**: 소규모 팀 + 풀스택 + 외부 API 통합 + 멀티 유저. Enterprise는 과한 엔지니어링.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / Remix / Vite SPA | **Next.js 14+ (App Router)** | 서버 컴포넌트로 SP-API 시크릿 보호, Route Handlers, Vercel 통합 |
| Language | TypeScript / JavaScript | **TypeScript (strict)** | 기존 코드 일관성, API 응답 타입 안전성 |
| State Management | Context / Zustand / Redux / Jotai | **Zustand + React Query (TanStack)** | 서버 상태는 RQ, 클라 UI 상태는 Zustand 가볍게 |
| Auth | NextAuth / Clerk / Supabase Auth | **Clerk** | 팀 초대/조직 기능 즉시 사용, UI 컴포넌트 제공, MVP 속도 |
| DB | Postgres (Neon) / Postgres (Supabase) / PlanetScale | **Neon Postgres** | Vercel 통합 우수, branch별 DB, serverless cold start 양호 |
| ORM | Prisma / Drizzle / Kysely | **Prisma** | 마이그레이션·툴링 성숙, 학습곡선 낮음 |
| API Client (server) | fetch / axios / 공식 SDK | **공식 amazon-sp-api (Node) + axios for Ads API** | 공식 SDK 우선, Ads는 axios로 직접 |
| Form Handling | react-hook-form / formik | **react-hook-form + zod** | 표준 조합, RSC와 호환 |
| Styling | Tailwind / CSS Modules | **Tailwind CSS v4** | 기존 코드 일관성 |
| Testing | Jest / Vitest / Playwright | **Vitest (단위/통합) + Playwright (E2E 핵심 흐름)** | Vite/Next 둘 다 친화 |
| Background Jobs | Vercel Cron / Inngest / 자체 Worker | **Vercel Cron (Phase 1) → Inngest (Phase 4 시 이전)** | 일별 동기화엔 Cron 충분, 복잡 워크플로 시 Inngest |
| Backend | BaaS / Custom Server / Serverless | **Next.js Route Handlers + Server Actions (Vercel Serverless)** | Dynamic 레벨 + 멀티 유저 + 외부 API 시크릿 처리 |
| Deployment | Vercel / Netlify / 자체 호스팅 | **Vercel** | Next.js 1급 시민, Cron/Edge 통합 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure (Next.js App Router):
amazon-wbs/
├── apps/
│   ├── web-next/                  # 신규 Next.js 앱 (병행 개발)
│   │   ├── app/
│   │   │   ├── (auth)/            # 로그인/가입
│   │   │   ├── (dashboard)/       # 인증된 사용자 영역
│   │   │   │   ├── overview/      # 대시보드
│   │   │   │   ├── wbs/           # 기존 WBS 이식
│   │   │   │   ├── sku/           # SKU 관리
│   │   │   │   ├── ppc/           # PPC 관리
│   │   │   │   └── settings/      # 워크스페이스/API 자격증명
│   │   │   ├── api/               # Route Handlers
│   │   │   │   ├── sp-api/        # SP-API 프록시
│   │   │   │   ├── ads-api/       # Ads API 프록시
│   │   │   │   └── cron/          # Vercel Cron 엔드포인트
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── sku/
│   │   │   ├── ppc/
│   │   │   └── wbs/
│   │   ├── services/
│   │   │   ├── sp-api/            # 공식 SDK 래퍼
│   │   │   ├── ads-api/
│   │   │   └── sync/              # Cron 핸들러
│   │   ├── lib/
│   │   │   ├── db.ts              # Prisma client
│   │   │   ├── auth.ts            # Clerk helpers
│   │   │   └── env.ts             # zod-검증 환경변수
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── tests/
│   └── web/                       # 기존 Vite SPA (deprecate 예정)
└── docs/
```

> Phase 1 동안 기존 Vite 프로젝트는 `apps/web/`로 이동하거나 `legacy/` 처리하고, 신규 Next.js를 `apps/web-next/`에 만들어 병행 개발한다. WBS UI 이식 완료 후 Vercel 도메인으로 단일화.

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section — **missing** (user-level CLAUDE.md만 존재)
- [ ] `docs/01-plan/conventions.md` exists — **missing**
- [ ] `CONVENTIONS.md` exists at project root — **missing**
- [ ] ESLint configuration — **missing** (Vite 기본 외)
- [ ] Prettier configuration — **missing**
- [x] TypeScript configuration (`tsconfig.json`) — exists

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 부분적 (camelCase 컴포넌트) | 라우트/API/DB 모델/env 명명 규칙 | High |
| **Folder structure** | Vite 기준 정의됨 | Next.js App Router 폴더 규약 | High |
| **Import order** | 미정 | eslint-plugin-import 설정 | Medium |
| **Environment variables** | 없음 | `lib/env.ts` zod 스키마 | High |
| **Error handling** | 미정 | API Route 표준 에러 응답 포맷 | Medium |
| **Audit logging** | 없음 | mutation은 반드시 AuditLog 테이블 기록 | High |
| **Secret rotation** | 없음 | 90일 주기, 절차 문서화 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `DATABASE_URL` | Neon Postgres 연결 | Server | ☐ |
| `DIRECT_URL` | Prisma 마이그레이션용 직접 연결 | Server | ☐ |
| `CLERK_SECRET_KEY` | Clerk 서버측 키 | Server | ☐ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 클라이언트 키 | Client | ☐ |
| `SP_API_LWA_CLIENT_ID` | SP-API LWA 앱 ID | Server | ☐ |
| `SP_API_LWA_CLIENT_SECRET` | SP-API LWA 시크릿 | Server | ☐ |
| `SP_API_REFRESH_TOKEN` | Self-Authorize 리프레시 토큰 | Server | ☐ |
| `SP_API_REGION` | NA / EU / FE | Server | ☐ |
| `ADS_API_CLIENT_ID` | Ads API LWA 클라이언트 ID | Server | ☐ |
| `ADS_API_CLIENT_SECRET` | Ads API LWA 시크릿 | Server | ☐ |
| `ADS_API_REFRESH_TOKEN` | Ads API 리프레시 토큰 | Server | ☐ |
| `ADS_API_PROFILE_ID` | 광고 프로필 ID | Server | ☐ |
| `CRON_SECRET` | Vercel Cron 호출 검증 | Server | ☐ |
| `ENCRYPTION_KEY` | 워크스페이스별 자격증명 암호화 키 (저장 시 암호화) | Server | ☐ |

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | `/pipeline-next` |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | `/pipeline-next` |

---

## 8. Phased Delivery Plan

상세 단계는 Design 문서에서 확정한다. 본 Plan에서는 큰 마일스톤만 정의.

| Phase | 기간(추정) | 범위 | Done 조건 |
|-------|-----------|------|----------|
| **P1. 풀스택 베이스라인** | 1-2주 | Next.js 스캐폴딩, Clerk, Neon, Prisma, 기존 WBS UI 이식, Vercel 배포 | 로그인 후 WBS 페이지 정상 동작, 진행 상태 DB 저장 |
| **P2. SP-API + SKU 관리** | 1-2주 | SP-API Developer 등록, Catalog/Inventory sync, SKU CRUD + 메모/태그 | SKU 목록·상세, 일별 재고 스냅샷 |
| **P3. PPC 관리 (R/W)** | 2-3주 | Ads API 연동, 캠페인/키워드 조회, 입찰 변경 + 감사 로그 | PPC 대시보드, dry-run 검증 통과 |
| **P4. 자동화 + 알림** | 1-2주 (옵션) | Cron으로 Settlement·매출 일별 집계, 이상치 알림 | 일별 KPI 리포트 자동 생성 |

각 Phase는 자체 PDCA 사이클을 가질 수 있다 (`/pdca plan p1-baseline` 등 하위 feature로 분기 가능).

---

## 9. Next Steps

1. [ ] 본 Plan 문서 리뷰 및 In-Scope/Out-of-Scope 합의
2. [ ] **SP-API Developer 등록 시작** (병렬 진행, 승인까지 1-7일)
3. [ ] **Amazon Ads API 등록 시작** (병렬)
4. [ ] `/pdca design seller-tool-fullstack`으로 설계 문서 작성
   - DB 스키마(Prisma) 상세, API 라우트 인터페이스, 인증 흐름, 폴더 구조 확정
5. [ ] Phase 1 구현 시작 (`/pdca do seller-tool-fullstack`)

---

## 10. Open Questions

설계 단계 진입 전 확정해야 할 항목:

1. **Auth 선택 재검토**: Clerk이 운영비/UI 측면 추천, 다만 Self-host 선호 시 Supabase Auth 또는 NextAuth + Postgres 어댑터로 변경 가능. (기본 추천: Clerk)
2. **워크스페이스 모델**: 단일 워크스페이스 vs 사용자당 다중 워크스페이스. (기본 추천: 단일 워크스페이스 + 멤버 초대)
3. **SP-API Refresh Token 저장 방식**: 환경변수만 vs DB 암호화 저장. 멀티 셀러 계정 가능성 있으면 DB 저장 + KMS 암호화. (기본 추천: 단계적 — P1은 env, P3 이후 DB+암호화)
4. **기존 Vite 프로젝트 처리**: 즉시 deprecate vs Next.js 이전 1개월 병행. (기본 추천: 1개월 병행 후 archived 처리)
5. **모노레포 도구**: Turborepo/pnpm workspace 도입 여부. (기본 추천: pnpm workspace로 시작, 빌드 캐시 필요해지면 Turborepo)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-07 | Initial draft (PDCA Plan phase) | sophia |
