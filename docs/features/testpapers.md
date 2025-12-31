# TestPapers (시험지 관리)

## 개요

시험지 CRUD 기능. 교사가 문제를 조합하여 시험지를 생성하고 관리한다.

## 구조

```
features/testpapers/
├── TestPaperListPage.tsx    # 시험지 목록
├── TestPaperDetailPage.tsx  # 시험지 상세
└── TestPaperForm.tsx        # 시험지 생성/수정 폼
```

## 컴포넌트

### TestPaperListPage

시험지 목록을 카드 형태로 표시한다.

#### 표시 정보

- 시험지 이름
- 과목
- 문제 수
- 생성자
- 생성일

### TestPaperDetailPage

시험지 상세 정보와 포함된 문제 목록을 표시한다.

#### 표시 정보

- 시험지 기본 정보
- 총 문제 수
- 총 배점
- 문제 목록 (순서, 제목, 유형, 난이도, 배점)

#### 문제 클릭 동작

문제 클릭 시 해당 문제 상세 페이지로 이동한다.

### TestPaperForm

시험지 생성 및 수정 폼.

#### 주요 기능

- 시험지 이름 입력
- 과목 선택
- 문제 선택 (검색, 필터링)
- 문제별 배점 설정
- 문제 순서 관리

#### UI 구성

```
┌─────────────────────────────────────────────────────┐
│ 시험지 이름: [________________]                      │
│ 과목: [선택 ▼]                                       │
├─────────────────────┬───────────────────────────────┤
│ 문제 선택           │ 선택된 문제                     │
│ [검색...]           │                                │
│ ○ 문제 1            │ 1. 문제 A  [10]점 [↑][↓][X]    │
│ ○ 문제 2            │ 2. 문제 B  [20]점 [↑][↓][X]    │
│ ○ 문제 3            │                                │
└─────────────────────┴───────────────────────────────┘
```

#### 폼 검증 스키마

```typescript
const testPaperSchema = z.object({
  name: z.string().min(1, '시험지 이름을 입력해주세요'),
  subject_id: z.number().min(1, '과목을 선택해주세요'),
  questions: z.array(z.object({
    question_id: z.number(),
    score: z.number().min(1),
    order: z.number(),
  })).min(1, '최소 1개의 문제를 선택해주세요'),
})
```

## API 연동

### 시험지 목록 조회

```
GET /api/v1/testpapers/
```

### 시험지 상세 조회

```
GET /api/v1/testpapers/{id}/
```

**Response:**
```json
{
  "id": 1,
  "name": "중간고사 시험지",
  "subject": { "id": 1, "subject_name": "수학" },
  "question_count": 10,
  "questions": [
    {
      "id": 1,
      "question": { "id": 1, "name": "문제 제목", ... },
      "score": 10,
      "order": 1
    }
  ],
  "creat_user": { ... },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 시험지 생성

```
POST /api/v1/testpapers/
```

**Request:**
```json
{
  "name": "시험지 이름",
  "subject_id": 1,
  "questions": [
    { "question_id": 1, "score": 10, "order": 1 },
    { "question_id": 2, "score": 20, "order": 2 }
  ]
}
```

### 시험지 수정

```
PUT /api/v1/testpapers/{id}/
```

### 시험지 삭제

```
DELETE /api/v1/testpapers/{id}/
```

## 데이터 타입

```typescript
interface TestPaper {
  id: number
  name: string
  subject: Subject
  question_count: number
  questions: TestPaperQuestion[]
  creat_user: User
  created_at: string
  updated_at: string
}

interface TestPaperQuestion {
  id: number
  question: Question
  score: number
  order: number
}
```

## 애니메이션

| 요소 | 효과 |
|------|------|
| 목록 카드 | Stagger + 호버 상승 |
| 상세 문제 목록 | Stagger 순차 등장 |
| 폼 섹션 | FadeIn |

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/testpapers` | TestPaperListPage | 목록 |
| `/testpapers/:id` | TestPaperDetailPage | 상세 |
| `/testpapers/new` | TestPaperForm | 생성 |
| `/testpapers/:id/edit` | TestPaperForm | 수정 |
