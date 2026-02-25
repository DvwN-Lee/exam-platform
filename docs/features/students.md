# Students (학생 관리)

## 개요

학생 관리 기능. 교사가 학생 목록을 조회하고 검색하며, 개별 학생의 시험 이력과 통계를 확인한다.

## 구조

```
features/students/
├── StudentListPage.tsx    # 학생 목록
└── StudentDetailPage.tsx  # 학생 상세 (프로필, 통계, 시험 이력)
```

## 컴포넌트

### StudentListPage

학생 목록을 테이블 형태로 표시한다.

#### 표시 정보

| 컬럼 | 설명 |
|------|------|
| 이름 | 학생 닉네임 |
| 아이디 | 학생 username |
| 이메일 | 이메일 주소 |
| 가입일 | 계정 생성일 |

#### 주요 기능

- 학생 목록 조회
- 이름/아이디/이메일 검색
- 페이지네이션
- 학생 클릭 시 상세 페이지 이동

#### 필터 상태

```typescript
const [filters, setFilters] = useState({
  search: '',
  page: 1,
})
```

### StudentDetailPage

개별 학생의 상세 정보를 표시한다.

#### 프로필 정보

- 이름 (`student_name`)
- 학번 (`student_id`)
- 이메일 (`email`)
- 학교 (`student_school`)
- 반 (`student_class`)
- 가입일 (`date_joined`)

#### 통계 카드

| 항목 | 필드 | 설명 |
|------|------|------|
| 응시 횟수 | `statistics.total_exams_taken` | 응시한 시험 수 |
| 평균 점수 | `statistics.average_score` | 평균 점수 |
| 합격률 | `statistics.pass_rate` | 합격 비율 (%) |

#### 시험 이력 테이블

| 컬럼 | 설명 |
|------|------|
| 시험명 | `exam_name` |
| 과목 | `subject_name` |
| 점수 | `score` |
| 총점 | `total_score` |
| 득점률 | 계산값 (%) |
| 제출일 | `submitted_at` |

## API 연동

### 학생 목록 조회

```
GET /students/
```

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `search` | string | 검색어 (이름/아이디/이메일) |
| `page` | number | 페이지 번호 |
| `page_size` | number | 페이지당 항목 수 |

**Response:**
```json
{
  "count": 100,
  "next": "http://api/students/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "student1",
      "nick_name": "홍길동",
      "email": "student1@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 학생 상세 조회

```
GET /students/{id}/
```

**Response:**
```json
{
  "username": "student1",
  "student_name": "홍길동",
  "student_id": "20240001",
  "email": "student1@example.com",
  "student_school": "OO고등학교",
  "student_class": "1-3",
  "date_joined": "2024-01-01T00:00:00Z",
  "statistics": {
    "total_exams_taken": 5,
    "average_score": 82.5,
    "pass_rate": 80
  },
  "exam_history": [
    {
      "exam_id": 1,
      "exam_name": "중간고사",
      "subject_name": "수학",
      "score": 85,
      "total_score": 100,
      "submitted_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 데이터 타입

```typescript
interface Student {
  id: number
  username: string
  nick_name: string
  email: string
  created_at: string
}

interface StudentDetail {
  username: string
  student_name: string
  student_id: string
  email: string
  student_school: string
  student_class: string
  date_joined: string
  statistics: {
    total_exams_taken: number
    average_score: number
    pass_rate: number
  }
  exam_history: ExamHistoryItem[]
}

interface StudentListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Student[]
}
```

## 접근 권한

이 페이지는 교사(teacher) 사용자만 접근 가능하다.

### Backend 데이터 격리

`StudentListViewSet`은 현재 Teacher가 출제한 시험에 등록된 학생만 반환한다. Teacher A는 Teacher B의 학생 정보 및 시험 이력에 접근할 수 없다.

| 메서드 | 동작 |
|--------|------|
| `get_queryset()` | Teacher의 시험(`ExaminationInfo`)에 등록된(`ExamStudentsInfo`) Student만 조회 |
| `retrieve()` | 해당 Teacher 시험에 대한 Submission, 통계, 시험 이력만 반환 |

## 라우팅

| 경로 | 컴포넌트 | 접근 권한 |
|------|----------|-----------|
| `/students` | StudentListPage | 교사만 |
| `/students/:id` | StudentDetailPage | 교사만 |
