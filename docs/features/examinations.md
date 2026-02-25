# Examinations (시험 일정 관리)

## 개요

시험 일정 관리 기능. 교사가 시험지를 기반으로 시험 일정을 생성하고 학생을 등록한다. 시험 결과 조회 및 수동 채점도 지원한다.

## 구조

```
features/examinations/
├── ExaminationListPage.tsx      # 시험 목록
├── ExaminationDetailPage.tsx    # 시험 상세
├── ExaminationForm.tsx          # 시험 생성/수정 폼
├── EnrolledStudentsSection.tsx  # 등록 학생 섹션
├── StudentSelectModal.tsx       # 학생 선택 모달
├── ExamResultsListPage.tsx      # 시험별 학생 성적 목록 (교사용)
├── StudentResultDetailPage.tsx  # 개별 학생 성적 상세 (교사용)
└── components/
    ├── StatisticsCards.tsx       # 성적 통계 카드
    └── ManualGradeModal.tsx     # 수동 채점 모달
```

## 시험 상태

| 상태 | 조건 | 표시 |
|------|------|------|
| `upcoming` | 현재 시간 < 시작 시간 | 예정 (파란색) |
| `ongoing` | 시작 시간 <= 현재 시간 <= 종료 시간 | 진행중 (녹색) |
| `completed` | 현재 시간 > 종료 시간 | 완료 (회색) |

## 컴포넌트

### ExaminationListPage

시험 목록을 카드 형태로 표시한다.

#### 주요 기능

- 시험 목록 조회
- 상태별 필터링
- 이름 검색
- 시험 삭제 (교사)

### ExaminationDetailPage

시험 상세 정보를 표시한다.

#### 표시 정보

- 시험 이름, 상태
- 시험지 정보
- 시작/종료 시간
- 생성자, 생성일
- 문제 목록
- 등록 학생 (교사 전용)

#### 역할별 액션

- **교사**: 수정, 게시하기 버튼, 성적 조회
- **학생**: 시험 응시하기 버튼 (진행 중인 경우)

### ExaminationForm

시험 생성 및 수정 폼. DateTimePicker 컴포넌트를 사용한다.

#### 폼 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `exam_name` | text | O | 시험 이름 |
| `testpaper_id` | select | O | 시험지 선택 |
| `start_time` | DateTimePicker | O | 시작 시간 (현재 이후) |
| `end_time` | DateTimePicker | O | 종료 시간 |
| `is_public` | checkbox | X | 공개 여부 |

#### 폼 검증

```typescript
const examinationSchema = z
  .object({
    exam_name: z.string().min(1, '시험명을 입력해주세요'),
    testpaper_id: z.number().min(1, '시험지를 선택해주세요'),
    start_time: z.date({ error: '시작 시간을 선택해주세요' }),
    end_time: z.date({ error: '종료 시간을 선택해주세요' }),
    is_public: z.boolean(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: '종료 시간은 시작 시간 이후여야 합니다',
    path: ['end_time'],
  })
  .refine((data) => data.start_time > new Date(), {
    message: '시작 시간은 현재 시간 이후여야 합니다',
    path: ['start_time'],
  })
```

#### Backend 데이터 변환

Frontend의 `start_time`/`end_time`을 Backend API 형식(`name`, `subject_id`, `start_time` ISO, `duration` 분 단위, `papers` 배열)으로 변환하여 전송한다.

### EnrolledStudentsSection

시험에 등록된 학생 목록을 표시하고 관리한다.

#### 주요 기능

- 등록된 학생 목록 표시
- 학생 추가 (모달)
- 학생 제거

### StudentSelectModal

학생 선택을 위한 모달.

#### 주요 기능

- 학생 검색
- 체크박스로 다중 선택
- 선택 완료 시 등록

### ExamResultsListPage

교사가 시험별 학생 성적 목록을 조회한다. 필터링(전체/제출/미제출) 및 정렬 기능을 지원한다.

### StudentResultDetailPage

교사가 개별 학생의 시험 성적 상세를 조회하고, 주관식 문제에 대해 수동 채점을 수행한다.

## API 연동

### 시험 목록 조회

```
GET /examinations/
```

### 시험 상세 조회

```
GET /examinations/{id}
```

### 시험 생성

```
POST /examinations/
```

**Request:**
```json
{
  "name": "중간고사",
  "subject_id": 1,
  "start_time": "2024-01-15T09:00:00Z",
  "duration": 90,
  "exam_type": "pt",
  "papers": [
    { "paper_id": 1 }
  ]
}
```

### 시험 수정

```
PATCH /examinations/{id}
```

### 시험 삭제

```
DELETE /examinations/{id}
```

### 시험 게시

```
POST /examinations/{id}/publish/
```

### 학생 등록

```
POST /examinations/{id}/enroll_students/
```

**Request:**
```json
{
  "student_ids": [1, 2, 3]
}
```

### 등록 학생 조회

```
GET /examinations/{id}/enrolled_students/
```

### 성적 API (Score)

```
GET /scores/exam/{exam_id}/                       # 학생 성적 목록
GET /scores/exam/{exam_id}/statistics/             # 성적 통계
GET /scores/exam/{exam_id}/student/{student_id}/   # 개별 학생 상세
POST /scores/{score_id}/grade/                     # 수동 채점
```

## 데이터 타입

```typescript
interface Examination {
  id: number
  exam_name: string
  testpaper: TestPaper
  start_time: string
  end_time: string
  is_public: boolean
  creat_user: User
  created_at: string
}

type ExaminationStatus = 'upcoming' | 'ongoing' | 'completed'
```

## 애니메이션

| 요소 | 효과 |
|------|------|
| 목록 카드 | Stagger + 호버 |
| 상세 섹션 | FadeIn delay |
| 문제 목록 | Stagger |
| 학생 목록 | Stagger |

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/examinations` | ExaminationListPage | 목록 |
| `/examinations/:id` | ExaminationDetailPage | 상세 |
| `/examinations/new` | ExaminationForm | 생성 |
| `/examinations/:id/edit` | ExaminationForm | 수정 |
| `/examinations/:id/results` | ExamResultsListPage | 성적 목록 |
| `/examinations/:id/results/:studentId` | StudentResultDetailPage | 학생 성적 상세 |
