# Students (학생 관리)

## 개요

학생 관리 기능. 교사가 학생 목록을 조회하고 검색한다.

## 구조

```
features/students/
└── StudentListPage.tsx  # 학생 목록
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

#### 필터 상태

```typescript
const [filters, setFilters] = useState({
  search: '',
  page: 1,
})
```

## API 연동

### 학생 목록 조회

```
GET /api/v1/students/
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

## 데이터 타입

```typescript
interface Student {
  id: number
  username: string
  nick_name: string
  email: string
  created_at: string
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

```typescript
// 라우터 설정
{
  path: '/students',
  component: StudentListPage,
  beforeLoad: () => {
    if (user?.user_type !== 'teacher') {
      throw redirect({ to: '/' })
    }
  }
}
```

## 라우팅

| 경로 | 컴포넌트 | 접근 권한 |
|------|----------|-----------|
| `/students` | StudentListPage | 교사만 |
