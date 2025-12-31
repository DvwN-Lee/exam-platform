# Questions (문제 관리)

## 개요

문제 CRUD 기능. 교사가 객관식, 주관식, 빈칸채우기 유형의 문제를 생성하고 관리한다.

## 구조

```
features/questions/
├── QuestionListPage.tsx    # 문제 목록
├── QuestionDetailPage.tsx  # 문제 상세
└── QuestionForm.tsx        # 문제 생성/수정 폼
```

## 문제 유형

| 코드 | 유형 | 설명 |
|------|------|------|
| `xz` | 객관식 | 선택지 중 정답 선택 |
| `pd` | 주관식 | 텍스트 답안 입력 |
| `tk` | 빈칸채우기 | 빈칸에 정답 입력 |

## 난이도

| 코드 | 난이도 |
|------|--------|
| `jd` | 쉬움 |
| `zd` | 보통 |
| `kn` | 어려움 |

## 컴포넌트

### QuestionListPage

문제 목록을 테이블 형태로 표시한다.

#### 주요 기능

- 문제 목록 조회
- 유형별 필터링 (객관식/주관식/빈칸채우기)
- 난이도별 필터링
- 제목 검색
- 정렬 (최신순/오래된순)
- 페이지네이션

#### 필터 상태

```typescript
const [filters, setFilters] = useState({
  tq_type: '',      // 문제 유형
  tq_degree: '',    // 난이도
  search: '',       // 검색어
  ordering: '-created_at',  // 정렬
})
```

### QuestionDetailPage

문제 상세 정보를 표시한다.

#### 표시 정보

- 문제 제목
- 과목
- 유형, 난이도
- 배점
- 선택지 (객관식)
- 정답 표시
- 생성자, 생성일

### QuestionForm

문제 생성 및 수정 폼.

#### 폼 검증 스키마

```typescript
const questionSchema = z.object({
  name: z.string().min(1, '문제 제목을 입력해주세요'),
  subject_id: z.number().min(1, '과목을 선택해주세요'),
  score: z.number().min(1, '배점은 1점 이상이어야 합니다'),
  tq_type: z.enum(['xz', 'pd', 'tk']),
  tq_degree: z.enum(['jd', 'zd', 'kn']),
  options: z.array(z.object({
    option: z.string(),
    is_right: z.boolean(),
  })),
}).superRefine((data, ctx) => {
  if (data.tq_type === 'xz') {
    // 객관식: 최소 1개 선택지, 최소 1개 정답 필요
  }
})
```

#### 동적 선택지 관리

```typescript
const { fields, append, remove } = useFieldArray({
  control,
  name: 'options',
})
```

## API 연동

### 문제 목록 조회

```
GET /api/v1/questions/
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `tq_type` | string | 문제 유형 필터 |
| `tq_degree` | string | 난이도 필터 |
| `search` | string | 제목 검색 |
| `ordering` | string | 정렬 기준 |
| `page` | number | 페이지 번호 |

### 문제 상세 조회

```
GET /api/v1/questions/{id}/
```

### 문제 생성

```
POST /api/v1/questions/
```

**Request:**
```json
{
  "name": "문제 제목",
  "subject_id": 1,
  "score": 10,
  "tq_type": "xz",
  "tq_degree": "zd",
  "options": [
    { "option": "선택지 1", "is_right": true },
    { "option": "선택지 2", "is_right": false }
  ]
}
```

### 문제 수정

```
PUT /api/v1/questions/{id}/
```

### 문제 삭제

```
DELETE /api/v1/questions/{id}/
```

### 과목 목록 조회

```
GET /api/v1/subjects/
```

## 데이터 타입

```typescript
interface Question {
  id: number
  name: string
  subject: Subject
  score: number
  tq_type: 'xz' | 'pd' | 'tk'
  tq_degree: 'jd' | 'zd' | 'kn'
  options: Option[]
  creat_user: User
  created_at: string
  updated_at: string
}

interface Option {
  id: number
  option: string
  is_right: boolean
}

interface Subject {
  id: number
  subject_name: string
}
```

## 애니메이션

| 요소 | 효과 |
|------|------|
| 목록 페이지 | 테이블 row stagger |
| 상세 페이지 | 섹션별 FadeIn |
| 폼 페이지 | 필드 순차 등장 |
| 선택지 추가/삭제 | AnimatePresence |

## 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/questions` | QuestionListPage | 목록 |
| `/questions/:id` | QuestionDetailPage | 상세 |
| `/questions/new` | QuestionForm | 생성 |
| `/questions/:id/edit` | QuestionForm | 수정 |
