# 시스템 UI/UX 및 로직 분석 리포트

## 1. 개요
현재 OnlineExam-v2 프로젝트의 프론트엔드와 백엔드 구현 상태를 분석하고, 현대적이고 인터렉티브한 시스템 구축을 위한 개선 필요 사항을 정리한다.

## 2. 데이터 통합 및 로직 분석

### 2.1 대시보드 데이터 미매칭 (Data Mismatch)
프론트엔드 대시보드 컴포넌트에서 많은 부분이 실제 API 데이터가 아닌 하드코딩된 Mock Data를 사용하고 있다.

#### [학생 대시보드 (StudentDashboard.tsx)]
- **과목별 최근 성적 (Bar Chart)**: 현재 `subjectScores` 변수에 하드코딩되어 있음. 백엔드에서 `score_trend` 데이터를 제공하고 있으나 차트 포맷에 맞춘 가공 로직 필요.
- **학습 진행률 (Learning Progress)**: `learningProgressData`가 하드코딩됨. 백엔드는 이미 `progress` 필드를 통해 데이터를 제공 중이나 프론트엔드 Type 정의(`StudentDashboard` interface)에서 누락되어 사용되지 않고 있음.

#### [교사 대시보드 (TeacherDashboard.tsx)]
- **최근 시험 결과 (Table)**: `mockExamResults`를 사용 중.
- **최근 활동 (Activity Timeline)**: `mockActivities`를 사용 중. 백엔드에 관련 API(Log/Activity) 없음.
- **점수 분포 (Score Distribution)**: `scoreDistributionData`를 사용 중. 백엔드에서 히스토그램 형태의 통계 데이터 제공 필요.
- **최근 제출 내역**: 백엔드 `TeacherDashboardService`에서 `recent_submissions` 필드를 빈 배열(`[]`)로 반환하고 있음.

### 2.2 백엔드 서비스 (Backend Services)
- `TeacherDashboardService`: `get_dashboard_data` 메서드가 구현되어 있으나, 응답 데이터 중 `student_statistics.recent_submissions`가 구현되지 않음.
- `StudentDashboardService`: 오답 노트를 위한 `wrong_questions`가 빈 배열(`[]`)로 반환됨.

### 2.3 동적 분석 결과 (Scenario Testing)
계정 생성부터 시험 응시까지의 시나리오 수행 결과, 다음과 같은 로직 및 UI/UX 문제가 추가로 확인되었다.

- **시험 생성 UI 유효성 검사 오류**: 교사용 '시험 생성' 페이지에서 `datetime-local` 입력 필드에 값이 입력되었음에도 불구하고, React Hook Form에서 이를 감지하지 못해 유효성 검사 에러(시작/종료 시간 필수)가 발생하며 생성이 차단되는 현상 확인. (API를 통한 직접 호출 시에는 정상 생성됨)
- **학생 대시보드 시험 노출 로직 누락**: 시험이 시작된 직후(Ongoing 상태)에는 학생 대시보드의 `upcoming_exams` 필터(`start_time__gte=now`)에 의해 목록에서 사라지지만, 정작 현재 응시 가능한 시험을 보여주는 `ongoing_exams` 섹션이 대시보드 API와 UI에 구현되어 있지 않아 학생이 대시보드에서 시험에 바로 진입할 수 없는 문제 확인.
- **성적 반영 실시간성**: 시험 제출 직후 대시보드로 복귀 시 '완료한 시험' 및 '평균 점수' 통계가 즉각적으로 업데이트되는 것을 확인 (정상).

## 3. 코드 품질 및 기술적 문제

### 3.1 프론트엔드 정적 분석 (Linting)
- **Type Safety**: `api.helper.ts`, `AnalyticsPage.tsx` 등 다수의 파일에서 `any` 타입을 남용하여 TypeScript의 이점을 충분히 활용하지 못함.
- **Unused Variables**: 사용되지 않는 변수와 임포트가 다수 존재하여 코드 가독성 저해.
- **Fast Refresh**: UI 컴포넌트(`badge.tsx`, `button.tsx` 등)에서 컴포넌트 외부에 상수를 선언하여 Fast Refresh 경고 발생.

### 3.2 런타임 및 문법 오류
- `QuestionForm.tsx`: 브라우저 분석 중 JSX 닫는 태그(`FadeIn`) 누락 관련 문법 오류 감지 (코드상으로는 존재하나 빌드/캐시 환경에 따른 체크 필요).

### 3.3 애니메이션 및 CSS 최적화 (Animation & Styling)
- **구조 및 접근성**: `FadeIn`, `StaggerContainer` 등 재사용 가능한 래퍼 컴포넌트와 `useReducedMotion` 훅을 통해 일관성 있고 접근성 높은 애니메이션 시스템을 구축함.
- **성능 위험 요소**: `index.css`의 `.card-interactive` 및 `button`, `a` 태그에 `transition: all`이 적용되어 있어, 향후 크기(width/height)나 레이아웃 변경이 포함된 애니메이션 추가 시 Reflow로 인한 성능 저하 우려가 있음. (`transition: transform, opacity, box-shadow` 등으로 구체화 권장)
- **Tailwind v4 활용**: 최신 `@theme` 디렉티브와 CSS 변수를 활용한 테마 설정은 확장성과 유지보수 측면에서 우수함.

## 4. UI/UX 개선 제안

- **실시간성 강화**: 시험 응시 및 제출 현황을 WebSocket이나 서버 사이드 이벤트를 통해 실시간으로 업데이트하는 기능 필요.
- **차트 인터렉션**: 현재 Recharts 애니메이션은 적용되어 있으나, 차트 클릭 시 상세 필터링된 목록으로 연결되는 등 인터렉티브한 동작 추가 제안.
- **다크 모드 일관성**: 일부 컴포넌트에서 다크 모드 시 시인성이 떨어지는 색상 조합 확인 (e.g., 활동 타임라인의 배경색).
- **입력 폼 UX 개선**: `datetime-local`과 같은 네이티브 입력 필드 사용 시 브라우저별 호환성 및 유효성 검사 연동 문제(React Hook Form)가 발생하므로, `react-datepicker` 등 전용 캘린더 라이브러리 도입 권장.

## 5. 결론
시스템의 완전한 로직 구현을 위해서는 **1) 프론트엔드의 Mock Data를 백엔드 API 데이터로 교체**, **2) 백엔드 대시보드 서비스의 누락된 통계 로직 구현**, **3) 전반적인 타입 안정성 강화**, **4) 애니메이션 CSS 속성 최적화**가 최우선적으로 수행되어야 한다.
