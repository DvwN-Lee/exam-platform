# Dashboard

## 개요

사용자 유형(교사/학생)에 따라 다른 대시보드를 표시한다.

## 구조

```
features/dashboard/
├── DashboardPage.tsx      # 라우팅 진입점 (user_type 분기)
├── TeacherDashboard.tsx   # 교사용 대시보드
└── StudentDashboard.tsx   # 학생용 대시보드
```

## TeacherDashboard

### 통계 카드

| 항목 | API 필드 | 설명 |
|------|----------|------|
| 생성한 문제 | `question_statistics.total_questions` | 등록된 전체 문제 수 |
| 시험지 수 | `testpaper_statistics.total_testpapers` | 생성된 시험지 수 |
| 총 응시자 | `student_statistics.total_students` | 등록된 학생 수 |
| 평균 점수 | `student_statistics.average_score` | 전체 시험 평균 점수 |

각 카드는 `trend` 필드를 통해 이번 달 증감을 표시한다.

### 차트

#### 문제 유형 분포 (InteractivePieChart)

```typescript
// 데이터 소스: dashboard.question_statistics.questions_by_type
const questionTypeData: PieChartDataItem[] = [
  { name: '객관식', value: questions_by_type.xz, type: 'xz' },
  { name: '빈칸채우기', value: questions_by_type.tk, type: 'tk' },
  { name: '주관식', value: questions_by_type.pd, type: 'pd' },
]
```

#### 문제 난이도 분포 (InteractiveBarChart)

```typescript
// 데이터 소스: dashboard.question_statistics.questions_by_difficulty
const questionDifficultyData: ChartDataItem[] = [
  { name: '쉬움', value: questions_by_difficulty.jd, difficulty: 'jd' },
  { name: '보통', value: questions_by_difficulty.zd, difficulty: 'zd' },
  { name: '어려움', value: questions_by_difficulty.kn, difficulty: 'kn' },
]
```

### 최근 활동

- 최근 생성한 문제 (`dashboard.recent_questions`)
- 진행 중인 시험 (`dashboard.ongoing_exams`)
- 최근 제출된 시험 (`dashboard.student_statistics.recent_submissions`)

## StudentDashboard

### 통계 카드

| 항목 | API 필드 | 설명 |
|------|----------|------|
| 완료한 시험 | `statistics.total_exams_taken` | 완료한 시험 수 |
| 평균 점수 | `statistics.average_score` | 개인 평균 점수 |
| 예정된 시험 | `upcoming_exams.length` | 예정된 시험 수 |

각 카드는 `exams_trend`, `avg_score_trend` 필드를 통해 이번 달 증감을 표시한다.

### 점수 추이 차트

`dashboard.score_trend` 배열이 존재할 경우 `ScoreTrendChart`로 점수 추이를 시각화한다.

```typescript
interface ScoreTrendDataItem {
  date: string
  score: number
  total_score: number
  percentage: number
  exam_name: string
}
```

### 최근 시험 성적

최근 완료한 시험의 결과 목록 (`dashboard.recent_submissions`).

### 응시 예정 시험

예정 시험 목록 (`dashboard.upcoming_exams`). 진행 중인 시험은 "응시하기" 버튼 활성화.

### 오답 문제 복습

틀린 문제 목록 (`dashboard.wrong_questions`). 클릭 시 해당 문제 상세 페이지로 이동.

## API 연동

### Endpoint

```
GET /dashboard/teacher/  # 교사용
GET /dashboard/student/  # 학생용
```

> API client의 baseURL(`VITE_API_BASE_URL`)이 prefix를 포함하므로 실제 전체 경로는 `/api/v1/dashboard/teacher/` 등이 된다.

### Response 구조

#### Teacher Dashboard

```json
{
  "question_statistics": {
    "total_questions": 150,
    "trend": 5,
    "questions_by_type": { "xz": 80, "pd": 30, "tk": 40 },
    "questions_by_difficulty": { "jd": 50, "zd": 60, "kn": 40 }
  },
  "testpaper_statistics": {
    "total_testpapers": 25,
    "trend": 2
  },
  "student_statistics": {
    "total_students": 80,
    "submissions_trend": 10,
    "average_score": 75.5,
    "score_trend": 2.3,
    "total_submissions": 200,
    "recent_submissions": [...]
  },
  "recent_questions": [...],
  "ongoing_exams": [...]
}
```

#### Student Dashboard

```json
{
  "statistics": {
    "total_exams_taken": 10,
    "average_score": 82.3,
    "exams_trend": 3,
    "avg_score_trend": 5.2
  },
  "upcoming_exams": [...],
  "recent_submissions": [...],
  "score_trend": [...],
  "wrong_questions": [...]
}
```

## 애니메이션

### 적용된 효과

| 요소 | 애니메이션 | 구현 |
|------|------------|------|
| 통계 카드 | Stagger 등장 | `StaggerContainer` + `StaggerItem` |
| 카드 호버 | 상승 효과 | `cardHoverVariants` |
| 차트 섹션 | FadeIn slideUp | `FadeIn` with delay |
| 최근 활동 목록 | 순차 등장 | `StaggerContainer` + `StaggerItem` |

## 반응형 디자인

| 화면 크기 | 레이아웃 |
|-----------|----------|
| Desktop | 4열 통계 카드 (Teacher) / 3열 (Student), 2열 차트 |
| Tablet | 2열 통계 카드, 1열 차트 |
| Mobile | 1열 전체 |
