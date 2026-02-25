# E2E Testing Guide

Playwright를 사용한 Exam Platform Frontend E2E(End-to-End) 테스트 가이드이다.

---

## 개요

| 항목 | 값 |
|------|-----|
| 프레임워크 | Playwright |
| 브라우저 | Chromium (Desktop Chrome) |
| 테스트 디렉토리 | `frontend/e2e/tests/` |
| 실행 모드 | 순차 실행 (단일 Worker, `fullyParallel: false`) |
| CI Retry | 2회 |
| Reporter | HTML + JSON + List |

---

## 디렉토리 구조

```
frontend/e2e/
├── .auth/                         # 인증 상태 저장 (StorageState)
│   ├── teacher.json               # Teacher 로그인 상태
│   └── student.json               # Student 로그인 상태
├── helpers/                       # 공통 Helper 함수
│   ├── auth.helper.ts             # 로그인/로그아웃, 토큰 관리
│   ├── api.helper.ts              # API 직접 호출 유틸리티
│   ├── assertions.helper.ts       # 공통 Assertion 함수
│   ├── data-factory.helper.ts     # 테스트 데이터 생성 (계정, 문제 등)
│   ├── selectors.ts               # 공통 CSS Selector 상수
│   ├── theme.helper.ts            # 테마(Light/Dark) 관련
│   └── time.helper.ts             # 시간 관련 유틸리티
├── tests/
│   ├── auth/                      # 인증
│   │   ├── auth.setup.ts          # Setup: Teacher/Student 계정 생성 및 상태 저장
│   │   ├── login.spec.ts          # 로그인 테스트
│   │   └── register.spec.ts       # 회원가입 테스트
│   ├── teacher/                   # Teacher 기능
│   │   ├── question.spec.ts       # 문제 관리
│   │   ├── question-crud.spec.ts  # 문제 CRUD
│   │   ├── testpaper.spec.ts      # 시험지 관리
│   │   ├── testpaper-crud.spec.ts # 시험지 CRUD
│   │   ├── examination.spec.ts    # 시험 관리
│   │   ├── examination-crud.spec.ts       # 시험 CRUD
│   │   ├── examination-validation.spec.ts # 시험 유효성 검증
│   │   └── student-enrollment.spec.ts     # 학생 등록
│   ├── student/                   # Student 기능
│   │   ├── exam-take.spec.ts      # 시험 응시
│   │   ├── exam-advanced.spec.ts  # 시험 고급 시나리오
│   │   └── exam-time-boundary.spec.ts     # 시험 시간 경계 테스트
│   ├── dashboard/                 # Dashboard
│   │   ├── dashboard.spec.ts      # Dashboard 기본
│   │   ├── dashboard-integration.spec.ts  # Dashboard 통합
│   │   └── chart-interaction.spec.ts      # Chart 상호작용
│   ├── layout/                    # Layout
│   │   ├── sidebar-improvements.spec.ts   # Sidebar 개선
│   │   └── sidebar-mobile.spec.ts         # 모바일 Sidebar
│   ├── profile/                   # Profile
│   │   └── profile-management.spec.ts     # 프로필 관리
│   ├── common/                    # 공통 UI
│   │   ├── form-validation.spec.ts        # 폼 유효성 검증
│   │   └── search-filter.spec.ts          # 검색/필터
│   ├── validation/                # Validation
│   │   └── form-validation.spec.ts        # 폼 검증 상세
│   ├── integration/               # 통합 테스트
│   │   ├── full-exam-flow.spec.ts         # 전체 시험 플로우
│   │   └── data-integrity.spec.ts         # 데이터 무결성
│   ├── security/                  # 보안
│   │   ├── rbac.spec.ts           # Role 기반 접근 제어
│   │   └── error-cases.spec.ts    # 에러 케이스
│   ├── edge-cases/                # 엣지 케이스
│   │   ├── accessibility.spec.ts  # 접근성
│   │   ├── mobile-responsive.spec.ts      # 모바일 반응형
│   │   ├── network-error.spec.ts  # 네트워크 에러
│   │   └── ui-edge-cases.spec.ts  # UI 엣지 케이스
│   └── smoke/                     # Smoke 테스트
│       └── health-check.spec.ts   # Health Check
├── reports/                       # 테스트 리포트 (HTML, JSON)
└── screenshots/                   # 스크린샷 (Staging 검증용)
```

---

## 테스트 실행 방법

### 사전 요구사항

```bash
cd frontend
npm install
npx playwright install chromium
```

### 전체 테스트 실행

```bash
# Frontend Dev Server 자동 시작 포함
npx playwright test

# 또는 npm script 사용
npm run test:e2e
```

### 특정 테스트 파일 실행

```bash
npx playwright test e2e/tests/auth/login.spec.ts
npx playwright test e2e/tests/teacher/question-crud.spec.ts
```

### 특정 테스트 이름으로 필터링

```bash
npx playwright test --grep "로그인"
```

### UI 모드 (디버깅)

```bash
npx playwright test --ui
```

### 테스트 리포트 확인

```bash
npx playwright show-report e2e/reports
```

---

## 인증 구조

테스트는 Setup Project를 통해 인증 상태를 사전 구성한다.

1. `auth.setup.ts`가 먼저 실행되어 Teacher/Student 계정을 API로 생성
2. 로그인 후 `StorageState`를 `.auth/teacher.json`, `.auth/student.json`에 저장
3. 이후 `chromium` 프로젝트의 테스트들이 저장된 인증 상태를 사용

```
Setup Project (auth.setup.ts)
    ├── Teacher 계정 생성 + 로그인 → .auth/teacher.json
    └── Student 계정 생성 + 로그인 → .auth/student.json
         ↓
Chromium Project (dependencies: ['setup'])
    └── 모든 테스트가 인증된 상태에서 시작
```

---

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `VITE_TEST_URL` | `http://localhost:5173` | 테스트 대상 URL |
| `CI` | - | CI 환경 여부 (설정 시 retry 2회, Dev Server 미재사용) |

### Staging 환경 대상 테스트

```bash
VITE_TEST_URL=http://staging.exam.example.com npx playwright test
```

---

## 주요 테스트 시나리오

| 카테고리 | 파일 | 시나리오 |
|----------|------|----------|
| 인증 | `auth/login.spec.ts` | 로그인 성공/실패, 리다이렉트 |
| 인증 | `auth/register.spec.ts` | 회원가입 (Teacher/Student) |
| Teacher | `teacher/question-crud.spec.ts` | 문제 생성/수정/삭제 |
| Teacher | `teacher/testpaper-crud.spec.ts` | 시험지 생성/문제 추가/삭제 |
| Teacher | `teacher/examination-crud.spec.ts` | 시험 생성/수정/삭제 |
| Teacher | `teacher/student-enrollment.spec.ts` | 시험에 학생 등록 |
| Student | `student/exam-take.spec.ts` | 시험 응시 (문제 풀이, 제출) |
| Student | `student/exam-time-boundary.spec.ts` | 시험 시간 경계 조건 |
| Dashboard | `dashboard/dashboard.spec.ts` | Teacher/Student Dashboard 렌더링 |
| Dashboard | `dashboard/chart-interaction.spec.ts` | PieChart 클릭 상호작용 |
| 통합 | `integration/full-exam-flow.spec.ts` | 전체 시험 플로우 (생성->응시->채점) |
| 보안 | `security/rbac.spec.ts` | Role 기반 접근 제어 검증 |
| 보안 | `security/error-cases.spec.ts` | 에러 처리 검증 |

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| [Architecture Overview](../../docs/architecture/README.md) | Frontend Architecture (Section 4) |
| [Staging 배포 가이드](../../docs/STAGING_DEPLOYMENT.md) | Staging E2E 테스트 실행 |
| [Troubleshooting](../../docs/troubleshooting.md) | E2E 테스트 이슈 해결 (Section 8) |
| `frontend/playwright.config.ts` | Playwright 설정 파일 |
