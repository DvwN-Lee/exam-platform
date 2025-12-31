# Exams (시험 응시)

## 개요

학생의 시험 응시 기능. 시험 목록 조회, 시험 응시, 결과 확인을 지원한다.

## 구조

```
features/exams/
├── ExamListPage.tsx        # 응시 가능 시험 목록
├── ExamTakePage.tsx        # 시험 응시 페이지
├── ExamResultPage.tsx      # 시험 결과 상세
└── ExamResultsListPage.tsx # 시험 결과 목록
```

## 컴포넌트

### ExamListPage

학생이 응시 가능한 시험 목록을 표시한다.

#### 표시 정보

- 시험 이름
- 시험지 이름
- 시작/종료 시간
- 상태 뱃지
- 문제 수

#### 시험 상태별 액션

| 상태 | 버튼 | 동작 |
|------|------|------|
| `upcoming` | - | 비활성화 |
| `ongoing` | 응시하기 | 시험 페이지로 이동 |
| `completed` | 결과 보기 | 결과 페이지로 이동 |

### ExamTakePage

시험 응시 인터페이스.

#### UI 구성

```
┌─────────────────────────────────────────────────────┐
│ [시험 이름]                    남은 시간: 00:30:00   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Q1. 문제 내용                                        │
│                                                     │
│ ○ 선택지 1                                          │
│ ● 선택지 2 (선택됨)                                  │
│ ○ 선택지 3                                          │
│ ○ 선택지 4                                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [1][2][3][4][5]...          [이전] [다음] [제출]     │
└─────────────────────────────────────────────────────┘
```

#### 주요 기능

- **타이머**: 남은 시간 표시, 시간 종료 시 자동 제출
- **문제 네비게이션**: 번호 클릭으로 문제 이동
- **답안 상태 표시**: 답변 완료/미완료 시각적 구분
- **자동 저장**: 답안 선택 시 자동 저장
- **제출 확인**: 미답변 문제 경고

#### 상태 관리

```typescript
const [currentIndex, setCurrentIndex] = useState(0)
const [answers, setAnswers] = useState<Record<number, string | number[]>>({})
const [remainingTime, setRemainingTime] = useState(0)
```

#### 문제 유형별 입력

| 유형 | 입력 방식 |
|------|-----------|
| 객관식 | 라디오 버튼 (단일 선택) |
| 주관식 | 텍스트 영역 |
| 빈칸채우기 | 텍스트 입력 |

### ExamResultPage

시험 결과 상세를 표시한다.

#### 표시 정보

- 시험 정보 (이름, 응시일)
- 점수 (획득 점수 / 총점)
- 합격 여부
- 문제별 결과 (정답/오답, 선택한 답, 정답, 배점)

#### 결과 표시

```typescript
interface QuestionResult {
  question: Question
  selected_answer: string | number[]
  correct_answer: string | number[]
  is_correct: boolean
  score: number
  earned_score: number
}
```

### ExamResultsListPage

학생의 시험 결과 목록을 표시한다.

#### 표시 정보

- 시험 이름
- 응시일
- 점수
- 합격 여부

## API 연동

### 응시 가능 시험 목록

```
GET /api/v1/exams/available/
```

### 시험 시작

```
POST /api/v1/exams/{id}/start/
```

**Response:**
```json
{
  "exam_id": 1,
  "submission_id": 1,
  "questions": [...],
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T10:30:00Z"
}
```

### 답안 저장

```
POST /api/v1/exams/{id}/answer/
```

**Request:**
```json
{
  "question_id": 1,
  "answer": "선택지 내용" | [1, 3]  // 주관식 or 객관식
}
```

### 시험 제출

```
POST /api/v1/exams/{id}/submit/
```

### 결과 조회

```
GET /api/v1/exams/{id}/result/
```

### 결과 목록

```
GET /api/v1/exams/results/
```

## 데이터 타입

```typescript
interface ExamSubmission {
  id: number
  examination: Examination
  student: User
  start_time: string
  end_time: string | null
  score: number | null
  is_submitted: boolean
}

interface ExamResult {
  submission: ExamSubmission
  total_score: number
  earned_score: number
  is_passed: boolean
  questions: QuestionResult[]
}
```

## 시간 관리

### 타이머 로직

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    const remaining = endTime - Date.now()
    if (remaining <= 0) {
      handleSubmit()  // 자동 제출
    } else {
      setRemainingTime(remaining)
    }
  }, 1000)

  return () => clearInterval(timer)
}, [endTime])
```

### 시간 포맷

```typescript
const formatTime = (ms: number) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/exams` | ExamListPage | 응시 가능 목록 |
| `/exams/:id/take` | ExamTakePage | 시험 응시 |
| `/exams/:id/result` | ExamResultPage | 결과 상세 |
| `/exams/results` | ExamResultsListPage | 결과 목록 |
