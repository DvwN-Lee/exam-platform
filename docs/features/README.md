# Features Documentation

## 개요

exam-platform Frontend 기능 모듈 문서.

## Feature 문서

### Core Features

| 기능 | 문서 | 설명 |
|------|------|------|
| [Auth](./auth.md) | 인증 | 로그인, 회원가입 |
| [Dashboard](./dashboard.md) | 대시보드 | 교사/학생 대시보드 |
| [Questions](./questions.md) | 문제 관리 | 문제 CRUD |
| [TestPapers](./testpapers.md) | 시험지 관리 | 시험지 CRUD |
| [Examinations](./examinations.md) | 시험 일정 | 시험 일정 관리 |
| [Exams](./exams.md) | 시험 응시 | 시험 응시, 결과 조회 |
| [Settings](./settings.md) | 설정 | 프로필, 비밀번호, 과목, 테마 |
| [Students](./students.md) | 학생 관리 | 학생 목록, 상세 (교사용) |

### System Features

| 기능 | 문서 | 설명 |
|------|------|------|
| [Animation System](./animation-system.md) | 애니메이션 | Framer Motion 시스템 |
| [UI Components](./ui-components.md) | UI 컴포넌트 | 공통 컴포넌트 |

## 디렉토리 구조

```
frontend/src/
├── api/                    # API 클라이언트
│   ├── client.ts           # Axios 인스턴스 (인터셉터, 에러 정규화)
│   ├── auth.ts             # 인증 API
│   ├── dashboard.ts        # 대시보드 API
│   ├── question.ts         # 문제 API
│   ├── testpaper.ts        # 시험지/시험 일정 API
│   ├── exam.ts             # 시험 응시 API
│   ├── score.ts            # 성적 API
│   └── student.ts          # 학생 API
│
├── components/
│   ├── animation/          # 애니메이션 래퍼
│   ├── auth/               # 인증 관련 (ProtectedRoute)
│   ├── charts/             # 차트 컴포넌트 (InteractivePieChart, InteractiveBarChart, ScoreTrendChart)
│   ├── layout/             # 레이아웃 (DashboardLayout, Sidebar, MobileHeader)
│   ├── ui/                 # UI 컴포넌트
│   └── ErrorBoundary.tsx   # 에러 바운더리
│
├── features/
│   ├── auth/               # 인증
│   ├── dashboard/          # 대시보드
│   ├── questions/          # 문제 관리
│   ├── testpapers/         # 시험지 관리
│   ├── examinations/       # 시험 일정
│   ├── exams/              # 시험 응시
│   ├── settings/           # 설정
│   ├── students/           # 학생 관리
│   ├── profile/            # 프로필
│   └── analytics/          # 분석
│
├── lib/
│   ├── animations/         # 애니메이션 유틸
│   ├── react-query.ts      # TanStack Query 설정
│   └── utils.ts            # 공통 유틸
│
├── stores/
│   ├── authStore.ts        # 인증 상태
│   └── sidebarStore.ts     # 사이드바 상태
│
└── types/                  # TypeScript 타입 정의
    ├── auth.ts
    ├── chart.ts
    ├── dashboard.ts
    ├── exam.ts
    ├── question.ts
    ├── score.ts
    ├── student.ts
    └── testpaper.ts
```

## 라우팅 구조

### 공개 라우트

| 경로 | 페이지 |
|------|--------|
| `/login` | 로그인 |
| `/register` | 회원가입 |

### 인증 필요 라우트

| 경로 | 페이지 | 권한 |
|------|--------|------|
| `/dashboard` | 대시보드 | 전체 |
| `/questions` | 문제 목록 | 교사 |
| `/questions/:id` | 문제 상세 | 교사 |
| `/testpapers` | 시험지 목록 | 교사 |
| `/testpapers/:id` | 시험지 상세 | 교사 |
| `/examinations` | 시험 목록 | 전체 |
| `/examinations/:id` | 시험 상세 | 전체 |
| `/exams` | 응시 가능 시험 | 학생 |
| `/exams/:id/take` | 시험 응시 | 학생 |
| `/exams/:id/result` | 결과 상세 | 학생 |
| `/exams/results` | 결과 목록 | 학생 |
| `/students` | 학생 목록 | 교사 |
| `/students/:id` | 학생 상세 | 교사 |
| `/settings` | 설정 | 전체 |

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 라우팅 | TanStack Router |
| 상태 관리 | Zustand (클라이언트), TanStack Query (서버) |
| 폼 처리 | React Hook Form + Zod |
| 스타일링 | Tailwind CSS |
| 애니메이션 | Framer Motion |
| 차트 | Recharts |
| HTTP 클라이언트 | Axios |

## API Base URL

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})
```
