# ADR-003: React + TanStack Frontend Stack

## 상태 (Status)

`승인됨`

## 일자 (Date)

2025-03-15

## 상황 (Context)

Exam Platform Frontend는 다음 요구사항을 충족해야 한다.

- SPA(Single Page Application) 방식의 사용자 인터페이스
- Teacher/Student Role 기반 Route 분기
- Server State(API 데이터) 캐싱 및 동기화
- Form 관리 (시험 문제 생성, 시험 응시 등 복잡한 Form)
- 반응형 UI, Light/Dark Mode 지원

Frontend Framework와 상태 관리 라이브러리 조합을 검토했다.

## 결정 (Decision)

다음 Stack을 Frontend 기술로 채택한다.

| 기술 | 용도 |
|------|------|
| **React 19 + TypeScript** | UI Framework |
| **Vite** | Build Tool |
| **TanStack Router** | Client Routing (Type-Safe) |
| **TanStack Query** | Server State 관리 |
| **Zustand** | Client State 관리 |
| **React Hook Form + Zod** | Form 관리 + Validation |
| **shadcn/ui + Radix UI** | UI Component |
| **Tailwind CSS** | Styling |

## 이유 (Rationale)

### Routing: TanStack Router vs React Router

| 항목 | TanStack Router | React Router |
|------|----------------|--------------|
| Type Safety | 전체 Route Type 추론 | 수동 Type 정의 필요 |
| Search Params | Built-in Validated Search Params | 별도 처리 |
| `beforeLoad` Guard | 내장 (Route 레벨 인증 검증) | Wrapper Component 필요 |

TanStack Router의 `beforeLoad` Guard로 Route 레벨에서 `user_type` 검증을 수행하여, Teacher/Student 접근 제어를 선언적으로 구현할 수 있다.

### Server State: TanStack Query

- API 응답 자동 캐싱 (`staleTime: 5분`)
- Background Refetch로 데이터 최신성 유지
- `useMutation` + Cache Invalidation으로 Write 후 자동 갱신
- Retry, Loading/Error 상태를 Hook 레벨에서 일관 처리

### Client State: Zustand

- `authStore`(인증 상태)와 `sidebarStore`(UI 상태)만으로 Client State 최소화
- `persist` Middleware로 `localStorage` 자동 저장
- Redux 대비 Boilerplate 최소화, 직관적 API

### UI: shadcn/ui + Tailwind CSS

- shadcn/ui는 Component 소스를 직접 소유하여 커스터마이징 자유도 확보
- Radix UI 기반으로 Accessibility(a11y) 기본 준수
- Tailwind CSS Utility Class로 일관된 Design Token 적용

## 결과 (Consequences)

### 긍정적 결과

- TanStack Router `beforeLoad`로 Role 기반 Route Guard를 Route 정의에 선언적으로 포함
- TanStack Query로 Server State와 Client State 분리, 캐시 관리 자동화
- `React Hook Form + Zod` 조합으로 Form Validation 로직을 Schema 기반으로 통합
- shadcn/ui Component 소스 직접 관리로 프로젝트 요구에 맞는 커스터마이징 가능

### 부정적 결과 / 트레이드오프

- TanStack Router는 React Router 대비 생태계 규모가 작으며 학습 자료가 제한적
- shadcn/ui Component를 직접 관리하므로 업데이트 시 수동 반영 필요
- 의존 라이브러리 수가 많아 Bundle Size 관리 및 호환성 확인에 주의 필요

## 참고 자료 (References)

- [Architecture Overview - Section 2, 4](../README.md)
- `frontend/src/`: Frontend 소스 구조
- `frontend/package.json`: 의존성 목록
