# Amazon Operations WBS

아마존 이커머스 셀러 운영관리를 위한 WBS(Work Breakdown Structure) 대시보드.

상품 등록, FBA 입고, PPC 광고, 고객 응대, 정산, 분석/리포팅까지 6대 운영 영역의 작업 항목을 한 곳에서 트래킹합니다.

## 주요 기능

- 6대 운영 영역 × 세부 카테고리 × 작업 카드
- 작업별 우선순위(높음/보통/낮음), 빈도(매일/매주/매월/분기/1회성), 예상 소요시간, 사용 도구, 산출물 표시
- 카드 클릭으로 `대기 → 진행중 → 완료` 상태 순환
- 영역별/전체 진행률 자동 계산
- 진행 상태 브라우저 로컬 저장 (자동 복원)

## 기술 스택

- Vite + React 18 + TypeScript
- Tailwind CSS v4
- GitHub Actions로 GitHub Pages 자동 배포

## 로컬 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## 배포

`main` 브랜치에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 자동으로 빌드 후 GitHub Pages에 배포합니다.

배포 전 GitHub 저장소 설정에서 한 번만 활성화 필요:

1. Repository → **Settings** → **Pages**
2. **Source**: `GitHub Actions` 선택

배포 URL: `https://sophia-hye.github.io/amazon-wbs/`

> 저장소 이름이 바뀌면 `vite.config.ts`의 `base` 값도 함께 수정해야 합니다.
