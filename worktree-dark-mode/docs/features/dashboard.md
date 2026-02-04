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
| 총 문제 수 | `total_questions` | 등록된 전체 문제 수 |
| 총 시험지 수 | `total_testpapers` | 생성된 시험지 수 |
| 총 학생 수 | `total_students` | 등록된 학생 수 |
| 평균 점수 | `average_score` | 전체 시험 평균 점수 |

### 차트

#### 과목별 문제 분포 (Pie Chart)

```typescript
interface SubjectDistribution {
  subject_name: string
  count: number
}
```

#### 난이도별 문제 분포 (Bar Chart)

```typescript
interface DifficultyDistribution {
  difficulty: 'jd' | 'zd' | 'kn'  // 쉬움/보통/어려움
  count: number
}
```

### 최근 활동

- 최근 생성된 시험 목록
- 최근 시험 결과 (학생별 점수)

## StudentDashboard

### 통계 카드

| 항목 | API 필드 | 설명 |
|------|----------|------|
| 응시한 시험 | `completed_exams` | 완료한 시험 수 |
| 평균 점수 | `average_score` | 개인 평균 점수 |
| 최고 점수 | `highest_score` | 최고 점수 |
| 예정된 시험 | `upcoming_exams` | 예정된 시험 수 |

### 진행 중인 시험

현재 응시 가능한 시험 목록 표시.

```typescript
interface OngoingExam {
  id: number
  exam_name: string
  start_time: string
  end_time: string
  testpaper: {
    name: string
    question_count: number
  }
}
```

### 최근 시험 결과

최근 완료한 시험의 결과 목록.

```typescript
interface RecentResult {
  id: number
  exam_name: string
  score: number
  total_score: number
  completed_at: string
}
```

## API 연동

### Endpoint

```
GET /api/v1/dashboard/teacher/  # 교사용
GET /api/v1/dashboard/student/  # 학생용
```

### Response 구조

#### Teacher Dashboard

```json
{
  "total_questions": 150,
  "total_testpapers": 25,
  "total_students": 80,
  "average_score": 75.5,
  "subject_distribution": [...],
  "difficulty_distribution": [...],
  "recent_exams": [...],
  "recent_results": [...]
}
```

#### Student Dashboard

```json
{
  "completed_exams": 10,
  "average_score": 82.3,
  "highest_score": 95,
  "upcoming_exams": 3,
  "ongoing_exams": [...],
  "recent_results": [...]
}
```

## 애니메이션

### 적용된 효과

| 요소 | 애니메이션 | 구현 |
|------|------------|------|
| 통계 카드 | Stagger 등장 | `StaggerContainer` + `StaggerItem` |
| 카드 호버 | 상승 효과 | `cardHoverVariants` |
| 차트 | 진입 애니메이션 | Recharts `isAnimationActive` |
| 테이블 row | 순차 등장 | `StaggerItem` |

### 차트 애니메이션 설정

```tsx
<PieChart>
  <Pie
    isAnimationActive={true}
    animationDuration={800}
    animationEasing="ease-out"
  />
</PieChart>

<BarChart>
  <Bar
    isAnimationActive={true}
    animationDuration={800}
    animationEasing="ease-out"
  />
</BarChart>
```

## 반응형 디자인

| 화면 크기 | 레이아웃 |
|-----------|----------|
| Desktop | 4열 통계 카드, 2열 차트 |
| Tablet | 2열 통계 카드, 1열 차트 |
| Mobile | 1열 전체 |
